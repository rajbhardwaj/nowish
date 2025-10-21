'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function InviteClient({ inviteId }: { inviteId: string }) {
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? null;
      setAuthedEmail(email);
    })();
  }, []);

  async function sendRSVP(status: 'join' | 'maybe' | 'decline') {
    if (busy) return;

    // === Guest path ===
    if (!authedEmail) {
      const email = guestEmail.trim();
      const name = guestName.trim();

      if (!email) {
        alert('Please enter your email so the host knows who you are.');
        return;
      }

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        alert('Please enter a valid email.');
        return;
      }

      setBusy(true);
      try {
        setState(status);
        const { error } = await supabase.from('rsvps').insert({
          invite_id: inviteId,
          state: status,
          guest_email: email,
          guest_name: name || null,
          responded_at: new Date().toISOString(),
        });
        if (error) {
          console.error(error);
          alert(`Could not record RSVP: ${error.message}`); // 👈 real reason shown
          setState(null);
        }
      } catch (err) {
        console.error(err);
        alert(`Unexpected error: ${(err as Error).message}`);
        setState(null);
      } finally {
        setBusy(false);
      }
      return;
    }

    // === Authenticated path ===
    setBusy(true);
    try {
      setState(status);
      const { error } = await supabase.from('rsvps').insert({
        invite_id: inviteId,
        state: status,
        responded_at: new Date().toISOString(),
      });
      if (error) {
        console.error(error);
        alert(`Could not record RSVP: ${error.message}`);
        setState(null);
      }
    } catch (err) {
      console.error(err);
      alert(`Unexpected error: ${(err as Error).message}`);
      setState(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 24, textAlign: 'center' }}>
      {/* === Guest identity form === */}
      {!authedEmail && (
        <section
          style={{
            marginBottom: 20,
            padding: 12,
            border: '1px solid #eee',
            borderRadius: 10,
            background: '#fafafa',
            maxWidth: 400,
            marginInline: 'auto',
          }}
        >
          <p style={{ margin: '0 0 8px' }}>Let the host know who you are:</p>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
              }}
            />
            <input
              type="email"
              placeholder="Your email (required)"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
              }}
            />
          </div>
        </section>
      )}

      {/* === RSVP buttons === */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => sendRSVP('join')}
          disabled={busy}
          style={{
            background: '#111',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 8,
            fontWeight: 600,
            minWidth: 110,
          }}
        >
          I’m in
        </button>

        <button
          onClick={() => sendRSVP('maybe')}
          disabled={busy}
          style={{
            background: '#f4f4f4',
            border: '1px solid #ccc',
            padding: '10px 18px',
            borderRadius: 8,
            fontWeight: 600,
            minWidth: 110,
          }}
        >
          Maybe
        </button>

        <button
          onClick={() => sendRSVP('decline')}
          disabled={busy}
          style={{
            background: 'transparent',
            border: '1px solid #ccc',
            padding: '10px 18px',
            borderRadius: 8,
            color: '#777',
            fontWeight: 600,
            minWidth: 110,
          }}
        >
          Can’t make it
        </button>
      </div>

      {/* === Confirmation message === */}
      {state && (
        <p
          style={{
            marginTop: 16,
            color: '#0070f3',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {state === 'join'
            ? 'Great — see you there!'
            : state === 'maybe'
            ? 'Got it — maybe!'
            : 'No worries, thanks for replying!'}
        </p>
      )}
    </div>
  );
}