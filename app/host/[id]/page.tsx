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
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Roster</h1>
          <p className="text-slate-600">See who&apos;s coming to {invite.title}</p>
        </header>

        {/* Joining Section */}
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <span className="text-green-600">✓</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Joining ({joins.length})</h2>
          </div>
          
          {joins.length ? (
            <div className="space-y-3">
              {joins.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-green-700">
                        {(r.guest_name || r.guest_email?.split('@')[0] || 'Guest').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {r.guest_name || r.guest_email?.split('@')[0] || 'Guest'}
                      </div>
                      {r.guest_email && (
                        <div className="text-sm text-slate-500">{r.guest_email}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-700">Confirmed</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-slate-500">No one has joined yet</p>
            </div>
          )}
        </div>

        {/* Maybe Section */}
        {maybes.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <span className="text-amber-600">?</span>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Maybe ({maybes.length})</h2>
            </div>
            
            <div className="space-y-3">
              {maybes.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-amber-700">
                        {(r.guest_name || r.guest_email?.split('@')[0] || 'Guest').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {r.guest_name || r.guest_email?.split('@')[0] || 'Guest'}
                      </div>
                      {r.guest_email && (
                        <div className="text-sm text-slate-500">{r.guest_email}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-amber-700">Tentative</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}