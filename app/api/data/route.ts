import { env } from 'cloudflare:workers';
import { getAdmin } from '@/lib/admin-auth';
import { schedule,today } from '@/lib/finance';
import { z } from 'zod';
import { clientProfileSchema } from '@/lib/client-profile';
export const dynamic='force-dynamic';
function db(){if(!env.DB)throw new Error('Banco indisponível');return env.DB;}
async function dataIdentity(request:Request){
 if(!request.headers.has('authorization'))return null;
 const user=await getAdmin(request);if(!user)return null;
 // This dedicated single-admin database predates email authentication.
 // Resolve its existing namespace without modifying or duplicating saved records.
 const owners=await db().prepare('SELECT owner FROM clients UNION SELECT owner FROM plots UNION SELECT owner FROM contracts UNION SELECT owner FROM installments UNION SELECT owner FROM settings').all<{owner:string}>();
 if(owners.results.length>1)throw new Error('Banco com múltiplos proprietários: migração explícita necessária.');
 return {...user,userId:owners.results[0]?.owner??user.userId};
}
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T12:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===v},'Data inválida');
const cents=z.number().int().min(0).max(100000000000);
const client=z.object({id:z.string().optional(),name:z.string().trim().min(2).max(150),document:z.string().trim().min(3).max(30),phone:z.string().trim().max(40),email:z.union([z.literal(''),z.string().email()]),address:z.string().trim().max(500),details:clientProfileSchema.optional()});
const plot=z.object({id:z.string().optional(),block:z.string().trim().min(1).max(60),number:z.string().trim().min(1).max(60),area:z.string().trim().min(1).max(30).refine(v=>Number(v.replace(',','.'))>0,'Área inválida'),price:cents.refine(v=>v>0),status:z.enum(['Disponível','Reservado'])});
class UserError extends Error{}
async function state(owner:string){const b=db();const result=await b.batch([b.prepare('SELECT * FROM clients WHERE owner=? ORDER BY name').bind(owner),b.prepare('SELECT * FROM plots WHERE owner=? ORDER BY block,number').bind(owner),b.prepare('SELECT * FROM contracts WHERE owner=? ORDER BY created DESC').bind(owner),b.prepare('SELECT * FROM installments WHERE owner=? ORDER BY due,number').bind(owner),b.prepare('SELECT * FROM settings WHERE owner=?').bind(owner)]);return {clients:result[0].results,plots:result[1].results,contracts:result[2].results,installments:result[3].results,settings:result[4].results[0]??{company:'LX Gestão Imobiliária',document:'',phone:''}};}
export async function GET(request:Request){try{const user=await dataIdentity(request);if(!user)return Response.json({error:'Entre na sua conta para continuar.'},{status:401});return Response.json(await state(user.userId),{headers:{'Cache-Control':'no-store'}})}catch(e){console.error(e);return Response.json({error:'Não foi possível carregar os dados. Tente novamente.'},{status:503})}}
export async function POST(request:Request){try{
 const user=await dataIdentity(request);if(!user)return Response.json({error:'Entre na sua conta para continuar.'},{status:401});
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'Origem não autorizada.'},{status:403});
 const owner=user.userId;const b=db();const body=z.object({action:z.string(),data:z.unknown()}).parse(await request.json());
 if(body.action==='client'){
  const p=client.parse(body.data);if(p.id){const r=await b.prepare('UPDATE clients SET name=?,document=?,phone=?,email=?,address=?,details=COALESCE(?,details) WHERE id=? AND owner=?').bind(p.name,p.document,p.phone,p.email,p.address,p.details?JSON.stringify(p.details):null,p.id,owner).run();if(!r.meta.changes)throw new UserError('Cliente não encontrado.');}
  else await b.prepare('INSERT INTO clients(id,owner,name,document,phone,email,address,details) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,p.name,p.document,p.phone,p.email,p.address,JSON.stringify(p.details??{})).run();
 }else if(body.action==='plot'){
  const p=plot.parse(body.data);if(p.id){const result=await b.prepare("UPDATE plots SET block=?,number=?,area=?,price=?,status=? WHERE id=? AND owner=? AND NOT EXISTS(SELECT 1 FROM contracts WHERE plot_id=plots.id)").bind(p.block,p.number,p.area,p.price,p.status,p.id,owner).run();if(!result.meta.changes)throw new UserError('Lote não encontrado ou já vendido.');}
  else await b.prepare('INSERT INTO plots(id,owner,block,number,area,price,status) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,p.block,p.number,p.area,p.price,p.status).run();
 }else if(body.action==='sale'){
  const p=z.object({clientId:z.string(),plotId:z.string(),price:cents,downPayment:cents,count:z.number().int().min(1).max(600),annualRate:z.number().min(0).max(100),firstDue:date,downPaid:z.boolean(),downDate:date,method:z.enum(['Pix','Dinheiro','Transferência','Cartão','Boleto'])}).parse(body.data);
  if(p.downPaid&&p.downDate>today())throw new UserError('O pagamento não pode ter data futura.');
  const exists=await b.prepare("SELECT id FROM plots WHERE id=? AND owner=? AND status IN ('Disponível','Reservado') AND EXISTS(SELECT 1 FROM clients WHERE id=? AND owner=?)").bind(p.plotId,owner,p.clientId,owner).first();if(!exists)throw new UserError('Selecione um cliente e um lote disponível.');
  const id=crypto.randomUUID();const plan=schedule(p.price,p.downPayment,p.count,p.annualRate,p.firstDue);
  const statements=[b.prepare('INSERT INTO contracts(id,owner,client_id,plot_id,price,down_payment,count,annual_rate,first_due,created) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,owner,p.clientId,p.plotId,p.price,p.downPayment,p.count,String(p.annualRate),p.firstDue,today()),b.prepare("UPDATE plots SET status='Vendido' WHERE id=? AND owner=?").bind(p.plotId,owner)];
  if(p.downPayment>0)statements.push(b.prepare('INSERT INTO installments(id,owner,contract_id,number,due,amount,paid_on,method) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,id,0,p.downDate,p.downPayment,p.downPaid?p.downDate:null,p.downPaid?p.method:null));
  for(const item of plan)statements.push(b.prepare('INSERT INTO installments(id,owner,contract_id,number,due,amount) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,id,item.number,item.due,item.amount));
  await b.batch(statements);
 }else if(body.action==='pay'){
  const p=z.object({id:z.string(),paidOn:date,method:z.enum(['Pix','Dinheiro','Transferência','Cartão','Boleto'])}).parse(body.data);if(p.paidOn>today())throw new UserError('O pagamento não pode ter uma data futura.');
  const r=await b.prepare('UPDATE installments SET paid_on=?,method=? WHERE id=? AND owner=? AND paid_on IS NULL').bind(p.paidOn,p.method,p.id,owner).run();if(!r.meta.changes)throw new UserError('Esta parcela já foi paga ou não foi encontrada.');
 }else if(body.action==='settings'){
  const p=z.object({company:z.string().trim().min(2).max(150),document:z.string().max(30),phone:z.string().max(40)}).parse(body.data);await b.prepare('INSERT INTO settings(owner,company,document,phone) VALUES(?,?,?,?) ON CONFLICT(owner) DO UPDATE SET company=excluded.company,document=excluded.document,phone=excluded.phone').bind(owner,p.company,p.document,p.phone).run();
 }else throw new UserError('Ação inválida.');
 return Response.json(await state(owner),{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof z.ZodError)return Response.json({error:e.issues[0]?.message??'Revise os campos.'},{status:400});if(e instanceof UserError)return Response.json({error:e.message},{status:400});console.error(e);const msg=e instanceof Error?e.message:'';return Response.json({error:msg.includes('UNIQUE')?'Este documento, lote ou venda já está cadastrado.':'Não foi possível salvar. Confira os dados e tente novamente.'},{status:409});}}

