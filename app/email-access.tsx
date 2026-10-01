"use client";
import { useEffect, useState, type FormEvent } from 'react';
import { browserAuth, authenticatedFetch } from '@/lib/supabase-browser';
import Workspace from './workspace';
import ClientPortal from './client-portal';
export default function EmailAccess() {
  const [ready, setReady] = useState(false), [checking, setChecking] = useState(true);
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [creating,setCreating] = useState(false), [confirmation,setConfirmation] = useState(''), [notice,setNotice] = useState('');
  const [role,setRole] = useState<'admin'|'client'>('client');
  useEffect(() => {
    let active = true;
    const auth = browserAuth();
    async function checkSession() {
      try {
        const { data: { session } } = await auth.auth.getSession();
        if (!session) { if (active) setReady(false); return; }
        const result = await authenticatedFetch('/api/auth/check', { cache: 'no-store' });
        if(result.ok) {const data=await result.json() as {role?:string};if(active)setRole(data.role==='admin'?'admin':'client');}
        if (active) { setReady(result.ok); if (!result.ok) setError('Não foi possível autorizar este acesso. Confira seu e-mail.'); }
      } catch { if (active) { setReady(false); setError('Não foi possível validar o acesso. Confira sua conexão.'); } }
      finally { if (active) setChecking(false); }
    }
    void checkSession();
    const { data: { subscription } } = auth.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setReady(false); setPassword(''); }
      if (event === 'SIGNED_IN') setTimeout(() => { void checkSession(); }, 0);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if(creating) {
        if(password.length<8)throw new Error('short');
        if(password!==confirmation){setError('As senhas precisam ser iguais.');return;}
        const {error:signupError}=await browserAuth().auth.signUp({email:email.trim().toLowerCase(),password,options:{emailRedirectTo:window.location.origin+'/acesso'}});
        if(signupError){setError(signupError.status===429?'Muitas tentativas. Aguarde alguns minutos e tente novamente.':'Não foi possível criar a conta. Confira os dados e tente novamente.');return;}
        setPassword('');setConfirmation('');setCreating(false);setNotice('Cadastro enviado. Confira seu e-mail para confirmar a conta e depois entre.');return;
      }
      const { error } = await browserAuth().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      setPassword('');
      if (error) throw error;
      const result = await authenticatedFetch('/api/auth/check', { cache: 'no-store' });
      if (!result.ok) { await browserAuth().auth.signOut(); throw new Error('Acesso não autorizado.'); }
      const data=await result.json() as {role?:string};setRole(data.role==='admin'?'admin':'client');
      setReady(true);
    } catch { setError('E-mail ou senha incorretos, ou acesso não autorizado. Confira os dados e tente novamente.'); }
    finally { setBusy(false); }
  }
  if (checking) return <main className="login"><div className="login-card" role="status">Verificando seu acesso…</div></main>;
  if (ready) return role==='admin' ? <Workspace name="Lucas" emailAuth /> : <ClientPortal />;
  return <main className="login"><div className="login-card"><div className="brand-mark">LX</div><h1>LX Gestão Imobiliária</h1><p>{creating?'Crie sua conta para acessar a área do cliente.':'Entre com seu e-mail para acessar sua conta.'}</p>
    <form onSubmit={signIn} className="email-login-form">
      <div className="field"><label htmlFor="login-email">E-mail</label><input id="login-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required disabled={busy}/></div>
      <div className="field"><label htmlFor="login-password">Senha</label><input id="login-password" type="password" minLength={creating?8:undefined} autoComplete={creating?'new-password':'current-password'} value={password} onChange={e => setPassword(e.target.value)} required disabled={busy}/></div>
      {creating&&<><div className="field"><label htmlFor="login-confirmation">Confirmar senha</label><input id="login-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required disabled={busy}/></div><small>Use uma senha com pelo menos 8 caracteres.</small></>}
      {notice&&<p role="status">{notice}</p>}
      {error && <p role="alert" className="error">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? (creating?'Criando conta…':'Entrando…') : (creating?'Criar minha conta':'Entrar')}</button>
      <button type="button" className="create-account" disabled={busy} onClick={()=>{setCreating(!creating);setError('');setNotice('');setPassword('');setConfirmation('');}}>{creating?'Voltar para entrar':'Criar conta'}</button>
    </form><small>{creating?'Cadastre seu login de cliente.':'Acesso para administrador e clientes'}</small></div></main>;
}
