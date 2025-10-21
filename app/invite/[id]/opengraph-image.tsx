// app/invite/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const alt = 'Nowish Invite';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DEFAULT_TZ = process.env.NEXT_PUBLIC_DEFAULT_TZ || 'America/Los_Angeles';

function formatWhen(startISO?: string | null, endISO?: string | null, tz = DEFAULT_TZ) {
  if (!startISO || !endISO) return 'Happening soon';
  const start = new Date(startISO);
  const end = new Date(endISO);

  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', month: 'short', day: 'numeric'
  }).format(start);

  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit'
  });

  const sameDay =
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(start) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(end);

  return sameDay
    ? `${day} • ${timeFmt.format(start)} – ${timeFmt.format(end)}`
    : `${day} ${timeFmt.format(start)} → ${new Intl.DateTimeFormat('en-US', {
        timeZone: tz, month: 'short', day: 'numeric'
      }).format(end)} ${timeFmt.format(end)}`;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // 1) Get the invite
  const { data: invite } = await supabase
    .from('open_invites')
    .select('id, title, window_start, window_end, creator_id, host_name')
    .eq('id', params.id)
    .maybeSingle();

  if (!invite) {
    // Minimal fallback image so the card still renders
    return new ImageResponse(
      (
        <div
          style={{
            width: size.width,
            height: size.height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            color: '#fff',
            fontSize: 48,
            fontWeight: 700,
            padding: 60,
          }}
        >
          Nowish Invite
        </div>
      ),
      { ...size }
    );
  }

  // 2) Look up host name from profiles (fallback to “A friend”)
 let host = invite?.host_name || 'A friend';

if (!invite?.host_name && invite?.creator_id) {
  // (optional fallback to profiles as before)
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, full_name, nickname')
    .eq('id', invite.creator_id)
    .maybeSingle();
  host = host ||
    profile?.display_name ||
    profile?.full_name ||
    profile?.nickname ||
    'A friend';
}

  const title = invite.title || 'Nowish Invite';
  const when = formatWhen(invite.window_start, invite.window_end);

  // 3) Render the image
  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'radial-gradient(1200px 630px at -200px -100px, #223045 0%, #111827 55%)',
          color: '#e5e7eb',
          padding: 56,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
        }}
      >
        {/* Top: app badge + “From {host}” */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#60a5fa',
              color: '#0b1220',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 28,
            }}
          >
            N
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
              Nowish
            </span>
            <span style={{ fontSize: 20, color: '#9ca3af' }}>
              From {host}
            </span>
          </div>
        </div>

        {/* Middle: title + time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              fontSize: 60,
              lineHeight: 1.1,
              color: '#ffffff',
              fontWeight: 800,
              letterSpacing: -0.5,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 28, color: '#c7d2fe' }}>{when}</div>
        </div>

        {/* Bottom row: CTA + URL */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            width: '100%',
          }}
        >
          <div style={{ fontSize: 28, color: '#cbd5e1' }}>Tap to RSVP →</div>
          <div style={{ fontSize: 26, color: '#9ca3af' }}>nowish.vercel.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}