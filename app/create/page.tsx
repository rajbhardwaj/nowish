'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as chrono from 'chrono-node';

type Circle = 'Family' | 'Close Friends' | 'Coworkers';

type ParsedWindow = {
  title: string;
  start: Date;
  end: Date;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nowish.vercel.app';

export default function CreateInvitePage() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [rawText, setRawText] = useState('');
  const [circle, setCircle] = useState<Circle>('Family');
  const [hostName, setHostName] = useState(''); // defaults later
  const [creating, setCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  // Load session info so we can attach creator_id and default hostName
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email ?? null;
      const uid = data.session?.user.id ?? null;
      setSessionEmail(email);
      setUserId(uid);

      if (!hostName && email) {
        const handle = email.split('@')[0];
        setHostName(handle);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Parse times/title as user types
  const parsed: ParsedWindow | null = useMemo(() => {
    if (!rawText.trim()) return null;

    const ref = new Date();
    const results = chrono.parse(rawText, ref, { forwardDate: true });

    // title = rawText minus the time chunk if we can detect it
    let title = rawText.trim();

    if (results.length) {
      const r = results[0];
      const start = r.start?.date() ?? ref;
      const end =
        r.end?.date() ??
        new Date(start.getTime() + 60 * 60 * 1000); // +1h default

      // Try to drop the matched time text from title
      try {
        const before = rawText.slice(0, r.index).trim();
        const after = rawText.slice(r.index + r.text.length).trim();
        const guess = [before, after].filter(Boolean).join(' ');
        if (guess) title = guess;
      } catch {
        /* noop */
      }

      return { title: title || 'Hang', start, end };
    }

    // Fallback: no parse → just use now +1h
    return {
      title: title || 'Hang',
      start: ref,
      end: new Date(ref.getTime() + 60 * 60 * 1000),
    };
  }, [rawText]);

  async function handleCreate() {
    if (!userId) {
      alert('Please sign in again.');
      return;
    }
    if (!parsed) {
      alert('Tell us what & when (e.g. “Park with kids, 3–5p today”).');
      return;
    }

    setCreating(true);
    try {
      const { title, start, end } = parsed;

      // Insert into open_invites. Adjust column names if yours differ.
      const { data, error } = await supabase
        .from('open_invites')
        .insert({
          title,
          window_start: start.toISOString(),
          window_end: end.toISOString(),
          circle,
          host_name: hostName || sessionEmail?.split('@')[0] || 'Me',
          creator_id: userId, // ← fixes the NOT NULL you saw earlier
        })
        .select('id')
        .single();

      if (error) throw error;

      const url = `${BASE}/invite/${data.id}`;
      setCreatedUrl(url);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Could not create invite.';
      alert(msg);
    } finally {
      setCreating(false);
    }
  }

  // Nicely formatted preview line (for your own confidence while typing)
  const previewLine = useMemo(() => {
    if (!parsed) return '—';
    const start = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed.start);
    const end = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed.end);
    return `${parsed.title} — ${start} to ${end}`;
  }, [parsed]);

  return (
    <div className="nw-container">
      {sessionEmail && (
        <div className="nw-banner">You’re signed in as <strong>{sessionEmail}</strong></div>
      )}

      <h1 style={{ fontSize: 44, lineHeight: 1.1, marginBottom: 14 }}>
        Create an invite
      </h1>

      <p style={{ fontSize: 18, color: 'var(--muted)', marginBottom: 16 }}>
        Write it how you’d text it. We’ll parse the time.
      </p>

      <div className="nw-card nw-stack" role="form" aria-labelledby="create-invite">
        {/* What */}
        <div>
          <label htmlFor="what" className="nw-label">What are you doing?</label>
          <input
            id="what"
            className="nw-input"
            placeholder='e.g. "Park with kids, 3–5p today"'
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            autoCapitalize="sentences"
            autoComplete="off"
          />
          <div className="nw-help">Preview: {previewLine}</div>
        </div>

        {/* Circle */}
        <div>
          <label htmlFor="circle" className="nw-label">Who’s this for?</label>
          <select
            id="circle"
            className="nw-select"
            value={circle}
            onChange={(e) => setCircle(e.target.value as Circle)}
          >
            <option>Family</option>
            <option>Close Friends</option>
            <option>Coworkers</option>
          </select>
        </div>

        {/* Host display name */}
        <div>
          <label htmlFor="host" className="nw-label">Your name (shows on invite)</label>
          <input
            id="host"
            className="nw-input"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="e.g. Raj"
            aria-describedby="host-help"
          />
          <div id="host-help" className="nw-help">
            Optional — defaults to your email handle.
          </div>
        </div>

        {/* Actions */}
        <div className="nw-actions">
          <button
            className="nw-btn"
            onClick={handleCreate}
            disabled={!parsed || creating}
          >
            {creating ? 'Creating…' : 'Create Invite'}
          </button>

          {createdUrl && (
            <span className="nw-inline">
              Link ready:
              <code className="nw-kbd">{createdUrl}</code>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}