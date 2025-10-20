'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const base = process.env.NEXT_PUBLIC_SITE_URL!;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${base}/auth/callback` },
    });
    if (error) alert(error.message);
    else setSent(true);
  }

  return (
    <main style={{ padding: 32, maxWidth: 420, margin: '0 auto' }}>
      <h1>Nowish ⚡️</h1>
      {!sent ? (
        <form onSubmit={handleLogin}>
          <p>Enter your email to get a magic link:</p>
          <input
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width:'100%', padding:8 }}
            required
          />
          <button type="submit" style={{ marginTop: 12 }}>Send Magic Link</button>
        </form>
      ) : (
        <p>Check your inbox and click the link to sign in.</p>
      )}
    </main>
  );
}