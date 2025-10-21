'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CreateInvitePage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Check session once on load
  useEffect(() => {
    async function check() {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.push('/login');
        return;
      }
      setUserEmail(data.session.user.email ?? null);
      setSessionChecked(true);
    }
    check();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!details.trim()) return alert('Please describe what you’re doing');

    const { data, error } = await supabase
      .from('open_invites')
      .insert([{ title: details, host_email: userEmail }])
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setCreatedId(data.id);
  }

  if (!sessionChecked) {
    return <p style={{ padding: 20 }}>Checking session...</p>;
  }

  return (
    <main style={{ maxWidth: 500, margin: '2rem auto', padding: 20 }}>
      {userEmail && (
        <div
          style={{
            background: '#f4f4f4',
            padding: '0.5rem 1rem',
            borderRadius: 6,
            marginBottom: '1rem',
            textAlign: 'center',
            fontSize: '0.9rem',
          }}
        >
          You are signed in as <strong>{userEmail}</strong>
        </div>
      )}

      <h1>Create an Invite</h1>

      {!createdId ? (
        <form onSubmit={handleSubmit}>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="E.g. Park with kids, 3–5pm today"
            style={{ width: '100%', minHeight: 100, marginBottom: 12 }}
          />
          <button type="submit">Create Invite</button>
        </form>
      ) : (
        <div style={{ marginTop: 20 }}>
          <p>Invite created!</p>
          <p>
            <a href={`/invite/${createdId}`}>View your invite →</a>
          </p>
        </div>
      )}
    </main>
  );
}