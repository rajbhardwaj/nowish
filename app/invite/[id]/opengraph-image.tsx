/* app/invite/[id]/opengraph-image.tsx */
import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge'; // faster for crawlers
export const alt = 'Nowish Invite';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DEFAULT_TZ = process.env.NEXT_PUBLIC_DEFAULT_TZ || 'America/Los_Angeles';

function formatWhen(startISO?: string | null, endISO?: string | null, tz = DEFAULT_TZ) {
  if (!startISO || !endISO) return 'Happening soon';
  const start = new Date(startISO);
  const end = new Date(endISO);

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', month: 'short', day: 'numeric'
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit'
  });

  const sameDay =
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(start) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(end);

  return sameDay
    ? `${dateFmt.format(start)} • ${timeFmt.format(start)} – ${timeFmt.format(end)}`
    : `${dateFmt.format(start)} ${timeFmt.format(start)} → ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}

export default async function OG({ params }: { params: { id: string } }) {
  // Fetch invite (public table)
  const { data: invite } = await supabase
    .from('open_invites')
    .select('title, window_start, window_end')
    .eq('id', params.id)
    .maybeSingle();

  const title = invite?.title || 'Nowish Invite';
  const when = formatWhen(invite?.window_start, invite?.window_end);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0F141B 0%, #1C2430 100%)',
          padding: '56px',
          color: '#fff',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
        }}
      >
        {/* Header */}
        <div style={{ fontSize: 36, opacity: 0.9 }}>Nowish</div>

        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.06 }}>
            {title}
          </div>
          <div style={{ fontSize: 36, opacity: 0.9 }}>{when}</div>
        </div>

        {/* Footer CTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 32, opacity: 0.95 }}>
          <div>Tap to RSVP →</div>
          <div>nowish.vercel.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}