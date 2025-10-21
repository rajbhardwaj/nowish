'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Circle = 'Family' | 'Close Friends' | 'Coworkers';

// Web Share API type guard (no `any`)
type ShareCapableNavigator = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
};
function hasShare(n: Navigator): n is ShareCapableNavigator {
  return typeof (n as ShareCapableNavigator).share === 'function';
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------- small helpers ----------
function emailHandle(email: string) {
  const i = email.indexOf('@');
  return i > 0 ? email.slice(0, i) : email;
}

function titleFromRaw(raw: string) {
  const cleaned = raw
    .replace(/\b(today|tomorrow|tonight)\b/gi, '')
    .replace(/\bfrom\b.*$/i, '')
    .replace(/\b\d{1,2}(:\d{2})?\s?(-|to|–|—)\s?\d{1,2}(:\d{2})?\s?(am|pm|a|p)?/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length ? cleaned : raw.trim();
}

function fmtRange(start: Date, end: Date) {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start);

  const t = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return sameDay ? `${day} • ${t.format(start)} — ${t.format(end)}` : `${t.format(start)} — ${t.format(end)}`;
}

// ---------- component ----------
export default function CreateInvitePage() {
  const [raw, setRaw] = useState('');
  const [circle, setCircle] = useState<Circle>('Family');
  const [hostName, setHostName] = useState('');
  const [signedInAs, setSignedInAs] = useState<string | null>(null);

  // chrono loaded on the client only
  const [chronoMod, setChronoMod] = useState<typeof import('chrono-node') | null>(null);

  // live-parse state
  const [liveStart, setLiveStart] = useState<Date | null>(null);
  const [liveEnd, setLiveEnd] = useState<Date | null>(null);

  // saving state
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  // fetch current user for defaults
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? null;
      setSignedInAs(email);
      if (email && !hostName) setHostName(emailHandle(email));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load chrono once (client)
  useEffect(() => {
    let mounted = true;
    import('chrono-node')
      .then((m) => mounted && setChronoMod(m))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // live parsing (debounced)
  useEffect(() => {
    if (!chronoMod) return;
    if (!raw.trim()) {
      setLiveStart(null);
      setLiveEnd(null);
      return;
    }
    const id = setTimeout(() => {
      const results = chronoMod.parse(raw, new Date(), { forwardDate: true });
      if (!results.length) {
        setLiveStart(null);
        setLiveEnd(null);
        return;
      }
      const r = results[0];
      const s = r.start?.date() ?? null;
      const e = r.end?.date() ?? (s ? new Date(s.getTime() + 60 * 60 * 1000) : null);
      setLiveStart(s ?? null);
      setLiveEnd(e ?? null);
    }, 160);
    return () => clearTimeout(id);
  }, [raw, chronoMod]);

  const previewTitle = useMemo(() => (raw.trim() ? titleFromRaw(raw) : ''), [raw]);

  const previewWhen = useMemo(() => {
    if (liveStart && liveEnd) return fmtRange(liveStart, liveEnd);
    return 'add a time so we can parse it';
  }, [liveStart, liveEnd]);

  const canSubmit = !!raw.trim() && !!liveStart && !!liveEnd;

  async function handleCreate() {
    if (!canSubmit) return;

    try {
      setCreating(true);
      setCreatedLink(null);

      // Make sure we still have a user
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        alert('Please sign in.');
        setCreating(false);
        return;
      }

      // Reuse live parse; if not present, do a just-in-time parse.
      let start = liveStart;
      let end = liveEnd;
      if ((!start || !end) && !chronoMod) {
        const cm = await import('chrono-node');
        const res = cm.parse(raw, new Date(), { forwardDate: true });
        if (res.length) {
          const r = res[0];
          start = r.start?.date() ?? null;
          end = r.end?.date() ?? (start ? new Date(start.getTime() + 60 * 60 * 1000) : null);
        }
      }

      if (!start || !end) {
        alert('Please include a time (for example: “Park with kids, 3–5p today”).');
        setCreating(false);
        return;
      }

      const title = previewTitle || 'Hang';
      const host = hostName.trim() || (signedInAs ? emailHandle(signedInAs) : 'Me');

      const { data, error } = await supabase
        .from('open_invites')
        .insert({
          creator_id: user.id,
          title,
          window_start: start.toISOString(),
          window_end: end.toISOString(),
          host_name: host,
          circle, // enum/text column
        })
        .select('id')
        .single();

      if (error) {
        console.error('Create failed:', error);
        alert('Could not create invite.');
        setCreating(false);
        return;
      }

      const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://nowish.vercel.app';
      const url = `${base}/invite/${data.id}`;
      setCreatedLink(url);

      // Try Web Share (no `any`)
      if (typeof navigator !== 'undefined' && hasShare(navigator)) {
        try {
          await navigator.share({
            title,
            text: `${title} — ${previewWhen}`,
            url,
          });
        } catch {
          // user cancelled
        }
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-8">
      {signedInAs && (
        <div className="mb-6 rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          You’re signed in as <span className="font-semibold">{signedInAs}</span>
        </div>
      )}

      <h1 className="mb-2 text-4xl font-semibold tracking-tight text-slate-900">
        Create an invite
      </h1>
      <p className="mb-6 text-slate-600">
        Write it how you’d text it. We’ll parse the time.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <label className="mb-2 block text-base font-semibold text-slate-900">
          What are you doing?
        </label>
        <input
          className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder={`e.g. "Park with kids, 3–5p today"`}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />

        <div className="mb-6 text-sm text-slate-500">
          <span className="font-medium text-slate-600">Preview:</span>{' '}
          {previewTitle ? `${previewTitle} — ` : null}
          {previewWhen}
        </div>

        <label className="mb-2 block text-base font-semibold text-slate-900">
          Who’s this for?
        </label>
        <select
          className="mb-6 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={circle}
          onChange={(e) => setCircle(e.target.value as Circle)}
        >
          <option>Family</option>
          <option>Close Friends</option>
          <option>Coworkers</option>
        </select>

        <label className="mb-2 block text-base font-semibold text-slate-900">
          Your name (shows on invite)
        </label>
        <input
          className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="e.g. Raju"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
        />
        <p className="mb-6 text-sm text-slate-500">
          Optional — defaults to your email handle.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={handleCreate}
            disabled={!canSubmit || creating}
            className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-base font-semibold text-white shadow-sm transition ${
              !canSubmit || creating
                ? 'bg-slate-300'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {creating ? 'Creating…' : 'Create Invite'}
          </button>

          <div className="flex-1">
            {createdLink ? (
              <div className="mt-2 flex items-center gap-2 sm:mt-0 sm:justify-end">
                <input
                  readOnly
                  value={createdLink}
                  className="w-full max-w-[28rem] rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
                <button
                  onClick={() => navigator.clipboard?.writeText(createdLink)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Copy
                </button>
                {typeof navigator !== 'undefined' && hasShare(navigator) ? (
                  <button
                    onClick={() =>
                      navigator.share!({
                        title: previewTitle || 'Invite',
                        text: `${previewTitle || 'Invite'} — ${previewWhen}`,
                        url: createdLink,
                      })
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Share
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500 sm:mt-0 sm:text-right">
                Link will appear here after you create.
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        Tip: try “Park with kids, 3–5p today” or “Dinner, 7:30pm tomorrow”.
      </p>
    </div>
  );
}