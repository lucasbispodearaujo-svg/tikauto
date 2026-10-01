"use client";
import { useEffect, useState, type FormEvent } from 'react';
import { browserAuth, authenticatedFetch } from '@/lib/supabase-browser';
import Workspace from './workspace';
export default function EmailAccess() {
  const [ready, setReady] = useState(false), [checking, setChecking] = useState(true);
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const auth = browserAuth();
    async function checkSession() {
      try {
        const { data: { session } } = await auth.auth.getSession();
        if (!session) { if (active) setReady(false); return; }
        const result = await authenticatedFetch('/api/auth/check', { cache: 'no-store' });
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
      const { error } = await browserAuth().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      setPassword('');
      if (error) throw error;
      const result = await authenticatedFetch('/api/auth/check', { cache: 'no-store' });
      if (!result.ok) { await browserAuth().auth.signOut(); throw new Error('Acesso não autorizado.'); }
      setReady(true);
    } catch { setError('E-mail ou senha incorretos, ou acesso não autorizado. Confira os dados e tente novamente.'); }
    finally { setBusy(false); }
  }
  if (checking) return <main className="login"><div className="login-card" role="status">Verificando seu acesso…</div></main>;
  if (ready) return <Workspace name="Lucas" emailAuth />;
  return <main className="login"><div className="login-card"><div className="brand-mark">LX</div><h1>LX Gestão Imobiliária</h1><p>Entre com seu e-mail para administrar clientes, lotes e recebimentos.</p>
    <form onSubmit={signIn} className="email-login-form">
      <div className="field"><label htmlFor="login-email">E-mail do administrador</label><input id="login-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required disabled={busy}/></div>
      <div className="field"><label htmlFor="login-password">Senha</label><input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy}/></div>
      {error && <p role="alert" className="error">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
    </form><small>Acesso exclusivo do administrador</small></div></main>;
}
