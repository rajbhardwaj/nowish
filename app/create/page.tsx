// app/create/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient, PostgrestSingleResponse } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type Circle = 'Family' | 'Close Friends' | 'Coworkers';

type ParsedRange = {
  title: string;
  start: Date | null;
  end: Date | null;
};

type OpenInviteInsert = {
  id?: string;
  creator_id: string;
  title: string;
  window_start: string; // ISO
  window_end: string;   // ISO
  host_name: string | null;
  circle_ids: string[]; // required by your DB
  circle?: Circle | null; // legacy / display
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CIRCLES: Circle[] = ['Family', 'Close Friends', 'Coworkers'];

export default function CreateInvitePage() {
  const router = useRouter();

  // --- session / host ------------------------------------
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hostName, setHostName] = useState<string>('');
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? null;
      setUserEmail(email);
      // default hostName to the email handle if empty
      if (email && !hostName) {
        const handle = email.split('@')[0];
        setHostName(handle);
      }
      setSessionChecked(true);
    };
    check();
  }, [hostName]);

  // --- form state ----------------------------------------
  const [raw, setRaw] = useState('');
  const [circle, setCircle] = useState<Circle>('Family');
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  // --- parse “what are you doing?” -----------------------
  const parsed = useMemo<ParsedRange>(() => {
    const fallback: ParsedRange = { title: raw.trim(), start: null, end: null };
    if (!raw.trim()) return { title: '', start: null, end: null };

    // Lazy-load chrono so builds don’t fail if module format changes
    // We can’t await inside useMemo, so we do a quick sync guess here
    // and refine right before submit (see handleCreate).
    try {
      const now = new Date();
      // very small, naive inline parse to show preview until chrono refines
      // Look for “x–yp today/tomorrow/noon/etc.” – if not found, we’ll just show title.
      // (Real parse happens at submit.)
      const simple = raw
        .replace(/\s+/g, ' ')
        .trim();

      // Pull a rough title before any comma/ at/ from
      const parts = simple.split(/(?:,| from | @ )/i);
      const titleGuess = parts[0] || simple;

      return { title: titleGuess, start: null, end: null };
    } catch {
      return fallback;
    }
  }, [raw]);

  const previewText = useMemo(() => {
    if (!raw.trim()) return 'add a time so we can parse it';
    // We only have a title here; real times will be shown after parsing
    return parsed.title || 'add a time so we can parse it';
  }, [parsed.title, raw]);

  // ---- map circle → circle_ids --------------------------
  // If/when you introduce real circle IDs, replace this mapping with your query.
  function circleToIds(c: Circle): string[] {
    // Temporary deterministic IDs based on the label so DB NOT NULL is satisfied.
    const map: Record<Circle, string[]> = {
      Family: ['circle_family'],
      'Close Friends': ['circle_close_friends'],
      Coworkers: ['circle_coworkers'],
    };
    return map[c] ?? ['circle_unknown'];
  }

  // ---- chrono parse (real) ------------------------------
  async function parseWithChrono(input: string): Promise<ParsedRange> {
    const baseTitle = input.trim();
    let title = baseTitle;
    let start: Date | null = null;
    let end: Date | null = null;

    try {
      // ESM import at runtime (avoids “default export doesn’t exist” errors)
      const chrono = await import('chrono-node');
      // Try to split a title prefix before time phrases (comma helps)
      const firstComma = input.indexOf(',');
      if (firstComma > 0) {
        title = input.slice(0, firstComma).trim();
      } else {
        // If it starts with a time phrase and has “ at <place>”
        const m = input.match(/^(?:today|tomorrow|tonight|noon|\d{1,2}([:.]\d{2})?\s*(?:a|p)m?|\d{1,2}\s*-\s*\d{1,2}\s*(?:a|p)m?)\s+at\s+(.+)/i);
        if (m && m[2]) title = m[2].trim();
      }
      // Run chrono with today’s ref
      const results = chrono.parse(input, new Date());
      if (results?.length) {
        const r = results[0];
        start = r.start?.date() ?? null;
        end = r.end?.date?.() ?? null;
        if (!end && start) {
          // default to 1h window if only one time found
          end = new Date(start.getTime() + 60 * 60 * 1000);
        }
      }
    } catch {
      // ignore; we’ll fall back
    }
    return { title, start, end };
  }

  // ---- create -------------------------------------------
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userEmail) {
      alert('Please log in first.');
      return;
    }
    if (!raw.trim()) {
      alert('Tell us what you’re doing (and include a time).');
      return;
    }
    setCreating(true);
    try {
      const refined = await parseWithChrono(raw);
      const title = refined.title || parsed.title || raw.trim();
      const start = refined.start;
      const end = refined.end;

      if (!start || !end) {
        alert('Could not understand the time. Try “3–5p today” or “noon tomorrow”.');
        setCreating(false);
        return;
      }

      // fetch user id for creator_id
      const { data: auth } = await supabase.auth.getSession();
      const creator_id = auth.session?.user?.id;
      if (!creator_id) {
        alert('Could not find your session. Please log in again.');
        setCreating(false);
        return;
      }

      const row: OpenInviteInsert = {
        creator_id,
        title,
        window_start: start.toISOString(),
        window_end: end.toISOString(),
        host_name: hostName?.trim() || userEmail.split('@')[0],
        circle_ids: circleToIds(circle),
        circle, // keep for display
      };

      const { data, error }: PostgrestSingleResponse<{ id: string }[]> =
        await supabase
          .from('open_invites')
          .insert(row)
          .select('id');

      if (error || !data || !data[0]?.id) {
        console.error('Create failed:', error);
        alert('Could not create invite.');
        setCreating(false);
        return;
      }

      const id = data[0].id;
      const base =
        process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nowish.vercel.app';
      const url = `${base}/invite/${id}`;
      setLink(url);
      // don’t navigate; we stay and show share sheet + link
    } finally {
      setCreating(false);
    }
  }

  // ---- share --------------------------------------------
  async function shareLink() {
    if (!link) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Invite',
          text: 'Come hang?',
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(link);
        alert('Link copied!');
      }
    } catch {
      // user canceled share
    }
  }

  // ---- render -------------------------------------------
  const emailBanner = userEmail ? (
    <div
      className="nw-banner mb-6 rounded-lg border border-slate-200/60 bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-sm
                 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200"
      style={{ maxWidth: 820, marginInline: 'auto' }}
    >
      You’re signed in as <strong>{userEmail}</strong>
    </div>
  ) : null;

  return (
    <div className="px-4 py-6">
      {sessionChecked && emailBanner}
      <h1 className="nw-h1 mb-4">Create an invite</h1>
      <p className="nw-subtle mb-6">
        Write it how you’d text it. We’ll parse the time.
      </p>

      <form
        onSubmit={handleCreate}
        className="nw-card mx-auto max-w-3xl rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow
                   backdrop-blur supports-[backdrop-filter]:bg-white/60
                   dark:border-white/10 dark:bg-slate-900/50"
      >
        {/* What */}
        <label className="nw-label mb-2 block">What are you doing?</label>
        <input
          className="nw-input mb-2 block w-full rounded-lg border px-4 py-3
                     focus:outline-none focus:ring-2
                     border-slate-300 bg-white text-slate-900
                     focus:ring-sky-500
                     dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
          placeholder={`e.g. "Park with kids, 3–5p today"`}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          autoComplete="off"
        />

        <div className="nw-subtle mb-5 text-sm">
          Preview: {parsed.title || 'add a time so we can parse it'}
        </div>

        {/* Circle */}
        <label className="nw-label mb-2 block">Who’s this for?</label>
        <select
          className="nw-input mb-5 block w-full rounded-lg border px-3 py-2
                     border-slate-300 bg-white text-slate-900
                     focus:outline-none focus:ring-2 focus:ring-sky-500
                     dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
          value={circle}
          onChange={(e) => setCircle(e.target.value as Circle)}
        >
          {CIRCLES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Host name */}
        <label className="nw-label mb-2 block">Your name (shows on invite)</label>
        <input
          className="nw-input mb-1 block w-full rounded-lg border px-4 py-2
                     border-slate-300 bg-white text-slate-900
                     focus:outline-none focus:ring-2 focus:ring-sky-500
                     dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          placeholder={userEmail?.split('@')[0] ?? ''}
        />
        <div className="nw-subtle mb-6 text-xs">
          Optional — defaults to your email handle.
        </div>

        {/* Actions */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={creating}
            className="nw-btn inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-white shadow
                       hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60
                       dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            {creating ? 'Creating…' : 'Create Invite'}
          </button>

          {/* Link + Share (shows only after create) */}
          {link ? (
            <div className="flex flex-1 items-center gap-3">
              <div className="text-sm text-slate-500">Link ready:</div>
              <input
                readOnly
                value={link}
                className="flex-1 truncate rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm
                           dark:border-white/15 dark:bg-slate-800 dark:text-slate-100"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={shareLink}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm
                           hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500
                           dark:border-white/15 dark:bg-slate-900 dark:text-slate-100"
              >
                Share
              </button>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Link will appear here.</div>
          )}
        </div>
      </form>
    </div>
  );
}