import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const alt = 'Nowish Invite';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseKey, { global: { fetch } });

const DEFAULT_TZ = process.env.NEXT_PUBLIC_DEFAULT_TZ || 'America/Chicago';

function formatWindow(startISO?: string | null, endISO?: string | null, tz = DEFAULT_TZ) {
  if (!startISO || !endISO) return 'Join this activity';
  const start = new Date(startISO);
  const end = new Date(endISO);

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    dateStyle: 'medium',
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeStyle: 'short',
  });

  const sameDay =
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(start) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(end);

  const datePart = dateFmt.format(start);
  const startTime = timeFmt.format(start);
  const endTime = timeFmt.format(end);

  return sameDay ? `${datePart}, ${startTime} — ${endTime}` : `${datePart} ${startTime} → ${dateFmt.format(end)} ${endTime}`;
}

export default async function OgImage({ params }: { params: { id: string } }) {
  const { data: invite } = await supabaseServer
    .from('open_invites')
    .select('title, window_start, window_end')
    .eq('id', params.id)
    .maybeSingle();

  const title = invite?.title || 'Nowish Invite';
  const when = formatWindow(invite?.window_start, invite?.window_end);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(135deg, #111 0%, #333 100%)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        <div style={{ fontSize: 42, opacity: 0.9 }}>Nowish</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 32, opacity: 0.9 }}>{when}</div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.7 }}>nowish.vercel.app</div>
      </div>
    ),
    { ...size }
  );
}