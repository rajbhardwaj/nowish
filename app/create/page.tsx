'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import chrono from 'chrono-node';

type Circle = 'Family' | 'Close Friends' | 'Coworkers';

// Client Supabase (uses anon key on the client)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CreateInvitePage() {
  const [text, setText] = useState<string>('');
  const [circle, setCircle] = useState<Circle>('Family');
  const [hostName, setHostName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // load session + sensible default for host name
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? null;
      setUserEmail(email);
      if (email && !hostName) setHostName(email.split('@')[0]);
    })();
  }, [hostName]);

  // preview of what we parsed (nice little affordance)
  const parsedSummary = useMemo(() => {
    const results = chrono.parse(text);
    if (!results.length) return null;
    const r = results[0];
    const start = r.start?.date();
    const end = r.end?.date();
    if (!start) return null;

    const fmt = (d: Date) =>
      d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const day =
      start.toDateString() === new Date().toDateString()
        ? 'today'
        : start.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

    return end ? `${fmt(start)}–${fmt(end)} ${day}` : `${fmt(start)} ${day}`;
  }, [text]);

  async function handleCreateInvite() {
    if (!text.trim()) return;
    setCreating(true);
    setResultUrl(null);

    try {
      // Parse natural language time
      const results = chrono.parse(text);
      let title = text.trim();
      let window_start: string | null = null;
      let window_end: string | null = null;

      if (results.length) {
        const r = results[0];
        if (r.start) window_start = r.start.date().toISOString();
        if (r.end) window_end = r.end.date().toISOString();
        // pull the time phrase out of the title for a cleaner subject
        if (r.text) {
          const stripped = title.replace(r.text, '').trim();
          if (stripped) title = stripped;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const insertPayload = {
        title,
        circle,
        host_name: hostName || userEmail?.split('@')[0] || 'Someone',
        window_start,
        window_end,
        creator_id: user?.id ?? null,
      };

      const { data, error } = await supabase
        .from('open_invites')
        .insert([insertPayload])
        .select('id')
        .single();

      if (error) throw error;

      setResultUrl(`/invite/${data.id}`);
      setText('');
    } catch (err) {
      console.error(err);
      alert('Something went wrong creating the invite.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 py-8">
      {/* Signed-in banner */}
      {userEmail && (
        <div className="mb-6 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-100 dark:ring-slate-700">
          You’re signed in as <span className="font-semibold">{userEmail}</span>
        </div>
      )}

      {/* Title */}
      <h1 className="mb-2 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-4xl font-extrabold text-transparent dark:from-white dark:to-slate-300">
        Create an invite
      </h1>
      <p className="mb-6 text-slate-600 dark:text-slate-300">
        Write it how you’d text it. We’ll parse the time.
      </p>

      {/* Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Activity */}
        <label
          htmlFor="activity"
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          What are you doing?
        </label>
        <input
          id="activity"
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-700"
          placeholder='e.g. Park with kids, 3–5p today'
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />

        {parsedSummary && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            ⏱️ We’ll set the time to <span className="font-medium">{parsedSummary}</span>
          </p>
        )}

        {/* Circle & Host in a responsive grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="circle"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Who’s this for?
            </label>
            <select
              id="circle"
              value={circle}
              onChange={(e) => setCircle(e.target.value as Circle)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-slate-700"
            >
              <option value="Family">Family</option>
              <option value="Close Friends">Close Friends</option>
              <option value="Coworkers">Coworkers</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="host"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Your name (shows on invite)
            </label>
            <input
              id="host"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Raj"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-slate-700"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Optional — defaults to your email handle.
            </p>
          </div>
        </div>

        {/* Create button */}
        <div className="mt-6">
          <button
            onClick={handleCreateInvite}
            disabled={!text.trim() || creating}
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {creating ? 'Creating…' : 'Create Invite'}
          </button>
        </div>
      </div>

      {/* Result card */}
      {resultUrl && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-800 dark:text-slate-100">
            ✅ Invite created! Share this link:
          </p>
          <div className="mt-3 flex items-center gap-3">
            <code className="flex-1 truncate rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
              {resultUrl}
            </code>
            <button
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              onClick={async () => {
                const url =
                  location.origin.replace(/\/$/, '') + resultUrl.replace(/^\//, '');
                try {
                  await navigator.clipboard.writeText(url);
                  alert('Link copied!');
                } catch {
                  window.prompt('Copy link:', url);
                }
              }}
            >
              Copy
            </button>
            <a
              href={resultUrl}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              View
            </a>
          </div>
        </div>
      )}
    </div>
  );
}