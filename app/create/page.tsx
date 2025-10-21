// app/create/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CreatePage() {
  const [title, setTitle] = useState('');
  const [circle, setCircle] = useState('Family');
  const [hostName, setHostName] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email ?? null;
      setUserEmail(email);
      // Prefer profile name if you’re storing it
      // setHostName(profileName || email?.split('@')[0] || '');
      setHostName(email ? email.split('@')[0] : '');
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);

    // parse natural language window (server or client—keeping client here)
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://nowish.vercel.app';
    const res = await fetch('/api/parse-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: title }),
    });
    const { window_start, window_end } = await res.json();

    const { data: sessionData } = await supabase.auth.getSession();
    const creatorId = sessionData.session?.user?.id;
    if (!creatorId) {
      alert('Please log in first.');
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from('open_invites')
      .insert([
        {
          title: title.trim(),
          circle,
          host_name: hostName || null,
          window_start,
          window_end,
          creator_id: creatorId,
        },
      ])
      .select('id')
      .single();

    setSubmitting(false);

    if (error || !data) {
      console.error(error);
      alert('Could not create invite.');
      return;
    }

    // Go to the invite
    window.location.href = `/invite/${data.id}`;
  }

  return (
    <div className="space-y-6">
      {userEmail && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          You’re signed in as <strong>{userEmail}</strong>
        </div>
      )}

      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Create an invite</h1>
        <p className="text-slate-600">Write it how you’d text it. We’ll parse the time.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-800">
            What are you doing?
          </label>
          <input
            id="title"
            type="text"
            placeholder="Park with kids, 3–5pm today"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-indigo-500 focus:shadow-md"
            required
          />
        </div>

        <div>
          <label htmlFor="circle" className="mb-1 block text-sm font-medium text-slate-800">
            Who’s this for?
          </label>
          <select
            id="circle"
            value={circle}
            onChange={(e) => setCircle(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:shadow-md"
          >
            <option>Family</option>
            <option>Close friends</option>
            <option>Coworkers</option>
          </select>
        </div>

        <div>
          <label htmlFor="host" className="mb-1 block text-sm font-medium text-slate-800">
            Your name (shows on invite)
          </label>
          <input
            id="host"
            type="text"
            placeholder="Raj"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:shadow-md"
          />
          <p className="mt-1 text-xs text-slate-500">Optional. We’ll default to your email handle.</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-center text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700 active:translate-y-px disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Invite'}
        </button>
      </form>
    </div>
  );
}