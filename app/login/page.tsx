'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      const result = await supabase.auth.signInWithOtp({
        email,
        options: { 
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/create` 
        },
      });

      if (result.error) {
        alert(result.error.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      console.error(err);
      alert('Could not send magic link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 420, margin: '0 auto' }}>
      <h1>Nowish ⚡️</h1>
      {!sent ? (
        <form onSubmit={handleLogin}>
          <p>Enter your email to get a magic link.</p>
          <input
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width:'100%', padding:8 }}
            required
          />
          <button type="submit" style={{ marginTop: 12 }} disabled={busy}>
            {busy ? 'Sending…' : 'Send Magic Link'}
          </button>
        </form>
      ) : (
        <p>Check your inbox! Click the link to sign in.</p>
      )}
    </main>
  );
}