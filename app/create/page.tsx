'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type InviteRow = { id: string };
type CircleName = 'Family' | 'Close Friends' | 'Coworkers';

function parseWindow(input: string): { start: Date; end: Date } {
  const now = new Date();
  const base = new Date(now);

  if (/\btomorrow\b/i.test(input)) base.setDate(base.getDate() + 1);

  const m = input.match(
    /(\d{1,2})(?::(\d{2}))?\s*(a|p|am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(a|p|am|pm)?/i
  );

  const clampEndAfter = (s: Date, e: Date) => (e > s ? e : new Date(s.getTime() + 60 * 60 * 1000));

  if (m) {
    const [ , h1, min1, mer1, h2, min2, mer2 ] = m;
    const start = new Date(base);
    const end = new Date(base);

    const to24 = (h: number, mer?: string): number => {
      if (!mer) return h;
      const mm = mer.toLowerCase();
      if (mm === 'p' || mm === 'pm') return h % 12 + 12;
      if (mm === 'a' || mm === 'am') return h % 12;
      return h;
    };

    const startMer = mer1 || (!mer1 && mer2 ? mer2 : undefined);
    const endMer = mer2;
    const sh = parseInt(h1, 10);
    const eh = parseInt(h2, 10);
    const sm = min1 ? parseInt(min1, 10) : 0;
    const em = min2 ? parseInt(min2, 10) : 0;

    let hStart = to24(sh, startMer);
    let hEnd = to24(eh, endMer);

    const guessPM = /\b(tonight|evening|pm)\b/i.test(input);
    if (!startMer && !endMer) {
      if (guessPM) {
        hStart = sh % 12 + 12;
        hEnd = eh % 12 + 12;
      }
    }

    start.setHours(hStart, sm, 0, 0);
    end.setHours(hEnd, em, 0, 0);
    return { start, end: clampEndAfter(start, end) };
  }

  const single = input.match(/(\d{1,2})(?::(\d{2}))?\s*(a|p|am|pm)/i);
  if (single) {
    const [, h, min, mer] = single;
    const start = new Date(base);
    const end = new Date(base);
    const hh = parseInt(h, 10);
    const mm = min ? parseInt(min, 10) : 0;
    const m = (mer || '').toLowerCase();
    const h24 = (m === 'p' || m === 'pm') ? hh % 12 + 12 : hh % 12;
    start.setHours(h24, mm, 0, 0);
    end.setTime(start.getTime() + 2 * 60 * 60 * 1000);
    return { start, end };
  }

  if (/\b(tonight|this evening)\b/i.test(input)) {
    const start = new Date(base);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return { start, end };
  }

  if (/\btoday\b/i.test(input)) {
    const start = new Date(base);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return { start, end };
  }

  const start = now;
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return { start, end };
}

export default function CreateInvitePage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [details, setDetails] = useState('');
  const [circleName, setCircleName] = useState<CircleName>('Family');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return alert('Not signed in.');
    const text = details.trim();
    if (!text) return alert('Please describe what you’re doing');

    let circleId: string;
    try {
      circleId = await ensureCircle(userId, circleName);
    } catch (err) {
      console.error(err);
      alert('Could not ensure circle.');
      return;
    }

    const { start, end } = parseWindow(text);

    const { data, error } = await supabase
      .from('open_invites')
      .insert({
        creator_id: userId,
        title: text,
        location_text: null,
        chips: [],
        circle_ids: [circleId],
        window_start: start.toISOString(),
        window_end: end.toISOString(),
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
          <input
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="E.g. Park with kids, 3–5pm today"
            style={{
              width: '100%',
              marginBottom: 12,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #ccc',
            }}
          />

          <label style={{ display: 'block', marginBottom: 8 }}>{"Who’s this for?"}</label>
          <select
            value={circleName}
            onChange={(e) => setCircleName(e.target.value as CircleName)}
            style={{ width: '100%', marginBottom: 16, padding: '8px 10px' }}
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