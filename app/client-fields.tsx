"use client";
import { useEffect, useRef, useState } from 'react';
import { authenticatedFetch } from '@/lib/supabase-browser';
import { normalizeCnpj, validCnpj } from '@/lib/cnpj';

type Fields = { name: string; document: string; phone: string; email: string; address: string };
type Company = Omit<Fields, 'document'>;
export default function ClientFields({ initial }: { initial?: Fields }) {
  const [values, setValues] = useState<Fields>(initial ?? { name: '', document: '', phone: '', email: '', address: '' });
  const [kind, setKind] = useState(normalizeCnpj(initial?.document ?? '').length === 14 ? 'pj' : 'pf');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const auto = useRef<Partial<Company>>({});
  const document = normalizeCnpj(values.document);
  useEffect(() => {
    if (kind !== 'pj' || document.length !== 14 || (document === normalizeCnpj(initial?.document ?? '') && attempt === 0)) { setMessage(''); return; }
    if (!validCnpj(document)) { setMessage('Confira o CNPJ. Você também pode preencher manualmente.'); return; }
    const controller = new AbortController();
    let active = true;
    setMessage('Consultando CNPJ…');
    const timer = setTimeout(async () => {
      try {
        const response = await authenticatedFetch(`/api/cnpj?document=${encodeURIComponent(document)}`, { signal: controller.signal });
        const result = await response.json() as Company & { error?: string };
        if (!active) return;
        if (!response.ok) throw new Error(result.error ?? 'Consulta indisponível.');
        setValues(current => {
          const next = { ...current };
          for (const key of ['name', 'phone', 'email', 'address'] as const) {
            if (!current[key].trim() && result[key]) { next[key] = result[key]; auto.current[key] = result[key]; }
          }
          return next;
        });
        setMessage('Consulta concluída. Revise os dados antes de salvar. Campos já preenchidos foram preservados.');
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : 'Consulta indisponível. Preencha manualmente.');
      }
    }, 600);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [document, kind, attempt, initial?.document]);
  const changeDocument = (value: string) => {
    const previousAuto = auto.current;
    if (normalizeCnpj(value) !== document) auto.current = {};
    setValues(current => {
      const next = { ...current, document: value.toUpperCase() };
      if (normalizeCnpj(value) !== normalizeCnpj(current.document)) {
        for (const key of ['name', 'phone', 'email', 'address'] as const) if (previousAuto[key] === current[key]) next[key] = '';
      }
      return next;
    });
  };
  return <div className="form-grid">
    <div className="field wide"><label htmlFor="person-kind">Tipo de cliente</label><select className="w-full min-h-11 rounded-lg border border-[#18334f] bg-[#050f1c] px-3 text-white" id="person-kind" value={kind} onChange={event => { setKind(event.target.value); changeDocument(''); }}><option value="pf">Pessoa física — CPF</option><option value="pj">Pessoa jurídica — CNPJ</option></select></div>
    <div className="field"><label htmlFor="document">{kind === 'pj' ? 'CNPJ' : 'CPF'}</label><input id="document" name="document" value={values.document} onChange={event => changeDocument(event.target.value)} required maxLength={18} aria-describedby={kind === 'pj' ? 'cnpj-status' : undefined}/></div>
    <div className="field"><label htmlFor="name">{kind === 'pj' ? 'Razão social' : 'Nome completo'}</label><input id="name" name="name" value={values.name} onChange={event => setValues(current => ({ ...current, name: event.target.value }))} required maxLength={150}/></div>
    {kind === 'pj' && <div className="wide"><p id="cnpj-status" role="status" aria-live="polite">{message || 'Informe o CNPJ completo para buscar os dados da empresa.'}</p><button type="button" className="secondary" disabled={!validCnpj(document) || message === 'Consultando CNPJ…'} onClick={() => setAttempt(current => current + 1)}>Consultar novamente</button></div>}
    {(['phone', 'email', 'address'] as const).map(key => <div key={key} className={`field ${key === 'address' ? 'wide' : ''}`}><label htmlFor={key}>{{ phone: 'Telefone', email: 'E-mail', address: 'Endereço' }[key]}</label><input id={key} name={key} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'} value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} maxLength={key === 'address' ? 500 : key === 'phone' ? 40 : 254}/></div>)}
  </div>;
}
