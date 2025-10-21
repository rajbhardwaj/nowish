'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import chrono from 'chrono-node';

// ---- types -------------------------------------------------

type Circle = 'Family' | 'Close Friends' | 'Coworkers';

type ParsedTime = {
  title: string;
  start: Date | null;
  end: Date | null;
};

// ---- helpers -----------------------------------------------

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nowish.vercel.app';

function parseInput(input: string): ParsedTime {
  const results = chrono.parse(input, new Date(), { forwardDate: true });
  if (!results.length) {
    return { title: input.trim(), start: null, end: null };
  }
  const first = results[0];
  const title =
    (input || '').replace(first.text, '').trim() || input.trim();

  const start = first.start?.date ? first.start.date() : null;
  const end = first.end?.date ? first.end.date() : null;

  return { title, start, end };
}

function fmtRange(start: Date | null, end: Date | null): string {
  if (!start) return 'When? (we’ll parse it)';
  const optsDate: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  const optsTime: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };
  const d = start.toLocaleDateString(undefined, optsDate);
  const s = start.toLocaleTimeString(undefined, optsTime);
  const e = end ? end.toLocaleTimeString(undefined, optsTime) : '';
  return `${d} • ${s}${e ? ` – ${e}` : ''}`;
}

// ---- component ---------------------------------------------

export default function CreateInvitePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [circle, setCircle] = useState<Circle>('Family');
  const [hostName, setHostName] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const [createdId, setCreatedId] = useState<string | null>(null);
  const createdUrl = createdId ? `${BASE}/invite/${createdId}` : '';

  // load session -> email and a sensible default hostName
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const em = data.session?.user.email ?? '';
      setEmail(em);
      if (em && !hostName) {
        const handle = em.split('@')[0];
        setHostName(handle);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // parse preview
  const parsed = useMemo(() => parseInput(input), [input]);

  // ---- share handler ---------------------------------------

  async function handleShare() {
    if (!createdUrl) return;
    const shareData = {
      title: parsed.title || 'Nowish Invite',
      text:
        parsed.start
          ? `${parsed.title} — ${fmtRange(parsed.start, parsed.end)}`
          : parsed.title || 'Join me on Nowish',
      url: createdUrl,
    };

    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(createdUrl);
        alert('Link copied to clipboard.');
      } else {
        // final fallback
        prompt('Copy this link:', createdUrl);
      }
    } catch (err) {
      // user canceled or share failed — fall back to copy
      try {
        await navigator.clipboard.writeText(createdUrl);
        alert('Link copied to clipboard.');
      } catch {
        // ignore
      }
    }
  }

  // ---- create handler --------------------------------------

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setCreating(true);
    setCreatedId(null);

    try {
      // ensure session (for creator_id)
      const { data: s } = await supabase.auth.getSession();
      const userId = s.session?.user.id;
      if (!userId) {
        alert('You need to be signed in.');
        setCreating(false);
        return;
      }

      // compute window
      const { title, start, end } = parsed;

      // we store a single circle; also write array for future (if your schema has circle_ids not null)
      const circle_ids = [circle]; // simple string array

      const { data, error } = await supabase
        .from('open_invites')
        .insert([
          {
            creator_id: userId,
            title: title || input.trim(),
            window_start: start ? start.toISOString() : null,
            window_end: end ? end.toISOString() : null,
            details: null,
            circle, // keep your simple enum column
            circle_ids, // helps satisfy not-null if present in your schema
            host_name: hostName?.trim() || email.split('@')[0],
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.error('Create failed:', error);
        alert('Could not create invite.');
        setCreating(false);
        return;
      }

      setCreatedId(data.id);
    } finally {
      setCreating(false);
    }
  }

  // ---- UI ---------------------------------------------------

  return (
    <div className="nw-wrap">
      {/* signed-in banner */}
      {email && (
        <div className="nw-banner">You’re signed in as <b>{email}</b></div>
      )}

      <h1 className="nw-h1">Create an invite</h1>
      <p className="nw-sub">Write it how you’d text it. We’ll parse the time.</p>

      <form onSubmit={onCreate} className="nw-card">
        {/* What are you doing */}
        <label className="nw-label" htmlFor="what">
          What are you doing?
        </label>
        <input
          id="what"
          className="nw-input"
          placeholder='e.g. "Park with kids, 3–5p today"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="nw-hint">
          Preview: <b>{parsed.title || '—'}</b>
          {parsed.start && (
            <>
              {' — '}
              {fmtRange(parsed.start, parsed.end)}
            </>
          )}
        </div>

        {/* Circle */}
        <label className="nw-label" htmlFor="circle">
          Who’s this for?
        </label>
        <select
          id="circle"
          className="nw-input"
          value={circle}
          onChange={(e) => setCircle(e.target.value as Circle)}
        >
          <option>Family</option>
          <option>Close Friends</option>
          <option>Coworkers</option>
        </select>

        {/* Host name */}
        <label className="nw-label" htmlFor="host">
          Your name (shows on invite)
        </label>
        <input
          id="host"
          className="nw-input"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
        />
        <div className="nw-hint">Optional — defaults to your email handle.</div>

        {/* Create button */}
        <button className="nw-btn" disabled={creating}>
          {creating ? 'Creating…' : 'Create Invite'}
        </button>

        {/* Success panel with Share */}
        {createdId && (
          <div className="nw-success">
            <div className="nw-success-title">Invite created!</div>
            <div className="nw-success-row">
              <span className="nw-success-label">Link ready:</span>
              <input className="nw-input" readOnly value={createdUrl} />
            </div>

            <div className="nw-actions">
              <button
                type="button"
                className="nw-btn"
                onClick={handleShare}
                aria-label="Share invite"
              >
                Share
              </button>

              <a
                className="nw-btn-secondary"
                href={createdUrl}
                target="_blank"
                rel="noreferrer"
              >
                View invite
              </a>

              <button
                type="button"
                className="nw-btn-secondary"
                onClick={() => router.push('/my')}
              >
                See my invites
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}