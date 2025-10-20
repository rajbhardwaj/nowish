'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = { id: string; title: string; window_start: string; window_end: string; rsvp_count: number };

export default function MyInvitesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
    (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }

        // Get your invites
        const { data: invites, error } = await supabase
        .from('open_invites')
        .select('id,title,window_start,window_end')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

        if (error || !invites) { setRows([]); setLoading(false); return; }

        const ids = invites.map(i => i.id);
        type RSVPRow = { invite_id: string };

        // Fetch RSVPs for those invites
        const { data: rsvps } = await supabase
        .from('rsvps')
        .select('invite_id')
        .in('invite_id', ids) as { data: RSVPRow[] | null };

        const countMap = new Map<string, number>();
        (rsvps || []).forEach(r => {
        countMap.set(r.invite_id, (countMap.get(r.invite_id) || 0) + 1);
        });

        setRows(invites.map(inv => ({
        ...inv,
        rsvp_count: countMap.get(inv.id) || 0,
        })) as Row[]);
        setLoading(false);
    })();
    }, []);

  if (loading) return <main style={{padding:24}}>Loading…</main>;

  return (
    <main style={{ padding: 24 }}>
      <h1>My Invites</h1>
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {rows.map(r => {
          const expired = new Date(r.window_end).getTime() < Date.now();
          return (
            <li key={r.id} style={{ marginBottom: 12, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <strong>{r.title}</strong>
                <span>{r.rsvp_count} RSVP{r.rsvp_count===1?'':'s'}</span>
              </div>
              <div style={{ fontSize: 12, color:'#666' }}>
                {new Date(r.window_start).toLocaleString()} — {new Date(r.window_end).toLocaleString()} {expired ? '· expired' : ''}
              </div>
              <div style={{ marginTop: 8 }}>
                <a href={`/invite/${r.id}`}>View invite</a> · <a href={`/host/${r.id}`}>View roster</a>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}