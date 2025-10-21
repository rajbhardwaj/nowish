// app/create/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as chrono from 'chrono-node';

type Circle = 'Family' | 'Close Friends' | 'Coworkers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ParseResult = {
  title: string;
  start: Date | null;
  end: Date | null;
  whenSummary: string;
};

function parseInvite(text: string): ParseResult {
  const ref = new Date();
  const results = chrono.parse(text, ref);
  const first = results[0];

  // Title = input with the parsed date text removed
  let title = text.trim();
  if (first?.text) {
    const idx = title.toLowerCase().indexOf(first.text.toLowerCase());
    if (idx >= 0) {
      title = (title.slice(0, idx) + title.slice(idx + first.text.length)).trim();
      if (title.endsWith(',') || title.endsWith('-')) title = title.slice(0, -1).trim();
    }
  }
  if (!title) title = 'Untitled';

  let start: Date | null = null;
  let end: Date | null = null;

  if (first?.start) start = first.start.date();
  if (first?.end) end = first.end.date();

  // If no explicit end, default to 90 minutes
  if (start && !end) {
    end = new Date(start.getTime() + 90 * 60 * 1000);
  }

  const fmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const whenSummary =
    start && end ? `${fmt.format(start)} to ${fmt.format(end)}` : 'add a time so we can parse it';

  return { title, start, end, whenSummary };
}

export default function CreateInvitePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [hostName, setHostName] = useState('');
  const [circle, setCircle] = useState<Circle>('Family');
  const [input, setInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const addr = data.user?.email ?? null;
      setEmail(addr);
      // default host name from email handle
      if (!hostName && addr) setHostName(addr.split('@')[0]);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = useMemo(() => parseInvite(input), [input]);

  async function handleCreate() {
    if (!parsed.start || !parsed.end) {
      alert('Please include a time (e.g., “3–5p today”).');
      return;
    }
    setCreating(true);
    setLink(null);

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      setCreating(false);
      alert('You need to be signed in.');
      return;
    }

    const { data, error } = await supabase
      .from('open_invites')
      .insert([
        {
          creator_id: userId, // important for RLS
          title: parsed.title,
          window_start: parsed.start.toISOString(),
          window_end: parsed.end.toISOString(),
          circle,
          host_name: hostName || (email ? email.split('@')[0] : 'Host'),
        },
      ])
      .select('id')
      .single();

    setCreating(false);

    if (error) {
      console.error('Create failed:', error);
      alert('Could not create invite.');
      return;
    }
    const urlBase = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nowish.vercel.app';
    const inviteUrl = `${urlBase}/invite/${data.id}`;
    setLink(inviteUrl);

    // If the Web Share API exists, open the share sheet immediately
    try {
      if (navigator.share) {
        await navigator.share({
          title: parsed.title,
          text: `Join? ${parsed.whenSummary}`,
          url: inviteUrl,
        });
      }
    } catch {
      // user canceled share — silently ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* signed-in banner */}
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white/60 px-4 py-2 text-sm text-slate-700 shadow-sm">
        You’re signed in as <span className="font-semibold">{email ?? '...'}</span>
      </div>

      <header className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-serif font-semibold tracking-tight text-slate-900">
          Create an invite
        </h1>
        <p className="mt-2 text-slate-600">Write it how you’d text it. We’ll parse the time.</p>
      </header>

      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
        {/* What */}
        <label className="block text-lg font-semibold text-slate-900">
          What are you doing?
        </label>
        <input
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
          placeholder='e.g. "Park with kids, 3–5p today"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <p className="mt-2 text-sm text-slate-600">
          Preview: <span className="font-medium">{parsed.title}</span> — {parsed.whenSummary}
        </p>

        {/* Circle */}
        <div className="mt-6">
          <label className="block text-lg font-semibold text-slate-900">Who’s this for?</label>
          <select
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
            value={circle}
            onChange={(e) => setCircle(e.target.value as Circle)}
          >
            <option>Family</option>
            <option>Close Friends</option>
            <option>Coworkers</option>
          </select>
        </div>

        {/* Host name */}
        <div className="mt-6">
          <label className="block text-lg font-semibold text-slate-900">
            Your name (shows on invite)
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
            placeholder="e.g. Raju"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />
          <p className="mt-2 text-sm text-slate-500">
            Optional — defaults to your email handle.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create Invite'}
          </button>

          {link && (
            <div className="flex-1">
              <div className="text-sm text-slate-600">Link ready:</div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={link}
                />
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      alert('Copied!');
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Copy
                </button>
                <button
                  onClick={async () => {
                    if (navigator.share) {
                      await navigator.share({
                        title: parsed.title,
                        text: `Join? ${parsed.whenSummary}`,
                        url: link,
                      });
                    } else {
                      window.open(link, '_blank');
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}