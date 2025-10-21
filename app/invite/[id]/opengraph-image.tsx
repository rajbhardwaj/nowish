// app/invite/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

type InviteRow = {
  id: string;
  title: string;
  window_start: string; // ISO string in DB
  window_end: string;   // ISO string in DB
  host_name: string | null;
};

function formatWhen(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start);

  const timeFmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const startTime = timeFmt.format(start);
  const endTime = timeFmt.format(end);

  return sameDay
    ? `${dateFmt} • ${startTime} — ${endTime}`
    : `${dateFmt} • ${startTime} → ${new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(end)}`;
}

export default async function Image({
  params,
}: {
  params: { id: string };
}) {
  // Minimal supabase client for read-only fetch
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  // Fetch invite
  const { data, error } = await supabase
    .from('open_invites')
    .select('id,title,window_start,window_end,host_name')
    .eq('id', params.id)
    .maybeSingle<InviteRow>();

  // Fallbacks if not found
  const title = data?.title ?? 'Nowish Invite';
  const when =
    data ? formatWhen(data.window_start, data.window_end) : 'Happening soon';
  const host = data?.host_name ?? null;

  // Simple dark card
  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 56,
          background:
            'radial-gradient(1200px 600px at 0% 0%, #0e1628 0%, #0b1220 40%, #0a0f1a 100%)',
          color: 'white',
          fontFamily:
            'ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji',
        }}
      >
        {/* Header */}
        <div style={{ fontSize: 28, opacity: 0.8 }}>Nowish</div>

        {/* Title + time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              fontSize: 74,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 32, opacity: 0.9 }}>{when}</div>
          {host ? (
            <div style={{ fontSize: 28, opacity: 0.8 }}>from {host}</div>
          ) : null}
        </div>

        {/* Footer row */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 28, opacity: 0.9 }}>Tap to RSVP →</div>
          <div style={{ fontSize: 24, opacity: 0.6 }}>nowish.vercel.app</div>
        </div>
      </div>
    ),
    { width: size.width, height: size.height }
  );
}