/* app/create/page.tsx */
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Circle = 'Close Friends' | 'Family' | 'Coworkers' | 'Acquaintances';

function parseNatural(text: string) {
  // same parser you had before (shortened here)
  const lower = text.toLowerCase();
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0
  );
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  let dayRef: Date | null = null;
  if (/\btoday\b/.test(lower)) dayRef = today;
  if (/\btomorrow\b/.test(lower)) dayRef = tomorrow;

  const hm = lower.match(/(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*([ap])?m?/);
  const hm2 = lower.match(/(\d{1,2})(?::(\d{2}))?\s*([ap])m?\s*(?:to|–|-)\s*(\d{1,2})(?::(\d{2}))?\s*([ap])m?/);
  const noon = /\bnoon\b/.test(lower);
  const evening = /\bevening\b/.test(lower);

  function makeDate(base: Date, h: number, m: number, mer?: string) {
    let hour = h;
    if (mer === 'p' && hour < 12) hour += 12;
    if (mer === 'a' && hour === 12) hour = 0;
    const d = new Date(base);
    d.setHours(hour, m, 0, 0);
    return d;
  }

  let window_start: Date | null = null;
  let window_end: Date | null = null;

  const base = dayRef ?? today;

  if (hm || hm2) {
    const m = hm ?? hm2!;
    const sH = parseInt(m[1]!, 10);
    const sM = m[2] ? parseInt(m[2]!, 10) : 0;
    const eH = parseInt(m[hm ? 3 : 4]!, 10);
    const eM = (hm ? m[4] : m[5]) ? parseInt((hm ? m[4] : m[5])!, 10) : 0;
    const mer = (hm ? m[5] : m[6]) as 'a' | 'p' | undefined;

    window_start = makeDate(base, sH, sM, mer);
    // If no meridian on end, infer from start
    const endMer = mer ?? (sH <= 8 ? 'p' : 'a'); // crude inference
    window_end = makeDate(base, eH, eM, endMer);
  } else if (noon && dayRef) {
    window_start = new Date(dayRef);
    window_start.setHours(12, 0, 0, 0);
    window_end = new Date(window_start);
    window_end.setHours(13, 0, 0, 0);
  } else if (evening && dayRef) {
    window_start = new Date(dayRef);
    window_start.setHours(18, 0, 0, 0);
    window_end = new Date(window_start);
    window_end.setHours(20, 0, 0, 0);
  } else {
    // fallback 2h window from now
    window_start = new Date();
    window_end = new Date();
    window_end.setHours(window_start.getHours() + 2);
  }

  // Title = input stripped of time words
  const cleaned = text
    .replace(/\btoday\b|\btomorrow\b|\bnoon\b|\bevening\b/gi, '')
    .replace(/\d{1,2}(?::\d{2})?\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*([ap])?m?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const title = cleaned.length ? cleaned : 'Hangout';

  return {
    title,
    window_start: window_start.toISOString(),
    window_end: window_end.toISOString(),
  };
}

export default function CreatePage() {
  const [supabase] = useState(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const [what, setWhat] = useState('');
  const [circle, setCircle] = useState<Circle>('Close Friends');

  const [createdId, setCreatedId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session?.user?.email) {
        setUserEmail(data.session.user.email);
      }
      setChecked(true);
    };
    check();
  }, [supabase]);

  if (!checked) return null;
  if (!userEmail)
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Create an Invite</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Please sign in to create invites.
        </p>
      </div>
    );

  const onCreate = async () => {
    const parsed = parseNatural(what);

    // fetch or upsert profile to get host name (best effort)
    let host_name: string | null = null;
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();
      host_name = prof?.display_name ?? null;
    } catch {}

    const insert = {
      title: parsed.title,
      circle: circle as string,
      window_start: parsed.window_start,
      window_end: parsed.window_end,
      host_name,
    };

    const { data, error } = await supabase
      .from('open_invites')
      .insert(insert)
      .select('id')
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setCreatedId(data.id);

    // Build a sharable URL with a short cache-buster so iMessage refetches the OG image
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://nowish.vercel.app';
    const cacheBuster = Math.floor(Date.now() / 1000); // short and stable enough
    const url = `${origin}/invite/${data.id}?v=${cacheBuster}`;
    setShareUrl(url);
  };

  const onShare = async () => {
    if (!shareUrl) return;
    const text = shareUrl;
    if (navigator.share) {
      try {
        await navigator.share({ text, url: shareUrl });
      } catch {
        // ignore
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Link copied!');
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="rounded-md bg-neutral-100 text-neutral-700 px-4 py-2 text-sm">
        You are signed in as <b>{userEmail}</b>
      </div>

      <h1 className="text-4xl font-bold">Create an Invite</h1>

      {!createdId ? (
        <div className="space-y-5">
          <div>
            <label className="block text-lg font-medium mb-2">
              What are you doing?
            </label>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder='e.g. "Park with kids, 3–5p today"'
              value={what}
              onChange={(e) => setWhat(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-lg font-medium mb-2">
              Who’s this for?
            </label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={circle}
              onChange={(e) => setCircle(e.target.value as Circle)}
            >
              <option>Close Friends</option>
              <option>Family</option>
              <option>Coworkers</option>
              <option>Acquaintances</option>
            </select>
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-md bg-black text-white px-4 py-2"
            onClick={onCreate}
            disabled={!what.trim()}
          >
            Create Invite
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xl font-semibold">Invite created!</div>
          <div className="text-sm text-neutral-500">
            Share this link (includes a tiny cache-buster so previews refresh):
          </div>
          <pre className="whitespace-pre-wrap break-words rounded-md bg-neutral-100 p-3 text-sm">
            {shareUrl}
          </pre>
          <div className="flex items-center gap-3">
            <a
              className="underline"
              href={shareUrl ?? '#'}
              target="_blank"
              rel="noreferrer"
            >
              View invite →
            </a>
            <button
              className="rounded-md border px-3 py-1.5"
              onClick={onShare}
            >
              Share
            </button>
            <a className="underline" href="/my">
              See my invites
            </a>
          </div>
        </div>
      )}
    </div>
  );
}