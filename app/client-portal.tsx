"use client";
import { useEffect, useState } from 'react';
import { authenticatedFetch, browserAuth } from '@/lib/supabase-browser';
import { money } from '@/lib/finance';
type Installment = {number:number;due:string;amount:number;paid_on:string|null;block:string;plot_number:string};
export default function ClientPortal() {
  const [data,setData] = useState<{pending?:boolean;name?:string;installments?:Installment[]}>();
  const [error,setError] = useState('');
  async function load() { setError(''); try {const response=await authenticatedFetch('/api/portal',{cache:'no-store'});if(!response.ok)throw new Error();setData(await response.json());}catch{setError('Não foi possível carregar os dados. Tente novamente.');} }
  useEffect(()=>{void load();},[]);
  return <main className="login"><div className="login-card"><div className="brand-mark">LX</div><h1>{data?.name ? `Olá, ${data.name}` : 'Área do cliente'}</h1>
    {error ? <><p role="alert">{error}</p><button onClick={()=>void load()}>Tentar novamente</button></> : !data ? <p role="status">Carregando…</p> : data.pending ? <p>Seu login está ativo. Aguarde o administrador liberar o acesso ao seu cadastro.</p> : <><p>Seus lotes e parcelas</p>{!data.installments?.length && <p>Nenhuma parcela cadastrada.</p>}{data.installments?.map((item,index)=><div key={index} className="portal-installment"><strong>Quadra {item.block} · Lote {item.plot_number}</strong><p>{item.number===0?'Entrada':`Parcela ${item.number}`} · {money(item.amount)}</p><small>Vencimento: {item.due.split('-').reverse().join('/')} · {item.paid_on?'Paga':'Pendente'}</small></div>)}</>}
    <button type="button" onClick={()=>void browserAuth().auth.signOut()}>Sair</button></div></main>;
}
