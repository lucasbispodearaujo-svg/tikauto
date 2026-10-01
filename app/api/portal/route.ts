import { env } from 'cloudflare:workers';
import { getVerifiedUser } from '@/lib/admin-auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const user = await getVerifiedUser(request);
    if (!env.DB) throw new Error('Banco indisponível');
    if (!user) return Response.json({ error: 'Entre na sua conta.' }, { status: 401, headers });
    const matches = await env.DB.prepare("SELECT id,owner,name FROM clients WHERE lower(trim(email))=? AND json_valid(details) AND json_extract(details,'$.portalEnabled')=1 LIMIT 2").bind(user.email!.trim().toLowerCase()).all<{id:string;owner:string;name:string}>();
    if (matches.results.length !== 1) return Response.json({ pending: true }, { headers });
    const client = matches.results[0];
    const installments = await env.DB.prepare('SELECT i.number,i.due,i.amount,i.paid_on,i.method,p.block,p.number AS plot_number FROM installments i JOIN contracts c ON c.id=i.contract_id AND c.owner=i.owner JOIN plots p ON p.id=c.plot_id AND p.owner=c.owner WHERE c.client_id=? AND c.owner=? ORDER BY i.due,i.number').bind(client.id,client.owner).all();
    return Response.json({ name: client.name, installments: installments.results }, { headers });
  } catch { return Response.json({ error: 'Não foi possível carregar seu acesso. Tente novamente.' }, { status: 503, headers }); }
}
