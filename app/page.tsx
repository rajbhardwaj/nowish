'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return <main style={{ padding: 24 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 560, margin: '2rem auto', padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>Nowish ⚡️</h1>

      {email ? (
        <div
          style={{
            background: '#f4f4f4',
            padding: '8px 12px',
            borderRadius: 6,
            margin: '8px 0 16px',
            textAlign: 'center',
            fontSize: 14,
          }}
        >
          You are signed in as <strong>{email}</strong>
        </div>
      ) : (
        <p style={{ color: '#666', marginTop: 4 }}>
          You’re not signed in. <a href="/login">Log in</a> to create or view invites.
        </p>
      )}

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <a
          href="/create"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '12px 16px',
            background: '#111',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Create an invite
        </a>

        <a
          href="/my"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '12px 16px',
            background: '#eee',
            color: '#111',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          See my invites
        </a>

        {!email && (
          <a
            href="/login"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '12px 16px',
              background: '#f8f8f8',
              color: '#111',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Log in
          </a>
        )}
      </div>
    </main>
  );
}