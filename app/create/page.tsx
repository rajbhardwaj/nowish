'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type InviteRow = { id: string };

export default function CreateInvitePage() {
  const router = useRouter();

  const [sessionChecked, setSessionChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // form
  const [details, setDetails] = useState('');
  const [circleName, setCircleName] = useState<'Family' | 'Close Friends' | 'Coworkers'>('Family');

  // result
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // 1) Check session once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.replace('/login');
        return;
      }
      setUserEmail(data.session.user.email ?? null);
      setUserId(data.session.user.id);
      setSessionChecked(true);
    })();
  }, [router]);

  // 2) Ensure a circle exists for this user + name
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

    if (error || !inserted) {
      throw new Error(error?.message || 'Failed to create circle');
    }
    return inserted.id as string;
  }

  // 3) Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return alert('Not signed in.');
    const text = details.trim();
    if (!text) return alert('Please describe what you’re doing');

    // make sure the circle exists
    let circleId: string;
    try {
      circleId = await ensureCircle(userId, circleName);
    } catch (err) {
      console.error(err);
      alert('Could not ensure circle.');
      return;
    }

    // create invite
    const { data, error } = await supabase
      .from('open_invites')
      .insert({
        creator_id: userId,
        title: text,                 // keep it simple: store the whole line as title
        location_text: null,
        chips: [],
        circle_ids: [circleId],
        // you can add window_start/window_end later when you add parsing
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
          <label style={{ display: 'block', marginBottom: 8 }}>What are you doing?</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="E.g. Park with kids, 3–5pm today"
            style={{ width: '100%', minHeight: 100, marginBottom: 12 }}
          />

          <label style={{ display: 'block', marginBottom: 8 }}>Who’s this for?</label>
          <select
            value={circleName}
            onChange={(e) => setCircleName(e.target.value as typeof circleName)}
            style={{ width: '100%', marginBottom: 16 }}
          >
            <option value="Family">Family</option>
            <option value="Close Friends">Close Friends</option>
            <option value="Coworkers">Coworkers</option>
          </select>

          <button type="submit">Create Invite</button>
        </form>
      ) : (
        <div style={{ marginTop: 20 }}>
          <p>Invite created!</p>
          {shareUrl ? (
            <>
              <p>Share this link:</p>
              <code>{shareUrl}</code>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={`/invite/${createdId}`}>View invite →</a>
                <button
                  onClick={() => {
                    if (shareUrl) {
                      if (navigator.share) {
                        navigator.share({ title: 'Nowish invite', url: shareUrl });
                      } else {
                        navigator.clipboard.writeText(shareUrl);
                        alert('Link copied!');
                      }
                    }
                  }}
                >
                  Share
                </button>
                <a href="/my">See my invites →</a>
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