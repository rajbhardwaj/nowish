'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import * as chrono from 'chrono-node';
import { useRouter } from 'next/navigation';

// ---- types -------------------------------------------------

type Circle = 'Family' | 'Close Friends' | 'Coworkers';

type ParsedWindow = {
  title: string;
  start: Date;
  end: Date;
};

type InsertResponse = {
  id: string;
};

// ---- helpers -----------------------------------------------

function getBase(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nowish.vercel.app';
}

function parseIntent(input: string, refDate = new Date()): ParsedWindow | null {
  // Example inputs: "Park with kids, 3-5p today", "noon tomorrow", "6-7pm"
  const results = chrono.parse(input, refDate);
  if (!results.length) return null;

  const r = results[0];
  const start = r.start?.date() ?? null;

  // If a range was found, use its end; otherwise default to +1 hour
  const end =
    r.end?.date() ??
    (start ? new Date(start.getTime() + 60 * 60 * 1000) : null);

  if (!start || !end) return null;

  // Heuristic: title = text before the first time span match
  const titleText = input.slice(0, Math.max(0, r.index)).trim();
  const title =
    titleText ||
    input.replace(/\b(today|tomorrow|tonight)\b/gi, '').trim() ||
    'Invite';

  return { title, start, end };
}

function toIsoUTC(d: Date): string {
  // Postgres timestamptz wants ISO strings
  return new Date(d.getTime()).toISOString();
}

// ---- component ---------------------------------------------

export default function CreateInvitePage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [raw, setRaw] = useState('');
  const [circle, setCircle] = useState<Circle>('Family');
  const [hostName, setHostName] = useState<string>('');

  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Supabase (client)
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // Fetch session (email used for banner + default hostName)
  useEffect(() => {
    async function check() {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session?.user?.email) {
        setUserEmail(data.session.user.email);
        // default host display = email handle
        if (!hostName) {
          const handle = data.session.user.email.split('@')[0] ?? '';
          setHostName(handle);
        }
      }
      setSessionChecked(true);
    }
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Live parse preview
  const preview = useMemo(() => parseIntent(raw), [raw]);

  async function handleCreate() {
    if (!preview) {
      alert('Please add a time (e.g., “3–5p today”).');
      return;
    }

    setCreating(true);
    setCreatedLink(null);
    setCreatedId(null);

    const { title, start, end } = preview;

    // Payload matches your open_invites shape (circle_ids required; keep [] by default)
    const payload = {
      title,
      window_start: toIsoUTC(start),
      window_end: toIsoUTC(end),
      details: null as string | null,
      circle_ids: [] as string[],
      circle, // keep the readable label you’re storing already
      host_name: hostName || null,
    };

    const { data, error } = await supabase
      .from('open_invites')
      .insert(payload)
      .select('id')
      .single<{ id: string }>();

    if (error) {
      setCreating(false);
      alert(
        `Could not create invite.\n\n${JSON.stringify(
          { code: error.code, message: error.message, details: error.details },
          null,
          2
        )}`
      );
      return;
    }

    const id = (data as InsertResponse).id;
    const url = `${getBase()}/invite/${id}`;
    setCreatedId(id);
    setCreatedLink(url);
    setCreating(false);
  }

  async function handleShare() {
    if (!createdLink || !preview) return;
    const shareData: ShareData = {
      title: preview.title,
      text: `${preview.title} — wanna join?`,
      url: createdLink,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(createdLink);
        alert('Link copied to clipboard!');
      } else {
        alert(createdLink);
      }
    } catch {
      // user canceled share — do nothing
    }
  }

  // UI -------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 px-4 py-8">
      {sessionChecked && userEmail && (
        <div className="mx-auto mb-6 w-full max-w-2xl rounded-xl border border-slate-200 bg-white/60 px-4 py-2 text-sm text-slate-700 shadow-sm">
          You’re signed in as <span className="font-semibold">{userEmail}</span>
        </div>
      )}

      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-4xl font-serif font-semibold tracking-tight">
          Create an invite
        </h1>
        <p className="mt-3 text-slate-600">
          Write it how you’d text it. We’ll parse the time.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
          {/* What are you doing */}
          <label className="block text-lg font-semibold text-slate-900">
            What are you doing?
          </label>
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='e.g. "Park with kids, 3–5p today"'
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none ring-0 focus:border-slate-400"
          />

          {/* Preview */}
          <div className="mt-2 text-sm text-slate-600">
            Preview:{' '}
            {preview ? (
              <>
                <span className="font-medium">{preview.title}</span> —{' '}
                {preview.start.toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: '2-digit',
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                to{' '}
                {preview.end.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </>
            ) : (
              <span className="italic text-slate-500">
                add a time so we can parse it
              </span>
            )}
          </div>

          {/* Circle */}
          <div className="mt-6">
            <label className="block text-lg font-semibold text-slate-900">
              Who’s this for?
            </label>
            <select
              value={circle}
              onChange={(e) => setCircle(e.target.value as Circle)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
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
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
            />
            <p className="mt-2 text-sm text-slate-500">
              Optional — defaults to your email handle.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={handleCreate}
              disabled={creating || !preview}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create Invite'}
            </button>

            <div className="flex-1">
              {createdLink ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    readOnly
                    value={createdLink}
                    className="w-full flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleShare}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Share
                    </button>
                    <a
                      href={createdLink}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      View invite →
                    </a>
                    <a
                      href="/my"
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      See my invites
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Link will appear here.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}