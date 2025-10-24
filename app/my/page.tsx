'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = { id: string; title: string; window_start: string; window_end: string; rsvp_count: number };

export default function MyInvitesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

    useEffect(() => {
    (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }
        
        setUser(user);
        
        // Load user's display name from their profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        } else {
          // Fallback to email username
          setDisplayName(user.email?.split('@')[0] || '');
        }

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

  async function saveDisplayName() {
    if (!user || !displayName.trim()) return;
    
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          display_name: displayName.trim(),
          email: user.email 
        });
      
      if (error) {
        alert('Failed to save display name: ' + error.message);
        return;
      }
      
      setEditingName(false);
    } catch (err) {
      alert('Failed to save display name');
      console.error(err);
    } finally {
      setSavingName(false);
    }
  }

  async function handleDelete(inviteId: string) {
    if (!confirm('Are you sure you want to delete this invite? This cannot be undone.')) return;
    
    setDeleting(inviteId);
    try {
      // Delete RSVPs first (foreign key constraint)
      await supabase.from('rsvps').delete().eq('invite_id', inviteId);
      
      // Delete the invite
      const { error } = await supabase
        .from('open_invites')
        .delete()
        .eq('id', inviteId);
      
      if (error) {
        alert('Failed to delete invite: ' + error.message);
        return;
      }
      
      // Remove from local state
      setRows(rows.filter(r => r.id !== inviteId));
    } catch (err) {
      alert('Failed to delete invite');
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="text-center">
        <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
        <p className="mt-4 text-slate-600">Loading your invites...</p>
      </div>
    </main>
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">My Invites</h1>
          <p className="text-slate-600">Manage your invites and see who&apos;s coming</p>
        </header>

        {/* User Profile Section */}
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">Your Display Name</h2>
              <p className="text-sm text-slate-600">This is how your name appears on invites</p>
              
              {editingName ? (
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    placeholder="Enter your display name"
                    maxLength={50}
                  />
                  <button
                    onClick={saveDisplayName}
                    disabled={savingName || !displayName.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                  >
                    {savingName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-lg font-medium text-slate-900">{displayName}</span>
                  <button
                    onClick={() => setEditingName(true)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 text-center shadow-lg backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">No invites yet</h2>
            <p className="mt-2 text-slate-600">Create your first invite to get started</p>
            <a 
              href="/create" 
              className="mt-4 inline-flex items-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl active:scale-95"
            >
              Create Invite
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map(r => {
              const expired = new Date(r.window_end).getTime() < Date.now();
              const startDate = new Date(r.window_start);
              const endDate = new Date(r.window_end);
              
              return (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-slate-900">{r.title}</h3>
                        {expired && (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                            Expired
                          </span>
                        )}
                      </div>
                      
                      <p className="mt-1 text-slate-600">
                        {startDate.toLocaleDateString()} • {startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      
                      <div className="mt-3 flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-600">
                          {r.rsvp_count} {r.rsvp_count === 1 ? 'RSVP' : 'RSVPs'}
                        </span>
                        
                        <div className="flex gap-2">
                          <a 
                            href={`/invite/${r.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            View invite
                          </a>
                          <span className="text-slate-300">•</span>
                          <a 
                            href={`/host/${r.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            View attendees
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting === r.id}
                      className="ml-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
                    >
                      {deleting === r.id ? (
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600"></div>
                          Deleting...
                        </div>
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}