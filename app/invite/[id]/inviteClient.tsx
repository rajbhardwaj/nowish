'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function InviteClient({ inviteId }: { inviteId: string }) {
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendRSVP(status: 'join' | 'maybe' | 'decline') {
    if (busy) return;
    setBusy(true);
    try {
      setState(status);
      await supabase.from('rsvps').insert({
        invite_id: inviteId,
        state: status,
      });
    } catch (e) {
      alert('Could not record RSVP.');
      setState(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
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

      {state && (
        <p style={{ marginTop: 16, color: '#0070f3', fontWeight: 600, textAlign: 'center' }}>
          {state === 'join' ? 'Great — see you there!' : state === 'maybe' ? 'Got it — maybe!' : 'No worries, thanks for replying!'}
        </p>
      )}
    </>
  );
}