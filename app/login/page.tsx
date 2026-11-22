'use client';

import { useState } from 'react';
import { sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
        setError('Please verify your email. A fresh verification email has been sent.');
        return;
      }

      const token = await credential.user.getIdToken();
      const registration = sessionStorage.getItem('workspace-registration');
      const profile = registration ? JSON.parse(registration) : {};

      const response = await fetch('/api/auth/provision', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'Your workspace access could not be confirmed.');
      }
      sessionStorage.removeItem('workspace-registration');
      window.location.href = '/dashboard';
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code)) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-aside">
        <div className="brand"><div className="brand-mark">T</div><span>Trinetray <b>Workspace</b></span></div>
        <div className="aside-copy">
          <div className="eyebrow"><Sparkles size={14} /> WORK, IN SYNC</div>
          <h1>Clarity for every task.<br /><em>Momentum for every team.</em></h1>
          <p>A calm, connected place to coordinate work, share updates and keep priorities moving.</p>
        </div>
        <div className="aside-footer"><ShieldCheck size={16} /> Private workspace access</div>
      </section>
      <section className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <div className="mobile-brand"><div className="brand-mark">T</div><b>Trinetray Workspace</b></div>
          <div className="eyebrow">WELCOME BACK</div>
          <h2>Sign in to your workspace</h2>
          <p className="muted">Use your approved work email to continue.</p>
          <label>Email address
            <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
          </label>
          <label>Password
            <div className="password-wrap">
              <input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
              <button className="icon-button" type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button full" disabled={busy}>
            {busy ? 'Signing in…' : <><span>Continue</span><ArrowRight size={17} /></>}
          </button>
          <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><Link href="/register">Create account</Link></div>
          <div className="secure-note"><ShieldCheck size={15} /> Email verification is required for access.</div>
        </form>
      </section>
    </main>
  );
}
