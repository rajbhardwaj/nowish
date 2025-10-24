'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Invite = { id:string; title:string; creator_id:string };
type RSVP = { state:'join'|'maybe'|'decline'; guest_name:string|null; guest_email:string|null };

export default function HostRosterPage() {
  const { id } = useParams<{id:string}>();
  const [invite, setInvite] = useState<Invite|null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href='/login'; return; }

      const { data: inv, error } = await supabase
        .from('open_invites')
        .select('id,title,creator_id')
        .eq('id', id).maybeSingle();
      if (error || !inv) { setLoading(false); return; }

      // guard: only the creator can view roster
      if (inv.creator_id !== user.id) { alert('Not your invite'); window.location.href='/my'; return; }
      setInvite(inv as Invite);

      const { data: rs } = await supabase
        .from('rsvps')
        .select('state, guest_name, guest_email')
        .eq('invite_id', id);
      setRsvps((rs || []) as RSVP[]);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <main style={{padding:24}}>Loading…</main>;
  if (!invite) return <main style={{padding:24}}>Invite not found.</main>;

  const joins = rsvps.filter(r=>r.state==='join');
  const maybes = rsvps.filter(r=>r.state==='maybe');

  return (
    <main style={{ padding:24, maxWidth:520, margin:'0 auto' }}>
      <h1>Roster — {invite.title}</h1>
      <section style={{marginTop:12}}>
        <h3>Joining ({joins.length})</h3>
        {joins.length ? (
          <ul>{joins.map((r,i)=> <li key={i}>{r.guest_name || r.guest_email?.split('@')[0] || 'Guest'} {r.guest_email ? `· ${r.guest_email}`:''}</li>)}</ul>
        ) : <p>No one yet.</p>}
      </section>
      <section>
        <h3>Maybe ({maybes.length})</h3>
        {maybes.length ? (
          <ul>{maybes.map((r,i)=> <li key={i}>{r.guest_name || r.guest_email?.split('@')[0] || 'Guest'} {r.guest_email ? `· ${r.guest_email}`:''}</li>)}</ul>
        ) : <p>No maybes yet.</p>}
      </section>
    </main>
  );
}