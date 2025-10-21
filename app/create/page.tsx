'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type InviteRow = { id: string };
type CircleName = 'Family' | 'Close Friends' | 'Coworkers';

/* ---------- Natural-language time parsing ---------- */
function parseWindow(input: string): { start: Date; end: Date } {
  const now = new Date();
  const base = new Date(now);
  if (/\btomorrow\b/i.test(input)) base.setDate(base.getDate() + 1);

  const m = input.match(
    /(\d{1,2})(?::(\d{2}))?\s*(a|p|am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(a|p|am|pm)?/i
  );
  const clampEndAfter = (s: Date, e: Date) => (e > s ? e : new Date(s.getTime() + 60 * 60 * 1000));

  if (m) {
    const [, h1, min1, mer1, h2, min2, mer2] = m;
    const start = new Date(base);
    const end = new Date(base);
    const to24 = (h: number, mer?: string) => {
      if (!mer) return h;
      const mm = mer.toLowerCase();
      if (mm === 'p' || mm === 'pm') return (h % 12) + 12;
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
    if (!startMer && !endMer && guessPM) {
      hStart = (sh % 12) + 12;
      hEnd = (eh % 12) + 12;
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
    const mmm = (mer || '').toLowerCase();
    const h24 = mmm === 'p' || mmm === 'pm' ? (hh % 12) + 12 : hh % 12;
    start.setHours(h24, mm, 0, 0);
    end.setTime(start.getTime() + 2 * 60 * 60 * 1000);
    return { start, end };
  }

  if (/\b(tonight|this evening)\b/i.test(input)) {
    const start = new Date(base);
    start.setHours(18, 0, 0, 0);
    return { start, end: new Date(start.getTime() + 2 * 60 * 60 * 1000) };
  }

  if (/\btoday\b/i.test(input)) {
    const start = new Date(base);
    return { start, end: new Date(start.getTime() + 2 * 60 * 60 * 1000) };
  }

  const start = now;
  return { start, end: new Date(now.getTime() + 2 * 60 * 60 * 1000) };
}

/* --------------------- Page --------------------- */
export default function CreateInvitePage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // form
  const [details, setDetails] = useState('');
  const [circleName, setCircleName] = useState<CircleName>('Family');

  // result
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

    if (error || !inserted) throw new Error(error?.message || 'Failed to create circle');
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

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    setCreatedId(data.id);
    setShareUrl(`${base}/invite/${data.id}`);
  }

  if (!sessionChecked) {
    return <main style={{ padding: 16 }}>Checking session…</main>;
  }

  return (
    <main style={{ maxWidth: 680, margin: '16px auto 64px', padding: '0 16px' }}>
      {/* Banner */}
      {userEmail && (
        <div
          style={{
            background: '#f4f4f4',
            padding: 10,
            borderRadius: 8,
            textAlign: 'center',
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          You are signed in as <strong>{userEmail}</strong>
        </div>
      )}

      {/* Title — responsive size with clamp */}
      <h1 style={{ margin: '8px 0 12px', fontSize: 'clamp(28px, 6vw, 44px)' }}>
        Create an Invite
      </h1>

      {!createdId ? (
        /* ---------- Form ---------- */
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 6 }}>What are you doing?</label>
          <input
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Oakland Zoo, 5–6p today"
            inputMode="text"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #d8d8d8',
              fontSize: 16,
              marginBottom: 12,
            }}
          />

          <label style={{ display: 'block', marginBottom: 6 }}>{"Who’s this for?"}</label>
          <select
            value={circleName}
            onChange={(e) => setCircleName(e.target.value as CircleName)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #d8d8d8',
              fontSize: 16,
              marginBottom: 16,
              background: '#fff',
            }}
          >
            <option value="Family">Family</option>
            <option value="Close Friends">Close Friends</option>
            <option value="Coworkers">Coworkers</option>
          </select>

          {/* primary full-width button (thumb-friendly) */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 12,
              border: 'none',
              background: '#111',
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Create Invite
          </button>
        </form>
      ) : (
        /* ---------- Success (mobile friendly) ---------- */
        <section
          style={{
            marginTop: 8,
            padding: 12,
            border: '1px solid #e6e6e6',
            borderRadius: 12,
            background: '#fafafa',
          }}
        >
          <p style={{ margin: '4px 0 8px', fontSize: 18, fontWeight: 600 }}>Invite created!</p>

          {/* Link card that wraps & can be copied */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e6e6e6',
              borderRadius: 10,
              padding: 10,
              wordBreak: 'break-all', // long URL wraps on small screens
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13,
              lineHeight: 1.3,
              marginBottom: 10,
            }}
          >
            {shareUrl}
          </div>

          {/* Sticky-ish action bar for mobile */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 8,
            }}
          >
            <a
              href={`/invite/${createdId}`}
              style={{
                textAlign: 'center',
                textDecoration: 'none',
                padding: '12px 14px',
                borderRadius: 12,
                background: '#111',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              View invite
            </a>

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
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #e6e6e6',
                background: '#fff',
                fontWeight: 700,
              }}
            >
              Share
            </button>

            <a
              href="/my"
              style={{
                textAlign: 'center',
                textDecoration: 'none',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #e6e6e6',
                background: '#fff',
                color: '#111',
                fontWeight: 700,
              }}
            >
              See my invites
            </a>
          </div>
        </section>
      )}
    </main>
  );
}