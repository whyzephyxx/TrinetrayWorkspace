'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function AdminGate() {
  const [user, setUser] = useState<any>(null), [stage, setStage] = useState<'phrase' | 'pin'>('phrase'), [value, setValue] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (new URLSearchParams(location.search).get('step') === 'pin') setStage('pin'); return onAuthStateChanged(firebaseAuth, u => { if (!u) location.href = '/login'; else setUser(u); }); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const token = await user.getIdToken(); const response = await fetch('/api/admin/access', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ stage, value }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Verification failed.'); setValue(''); if (stage === 'phrase') setStage('pin'); else location.href = data.redirect; }
    catch (err) { setError(err instanceof Error ? err.message : 'Verification failed.'); } finally { setBusy(false); }
  }
  return <main className="auth-shell"><aside className="auth-aside"><div className="brand"><span className="brand-mark">T</span><b>Trinetray Workspace</b></div><div className="aside-copy"><div className="eyebrow">RESTRICTED ACCESS</div><h1>Administrator <em>verification</em></h1><p>This area is restricted to the designated workspace administrator.</p></div><div className="aside-footer">Secure workspace access</div></aside><section className="auth-main"><form className="auth-card" onSubmit={submit}><div className="eyebrow"><ShieldCheck size={14} /> ADMINISTRATOR ACCESS</div><h2>{stage === 'phrase' ? 'Enter access phrase' : 'Confirm your PIN'}</h2><p className="muted">Verify your administrator access to continue.</p><label>{stage === 'phrase' ? 'Access phrase' : '6-digit PIN'}<input autoFocus type="password" value={value} onChange={e => setValue(e.target.value)} maxLength={stage === 'phrase' ? 80 : 6} required /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button full" disabled={busy}>{busy ? 'Verifying…' : 'Continue'} <ArrowRight size={16} /></button><a className="back-link" href="/dashboard">Return to workspace</a></form></section></main>;
}
