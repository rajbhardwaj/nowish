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
  try {
    // Minimal supabase client for read-only fetch
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    // Fetch invite
    const { data } = await supabase
      .from('open_invites')
      .select('id,title,window_start,window_end,host_name')
      .eq('id', params.id)
      .maybeSingle<InviteRow>();

    // Fallbacks if not found
    const title = data?.title ?? 'Nowish Invite';
    const when =
      data ? formatWhen(data.window_start, data.window_end) : 'Happening soon';
    const host = data?.host_name ?? null;

  // Simple but branded preview that works reliably
  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#1a1a1a',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          padding: 40,
        }}
      >
        {/* Nowish branding */}
        <div style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 20, opacity: 0.9 }}>
          Nowish
        </div>
        
        {/* Event title */}
        <div style={{ fontSize: 56, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
          {title}
        </div>
        
        {/* Time */}
        <div style={{ fontSize: 28, opacity: 0.9, marginBottom: 20, textAlign: 'center' }}>
          {when}
        </div>
        
        {/* Call to action */}
        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ffffff' }}>
          Tap to RSVP →
        </div>
      </div>
    ),
    { width: size.width, height: size.height }
  );
  } catch (error) {
    console.error('OpenGraph image generation failed:', error);
    // Fallback to simple image
    return new ImageResponse(
      (
        <div
          style={{
            width: size.width,
            height: size.height,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 700 }}>Nowish</div>
          <div style={{ fontSize: 24, opacity: 0.9 }}>Join the invite</div>
        </div>
      ),
      { width: size.width, height: size.height }
    );
  }
}