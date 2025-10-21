// app/create/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import * as chrono from 'chrono-node';

type Circle = 'Family' | 'Close Friends' | 'Coworkers';

type Parsed = {
  title: string;
  start: Date | null;
  end: Date | null;
  whenText: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function formatPreview(p: Parsed): string {
  if (!p.title) return 'add a title';
  if (!p.start) return p.title;
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  const start = new Intl.DateTimeFormat(undefined, opts).format(p.start);
  if (!p.end) return `${p.title} — ${start}`;
  const end = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(p.end);
  return `${p.title} — ${start} to ${end}`;
}

function parseInput(input: string, refDate: Date): Parsed {
  const results = chrono.parse(input, refDate);
  let start: Date | null = null;
  let end: Date | null = null;

  if (results.length > 0) {
    const r = results[0];
    start = r.start?.date() ?? null;
    // End may be missing; if so, default to +60min from start
    end = r.end?.date() ?? (start ? new Date(start.getTime() + 60 * 60 * 1000) : null);
  }

  // Title is input with the time phrase removed (best effort)
  const timeSpan =
    results.length > 0 ? input.slice(results[0].index, results[0].index + results[0].text.length) : '';
  const title = input.replace(timeSpan, '').trim().replace(/[–—-]\s*$/,'') || input.trim();

  return {
    title,
    start,
    end,
    whenText: results.length > 0 ? results[0].text : null,
  };
}

export default function CreateInvitePage() {
  const [user, setUser] = useState<User | null>(null);

  const [input, setInput] = useState('');
  const [circle, setCircle] = useState<Circle>('Family');
  const [hostName, setHostName] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user?.email) {
        const handle = data.session.user.email.split('@')[0] ?? '';
        setHostName((prev) => prev || handle);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUser(sess?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const parsed = useMemo(() => parseInput(input, new Date()), [input]);
  const preview = useMemo(() => formatPreview(parsed), [parsed]);

  const canCreate =
    !!user &&
    !!parsed.title &&
    !!parsed.start &&
    !!parsed.end &&
    !!hostName &&
    !creating;

  async function handleCreate() {
    setErrorMsg(null);

    if (!user) {
      setErrorMsg('You need to be signed in.');
      return;
    }
    if (!parsed.start || !parsed.end) {
      setErrorMsg('Please include a time (e.g., “3–5p today”).');
      return;
    }

    setCreating(true);
    try {
      const insertData = {
        creator_id: user.id,
        title: parsed.title,
        window_start: parsed.start.toISOString(),
        window_end: parsed.end.toISOString(),
        host_name: hostName || user.email?.split('@')[0],
      };
      
      console.log('Inserting data:', insertData);
      
      const { data, error } = await supabase
        .from('open_invites')
        .insert([insertData])
        .select('id')
        .single();

      if (error) {
        setErrorMsg(`Create failed: ${error.message}`);
        setCreating(false);
        return;
      }
      const id: string = data.id;
      const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nowish.vercel.app'}/invite/${id}`;
      setLink(url);

      // try to share right away
      if (navigator.share) {
        try {
          await navigator.share({
            title: parsed.title,
            text: `Join me: ${preview}`,
            url,
          });
        } catch {
          // user may cancel share; ignore
        }
      }
     } catch {
       setErrorMsg('Unexpected error creating invite.');
     } finally {
       setCreating(false);
     }
  }

  function copyLink() {
    if (link) {
      navigator.clipboard.writeText(link).catch(() => {});
    }
  }

  function shareLink() {
    if (!link) return;
    if (navigator.share) {
      navigator
        .share({ title: parsed.title || 'Invite', text: preview, url: link })
        .catch(() => {});
    } else {
      copyLink();
    }
  }

  return (
    <div className="space-y-6">
      {/* signed in banner */}
      <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
        You&apos;re signed in as <span className="font-medium">{user?.email ?? '—'}</span>
      </div>

      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Create an invite</h1>
        <p className="text-slate-600">Write it how you&apos;d text it. We&apos;ll parse the time.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
        {/* What are you doing */}
        <div className="space-y-2">
          <label className="block text-lg font-semibold text-slate-900">
            What are you doing?
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder='e.g. "Park with kids, 3–5p today"'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />

          {/* Preview */}
          <div className="text-sm text-slate-500">
            <span className="font-medium">Preview:</span>{' '}
            {parsed.start ? (
              <span className="text-slate-700">{preview}</span>
            ) : (
              <span>add a time so we can parse it</span>
            )}
          </div>
        </div>

        {/* Circle & Host */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-lg font-semibold text-slate-900">Who&apos;s this for?</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              value={circle}
              onChange={(e) => setCircle(e.target.value as Circle)}
            >
              <option>Family</option>
              <option>Close Friends</option>
              <option>Coworkers</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-lg font-semibold text-slate-900">
              Your name (shows on invite)
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Optional — defaults to your email handle.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-4">
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className={`rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 disabled:cursor-not-allowed ${
              canCreate
                ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl active:scale-95'
                : 'bg-slate-300'
            }`}
          >
            {creating ? 'Creating…' : 'Create Invite'}
          </button>

          {link && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-600">Link ready:</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  readOnly
                  value={link}
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={copyLink}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    Copy
                  </button>
                  <button
                    onClick={shareLink}
                    className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
        </div>
      </div>

      <div className="text-sm text-slate-500">
        <span className="font-medium">Tip:</span> try <span className="font-medium">&quot;Park with kids, 3–5p today&quot;</span> or{' '}
        <span className="font-medium">&quot;Dinner, 7:30pm tomorrow&quot;</span>.
      </div>
    </div>
  );
}