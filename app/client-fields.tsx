"use client";
import { useEffect, useRef, useState } from 'react';
import { authenticatedFetch } from '@/lib/supabase-browser';
import { normalizeCnpj, validCnpj } from '@/lib/cnpj';
import { readClientProfile, type ClientProfile } from '@/lib/client-profile';
import { today, money } from '@/lib/finance';

type Fields = { id?: string; name: string; document: string; phone: string; email: string; address: string; details?: string };
type Company = Pick<Fields,'name'|'phone'|'email'|'address'>;
const sections = ['Endereço','Documentos','Contatos','Referências','Observações','Dados fiscais','Financeiro','Histórico'] as const;
type Section = typeof sections[number];
type ProfileTextKey = Exclude<keyof ClientProfile,'finalConsumer'|'portalEnabled'>;
function ProfileInput({field,label,profile,change,type='text',max=150}:{field:ProfileTextKey;label:string;profile:ClientProfile;change:(key:ProfileTextKey,value:string)=>void;type?:string;max?:number}) {
  return <div className="field"><label htmlFor={`client-${field}`}>{label}</label><input id={`client-${field}`} type={type} value={profile[field]} maxLength={max} min={type==='number'?'0':undefined} step={type==='number'?'0.01':undefined} onChange={event=>change(field,event.target.value)}/></div>;
}
export default function ClientFields({ initial, history = {sales:0,paid:0,pending:0} }: { initial?: Fields; history?: {sales:number;paid:number;pending:number} }) {
  const [values, setValues] = useState<Fields>(initial ?? { name: '', document: '', phone: '', email: '', address: '' });
  const [profile,setProfile] = useState(() => ({...readClientProfile(initial?.details),registrationDate:readClientProfile(initial?.details).registrationDate || (initial ? '' : today())}));
  const [kind, setKind] = useState(initial?.details?.includes('"personKind"') ? readClientProfile(initial.details).personKind : normalizeCnpj(initial?.document ?? '').length === 14 ? 'pj' : 'pf');
  const [section,setSection] = useState<Section>('Endereço');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const auto = useRef<Partial<Company>>({});
  const autoProfile = useRef<Partial<ClientProfile>>({});
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
        const result = await response.json() as Company & { profile?: Partial<ClientProfile>; error?: string };
        if (!active) return;
        if (!response.ok) throw new Error(result.error ?? 'Consulta indisponível.');
        setValues(current => {
          const next = { ...current };
          for (const key of ['name', 'phone', 'email', 'address'] as const) {
            if (!current[key].trim() && result[key]) { next[key] = result[key]; auto.current[key] = result[key]; }
          }
          return next;
        });
        setProfile(current => {
          const next = {...current};
          for (const key of ['tradeName','birthDate','cep','street','number','complement','neighborhood','city','uf','country'] as const) {
            const value = result.profile?.[key];
            if (!current[key].trim() && value) { next[key] = value; autoProfile.current[key] = value; }
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
    if (normalizeCnpj(value) !== document) {
      const previousProfile = autoProfile.current;
      autoProfile.current = {};
      setProfile(current => {
        const next = {...current};
        for (const key of ['tradeName','birthDate','cep','street','number','complement','neighborhood','city','uf','country'] as const) if (previousProfile[key] === current[key]) next[key]='';
        return next;
      });
    }
    setValues(current => {
      const next = { ...current, document: value.toUpperCase() };
      if (normalizeCnpj(value) !== normalizeCnpj(current.document)) {
        for (const key of ['name', 'phone', 'email', 'address'] as const) if (previousAuto[key] === current[key]) next[key] = '';
      }
      return next;
    });
  };
  const change = (key:ProfileTextKey,value:string) => setProfile(current => ({...current,[key]:value}));
  const fullAddress = profile.street.trim() ? [profile.street,profile.number,profile.complement,profile.neighborhood,[profile.city,profile.uf].filter(Boolean).join(' / '),profile.cep,profile.country].filter(Boolean).join(', ').slice(0,500) : values.address;
  const field = (key:ProfileTextKey,label:string,type='text',max=150) => <ProfileInput key={key} field={key} label={label} type={type} max={max} profile={profile} change={change}/>;
  return <div className="client-record">
    <input type="hidden" name="clientDetails" value={JSON.stringify({...profile,personKind:kind})}/>
    <input type="hidden" name="address" value={fullAddress}/>
    <div className="client-record-heading"><div><h3>Ficha do cliente</h3><p>Dados gerais e informações complementares</p></div><span className="badge">{initial?.id ? `Código ${initial.id.slice(0,8).toUpperCase()}` : 'Novo cadastro'}</span></div>
    <div className="form-grid client-general">
    <div className="field"><label htmlFor="person-kind">Tipo de cliente</label><select className="client-select" id="person-kind" value={kind} onChange={event => { setKind(event.target.value as 'pf'|'pj'); changeDocument(''); }}><option value="pf">Pessoa física — CPF</option><option value="pj">Pessoa jurídica — CNPJ</option></select></div>
    {field('registrationDate','Data do cadastro','date')}
    <div className="field"><label htmlFor="document">{kind === 'pj' ? 'CNPJ' : 'CPF'}</label><input id="document" name="document" value={values.document} onChange={event => changeDocument(event.target.value)} required maxLength={18} aria-describedby={kind === 'pj' ? 'cnpj-status' : undefined}/></div>
    <div className="field"><label htmlFor="name">{kind === 'pj' ? 'Razão social' : 'Nome completo'}</label><input id="name" name="name" value={values.name} onChange={event => setValues(current => ({ ...current, name: event.target.value }))} required maxLength={150}/></div>
    {field('tradeName',kind==='pj'?'Nome fantasia':'Apelido')}
    {field('birthDate',kind==='pj'?'Data de abertura':'Data de nascimento','date')}
    {kind === 'pj' && <div className="wide"><p id="cnpj-status" role="status" aria-live="polite">{message || 'Informe o CNPJ completo para buscar os dados da empresa.'}</p><button type="button" className="secondary" disabled={!validCnpj(document) || message === 'Consultando CNPJ…'} onClick={() => setAttempt(current => current + 1)}>Consultar novamente</button></div>}
    </div>
    <div className="client-tabs" role="tablist" aria-label="Informações do cliente">{sections.map(item=><button key={item} id={`client-tab-${item}`} type="button" role="tab" aria-selected={section===item} aria-controls={`client-panel-${item}`} tabIndex={section===item?0:-1} onClick={()=>setSection(item)} onKeyDown={event=>{const index=sections.indexOf(item);let next:Section|undefined;if(event.key==='ArrowRight')next=sections[(index+1)%sections.length];if(event.key==='ArrowLeft')next=sections[(index+sections.length-1)%sections.length];if(event.key==='Home')next=sections[0];if(event.key==='End')next=sections[sections.length-1];if(next){event.preventDefault();setSection(next);event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[sections.indexOf(next)]?.focus();}}}>{item}</button>)}</div>
    {sections.map(item=><section key={item} hidden={section!==item} role="tabpanel" id={`client-panel-${item}`} aria-labelledby={`client-tab-${item}`} className="client-tab-panel"><h3>{item}</h3>
      {item==='Endereço'&&<><div className="form-grid">{field('cep','CEP','text',12)}{field('street','Rua / avenida','text',200)}{field('number','Número','text',30)}{field('complement','Complemento','text',100)}{field('neighborhood','Bairro','text',100)}{field('city','Cidade','text',100)}{field('uf','Estado (UF)','text',2)}{field('country','País','text',60)}<div className="wide">{field('referencePoint','Ponto de referência','text',200)}</div></div><div className="field form-note"><label htmlFor="client-address-full">Endereço completo</label><input id="client-address-full" value={fullAddress} readOnly={!!profile.street.trim()} maxLength={500} onChange={event=>setValues(current=>({...current,address:event.target.value}))}/><small>{profile.street.trim()?'Montado a partir dos campos acima.':'Você pode manter o endereço já salvo ou preencher os campos acima.'}</small></div></>}
      {item==='Documentos'&&<div className="form-grid">{field('rg',kind==='pj'?'Documento complementar':'RG','text',30)}{field('rgIssuer','Órgão emissor','text',30)}{kind==='pf'&&<>{field('sex','Sexo','text',30)}{field('civilStatus','Estado civil','text',40)}</>}{field('nationality','Nacionalidade','text',60)}{field('region','Região','text',100)}</div>}
      {item==='Contatos'&&<div className="form-grid">{(['phone','email'] as const).map(key=><div key={key} className="field"><label htmlFor={key}>{key==='phone'?'Telefone principal':'E-mail'}</label><input id={key} name={key} type={key==='email'?'email':'tel'} value={values[key]} onInvalid={()=>setSection('Contatos')} onChange={event=>setValues(current=>({...current,[key]:event.target.value}))} maxLength={key==='phone'?40:254}/></div>)}{field('secondaryPhone','Telefone adicional','tel',40)}{field('contactName','Pessoa de contato')}{field('website','Site','text',250)}{field('salesperson','Vendedor responsável')}<label className="client-checkbox"><input type="checkbox" checked={profile.portalEnabled} onChange={event=>setProfile(current=>({...current,portalEnabled:event.target.checked}))}/>Liberar acesso deste cliente pelo e-mail acima</label><small>O cliente deve criar sua conta com esse mesmo e-mail e confirmá-lo. Ele verá somente suas parcelas.</small></div>}
      {item==='Referências'&&<div className="form-grid">{field('referenceName','Nome da referência')}{field('referencePhone','Telefone da referência','tel',40)}</div>}
      {item==='Observações'&&<div className="field"><label htmlFor="client-notes">Observações sobre o cliente</label><textarea id="client-notes" rows={6} maxLength={3000} value={profile.notes} onChange={event=>change('notes',event.target.value)}/></div>}
      {item==='Dados fiscais'&&<div className="form-grid">{field('stateRegistration','Inscrição estadual','text',30)}{field('municipalRegistration','Inscrição municipal','text',30)}{field('suframa','Inscrição SUFRAMA','text',30)}<div className="field"><label htmlFor="client-tax-regime">Regime tributário</label><select id="client-tax-regime" className="client-select" value={profile.taxRegime} onChange={event=>change('taxRegime',event.target.value)}><option value="">Não informado</option><option value="mei">MEI</option><option value="simples">Simples Nacional</option><option value="simples-excesso">Simples Nacional — excesso de sublimite</option><option value="presumido">Lucro Presumido</option><option value="real">Lucro Real</option></select></div><div className="field"><label htmlFor="client-tax-status">Indicador de inscrição estadual</label><select id="client-tax-status" className="client-select" value={profile.taxStatus} onChange={event=>change('taxStatus',event.target.value)}><option value="">Não informado</option><option value="contributor">Contribuinte</option><option value="exempt">Isento</option><option value="non-contributor">Não contribuinte</option></select></div><label className="client-checkbox"><input type="checkbox" checked={profile.finalConsumer} onChange={event=>setProfile(current=>({...current,finalConsumer:event.target.checked}))}/>Consumidor final</label><div className="field wide"><label htmlFor="client-fiscal-notes">Observações fiscais</label><textarea id="client-fiscal-notes" rows={3} maxLength={1500} value={profile.fiscalNotes} onChange={event=>change('fiscalNotes',event.target.value)}/><small>Informações cadastrais para uso fiscal. A emissão de notas depende da configuração do emissor.</small></div></div>}
      {item==='Financeiro'&&<div className="form-grid">{field('creditLimit','Limite de crédito (R$)','number',20)}<div className="field"><label htmlFor="client-payment-method">Forma de pagamento preferida</label><select id="client-payment-method" className="client-select" value={profile.paymentMethod} onChange={event=>change('paymentMethod',event.target.value)}>{['','Pix','Dinheiro','Transferência','Cartão','Boleto'].map(method=><option key={method} value={method}>{method||'Não informada'}</option>)}</select></div><div className="wide">{field('paymentTerms','Condição de pagamento')}</div><p className="wide form-note">Preferências do cadastro. As condições de cada venda continuam sendo definidas no contrato.</p></div>}
      {item==='Histórico'&&<><div className="client-history"><article><span>Vendas / contratos</span><strong>{history.sales}</strong></article><article><span>Recebido</span><strong>{money(history.paid)}</strong></article><article><span>A receber</span><strong>{money(history.pending)}</strong></article></div><p className="form-note">Valores das vendas e parcelas já registradas para este cliente, incluindo entradas. Veja os detalhes nas telas Vendas / Contratos e Parcelas.</p></>}
    </section>)}
  </div>;
}
