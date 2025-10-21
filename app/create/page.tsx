'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type InviteRow = { id: string };

export default function CreateInvitePage() {
  const router = useRouter();

  const [sessionChecked, setSessionChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [circleName, setCircleName] = useState('Family');

  const [createdId, setCreatedId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // 1) Check session once on load
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.replace('/login');
        return;
      }
      setUserEmail(data.session.user.email ?? null); // <- fix: email can be undefined
      setUserId(data.session.user.id);
      setSessionChecked(true);
    })();
  }, [router]);

  // Helper: ensure a circle exists for this user + name
  async function ensureCircle(ownerId: string, name: string): Promise<string> {
    const { data: existing } = await supabase
      .from('circles')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('name', name)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: inserted, error } = await supabase
      .from('circles')
      .insert({ owner_id: ownerId, name })
      .select('id')
      .single();

    if (error || !inserted) throw new Error(error?.message || 'Failed to create circle');
    return inserted.id as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return alert('Not signed in.');
    if (!title) return alert('Please add a title.');
    if (!startTime || !endTime) return alert('Please set a start and end time.');

    // 2) Ensure a circle (default "Family")
    let circleId: string;
    try {
      circleId = await ensureCircle(userId, circleName);
    } catch (err: unknown) {
      console.error(err);
      alert('Could not ensure circle.');
      return;
    }

    // 3) Insert the invite (must include creator_id and circle_ids)
    const { data, error } = await supabase
      .from('open_invites')
      .insert({
        creator_id: userId,
        title,
        window_start: startTime,
        window_end: endTime,
        location_text: null,
        chips: [],
        circle_ids: [circleId],
      })
      .select('id')
      .single<InviteRow>();

    if (error || !data) {
      alert(error?.message || 'Failed to create invite');
      return;
    }

    setCreatedId(data.id);
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    setShareUrl(`${base}/invite/${data.id}`);
  }

  if (!sessionChecked) {
    return <main style={{ padding: 20 }}>Checking session…</main>;
  }

  return (
    <main style={{ maxWidth: 560, margin: '2rem auto', padding: 20 }}>
      {userEmail && (
        <div
          style={{
            background: '#f4f4f4',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 16,
            textAlign: 'center',
            fontSize: 14,
          }}
        >
          You are signed in as <strong>{userEmail}</strong>
        </div>
      )}

      <h1>Create an Invite</h1>

      {!createdId ? (
        <form onSubmit={handleSubmit}>
          <label>
            Title<br />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
              placeholder="Park with the kids"
              required
            />
          </label>

          <label>
            Start time<br />
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
              required
            />
          </label>

          <label>
            End time<br />
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
              required
            />
          </label>

          <label>
            Circle<br />
            <select
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              style={{ width: '100%', marginBottom: 16 }}
            >
              <option>Family</option>
              <option>Close Friends</option>
              <option>Coworkers</option>
            </select>
          </label>

          <button type="submit">Create Invite</button>
        </form>
      ) : (
        <div style={{ marginTop: 20 }}>
          <p>Invite created!</p>
          {shareUrl ? (
            <>
              <p>Share this link:</p>
              <code>{shareUrl}</code>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <a href={`/invite/${createdId}`}>View invite →</a>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: 'Nowish invite', url: shareUrl });
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      alert('Link copied!');
                    }
                  }}
                >
                  Share
                </button>
                <a href="/my">Go to My Invites →</a>
              </div>
            </>
          ) : (
            <p>
              <a href={`/invite/${createdId}`}>View your invite →</a>
            </p>
          )}
        </div>
      )}
    </main>
  );
}