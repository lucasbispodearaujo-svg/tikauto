export const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function addMonths(date:string,offset:number){const [y,m,d]=date.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1+offset,1));const last=new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,0)).getUTCDate();return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;}
export function schedule(price:number,down:number,count:number,rate:number,first:string){
 if(!Number.isSafeInteger(price)||price<=0||!Number.isSafeInteger(down)||down<0||down>=price||!Number.isInteger(count)||count<1||count>600||!Number.isFinite(rate)||rate<0||rate>100)throw new Error('Revise os valores: entrada menor que o lote, 1 a 600 parcelas e correção entre 0 e 100%.');
 const base=(price-down)/count;
 if(base<1)throw new Error('O valor financiado deve permitir pelo menos um centavo por parcela.');
 const items=Array.from({length:count},(_,i)=>({number:i+1,due:addMonths(first,i),amount:Math.round(base*(1+rate/100)**Math.floor(i/12))}));
 if(items.some(p=>!Number.isSafeInteger(p.amount)||p.amount<1))throw new Error('Os valores das parcelas excedem os limites permitidos.');
 for(let start=0;start<count;start+=12){const end=Math.min(start+12,count);const target=Math.round(base*(1+rate/100)**Math.floor(start/12)*(end-start));const subtotal=items.slice(start,end).reduce((s,p)=>s+p.amount,0);items[end-1].amount+=target-subtotal;}
 if(rate===0)items[count-1].amount+=(price-down)-items.reduce((s,p)=>s+p.amount,0);
 if(items.some(p=>p.amount<1)||!Number.isSafeInteger(items.reduce((s,p)=>s+p.amount,0)+down))throw new Error('Os valores das parcelas excedem os limites permitidos.');
 return items;
}
