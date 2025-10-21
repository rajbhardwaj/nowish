'use client';

import { useState } from 'react';
import { createClient, type User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Safely derive a display name from the Supabase user object without `any`
function getHostName(user: User | null): string {
  if (!user) return 'A friend';

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const fullName =
    typeof meta.full_name === 'string' ? meta.full_name : undefined;
  const name =
    typeof meta.name === 'string' ? meta.name : undefined;

  if (fullName && fullName.trim().length > 0) return fullName.trim();
  if (name && name.trim().length > 0) return name.trim();

  if (typeof user.email === 'string' && user.email.includes('@')) {
    const left = user.email.split('@')[0]!;
    if (left.trim().length > 0) return left.trim();
  }
  return 'A friend';
}

// Parse a local datetime string to ISO, guarding against invalid input
function toISO(dtLocal: string): string {
  const d = new Date(dtLocal);
  if (isNaN(d.getTime())) {
    // Fallback: now
    return new Date().toISOString();
  }
  return d.toISOString();
}

export default function CreateInvitePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(''); // yyyy-MM-ddTHH:mm
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleCreateInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // Current user
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userRes?.user ?? null;

      const hostName = getHostName(user);

      // Times → ISO
      const startISO = toISO(startTime);
      const endISO = toISO(endTime);

      // Insert invite
      const { data, error } = await supabase
        .from('open_invites')
        .insert({
          title,
          window_start: startISO,
          window_end: endISO,
          creator_id: user?.id ?? null,
          host_name: hostName, // 👈 store the host
        })
        .select('id')
        .single();

      if (error) throw error;

      router.push(`/invite/${data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      setErrorMsg(msg || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto mt-12 px-4">
      <h1 className="text-2xl font-semibold mb-6">Create an Invite</h1>

      <form onSubmit={handleCreateInvite} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Park with kids, pickup soccer, coffee…"
            className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        {errorMsg && (
          <div className="text-red-600 text-sm">{errorMsg}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create Invite'}
        </button>
      </form>
    </main>
  );
}