'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import Link from 'next/link';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  const [mobile, setMobile] = useState('');
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async user => {
      if (!user) {
        window.location.href = '/login';
        return;
      }
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/profile/mobile', { headers: { Authorization: `Bearer ${token}` } });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load your profile.');
        setMobile(String(body.mobileNumber || '').replace(/^\+91/, ''));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your profile.');
      } finally {
        setBusy(false);
      }
    });
    return unsubscribe;
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const user = firebaseAuth.currentUser;
      if (!user) throw new Error('Please sign in again.');
      const token = await user.getIdToken();
      const response = await fetch('/api/profile/mobile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: mobile })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to save your number.');
      setMobile(String(body.mobileNumber || '').replace(/^\+91/, ''));
      setMessage(mobile.trim() ? 'Mobile number saved.' : 'Mobile number removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your number.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-main" style={{ width: '100%', minHeight: '100vh' }}>
        <div className="auth-card" style={{ width: 'min(100%, 520px)' }}>
          <Link href="/dashboard" className="text-button"><ArrowLeft size={16} /> Back to workspace</Link>
          <div className="eyebrow" style={{ marginTop: 28 }}>ACCOUNT SETTINGS</div>
          <h2>Your profile</h2>
          <p className="muted">Manage the contact information associated with your account.</p>
          {busy ? <p className="muted">Loading profile…</p> : (
            <form onSubmit={save}>
              <label>Mobile number <span className="muted">(optional)</span>
                <div className="mobile-number-wrap">
                  <span>+91</span>
                  <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10}
                    value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number" />
                </div>
                <small className="mobile-hint">You can leave this blank or update it whenever you need.</small>
              </label>
              {error && <div className="form-error" role="alert">{error}</div>}
              {message && <div className="secure-note"><Check size={15} /> {message}</div>}
              <button className="primary-button full" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </form>
          )}
          <div className="secure-note"><ShieldCheck size={15} /> Your number is optional and is not verified by SMS.</div>
        </div>
      </section>
    </main>
  );
}

