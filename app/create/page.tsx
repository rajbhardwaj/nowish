'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CreateInvitePage() {
  const [title, setTitle] = useState('');
  const [circleName, setCircleName] = useState('Family');
  const [shareUrl, setShareUrl] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [checking, setChecking] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                window.location.href = '/login';
            } else { 
                setChecking(false);
            }
        });
    }, []);

if (checking) {
  return <main style={{ padding: 24 }}>Loading…</main>;
}

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Please log in first.');

    // 1) ensure a circle exists (owner_id + name)
    const { data: found } = await supabase
      .from('circles')
      .select('id')
      .eq('owner_id', user.id)
      .eq('name', circleName)
      .maybeSingle();

    let circleId = found?.id;
    if (!circleId) {
      const { data: inserted, error } = await supabase
        .from('circles')
        .insert({ owner_id: user.id, name: circleName })
        .select('id')
        .single();
      if (error) return alert(error.message);
      circleId = inserted.id;
    }

    // 2) create the invite (2-hour window from now, adjust later)
    const now = new Date();
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const { data: invite, error: invErr } = await supabase
      .from('open_invites')
      .insert({
        creator_id: user.id,
        title,
        window_start: now.toISOString(),
        window_end: end.toISOString(),
        location_text: null,
        chips: [],
        circle_ids: [circleId],
      })
      .select('id')
      .single();

    if (invErr) return alert(invErr.message);
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    setShareUrl(`${base}/invite/${invite.id}`);
  }

  return (
    <main style={{ padding: 32, maxWidth: 520, margin: '0 auto' }}>
      {userEmail && (
        <p style={{
            background: '#f1f1f1',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14
        }}>
            You are signed in as <strong>{userEmail}</strong>
            </p>
        )}  
      <h1>Create Invite</h1>
      <form onSubmit={handleCreate}>
        <label>What are you up to?</label>
        <input
          value={title}
          onChange={(e)=>setTitle(e.target.value)}
          placeholder="Park 3–5pm, kids welcome"
          style={{ width:'100%', padding:8, marginBottom:12 }}
          required
        />
        <label>Who can see this?</label>
        <select
          value={circleName}
          onChange={(e)=>setCircleName(e.target.value)}
          style={{ width:'100%', padding:8, marginBottom:12 }}
        >
          <option>Family</option>
          <option>Close Friends</option>
          <option>Coworkers</option>
        </select>
        <button type="submit">Create Invite</button>
      </form>

      {shareUrl && (
        <div style={{ marginTop: 16 }}>
            <p>Share this link:</p>
            <code>{shareUrl}</code>
            <div style={{ marginTop: 12 }}>
            <a href="/my">Go to My Invites →</a>
            </div>
        </div>
        )}
        <button
            onClick={() => {
                if (navigator.share && shareUrl) {
                navigator.share({ title: 'Nowish invite', url: shareUrl });
                } else if (shareUrl) {
                navigator.clipboard.writeText(shareUrl);
                alert('Link copied!');
                }
            }}
            >
            Share link
            </button>
    </main>
  );
}