'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Invite = {
  id: string;
  title: string;
  window_start: string;
  window_end: string;
  location_text: string | null;
  chips: string[] | null;
};

export default function InvitePage() {
  const params = useParams<{ id: string }>();
  const inviteId = params.id as string;

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('open_invites')
        .select('id,title,window_start,window_end,location_text,chips')
        .eq('id', inviteId)
        .maybeSingle();

      if (error || !data) {
        setInvite(null);
      } else {
        const end = new Date(data.window_end).getTime();
        if (Date.now() > end) setExpired(true);
        setInvite(data as Invite);
      }
      setLoading(false);
    }
    if (inviteId) load();
  }, [inviteId]);

  async function rsvp(state: 'join' | 'maybe' | 'decline') {
    if (!invite) return;
    const { error } = await supabase.rpc('upsert_member_and_rsvp', {
        p_invite: invite.id,
        p_state: state,
        p_guest_name: name || null,
        p_guest_email: email || null,
    });
    if (error) return alert(error.message);
    alert(state === 'join' ? 'See you there!' : state === 'maybe' ? 'Maybe noted!' : 'All good — thanks!');
  }

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!invite) return <main style={{ padding: 24 }}>Invite not found.</main>;
  if (expired) return <main style={{ padding: 24 }}>This invite has expired.</main>;

  const start = new Date(invite.window_start).toLocaleString();
  const end = new Date(invite.window_end).toLocaleString();

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>{invite.title}</h1>
      <p>
        Window: <strong>{start}</strong> – <strong>{end}</strong>
      </p>
      {invite.location_text && <p>Where: {invite.location_text}</p>}
      {!!invite.chips?.length && (
        <p>{invite.chips.map((c) => <span key={c} style={{ marginRight: 8, fontSize: 12, padding: '2px 6px', background:'#eee', borderRadius: 6 }}>{c}</span>)}</p>
      )}

      <hr style={{ margin: '16px 0' }} />

      <p style={{ marginBottom: 8 }}>Tell the host who you are:</p>
      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 8 }}
      />
      <input
        type="email"
        placeholder="Email (optional, helps future invites)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 16 }}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => rsvp('join')}>Join</button>
        <button onClick={() => rsvp('maybe')}>Maybe</button>
        <button onClick={() => rsvp('decline')}>Can't make it</button>
      </div>
    </main>
  );
}