// app/api/og/[id]/route.tsx
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// --- Supabase (server-side) ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { global: { fetch } }
);

const DEFAULT_TZ = process.env.NEXT_PUBLIC_DEFAULT_TZ || 'America/Chicago';

// --- Helpers ---
function fmtWhen(startISO?: string | null, endISO?: string | null, tz = DEFAULT_TZ) {
  if (!startISO || !endISO) return 'Happening soon';
  const start = new Date(startISO);
  const end = new Date(endISO);

  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start);

  const t = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
  const sameDay =
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(start) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(end);

  return sameDay ? `${day} • ${t.format(start)} – ${t.format(end)}`
                 : `${day} ${t.format(start)} → ${new Intl.DateTimeFormat('en-US', {
                     timeZone: tz,
                     month: 'short',
                     day: 'numeric',
                   }).format(end)} ${t.format(end)}`;
}

// --- Route handler (Next 15 signature: params is a Promise) ---
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const { data: invite } = await supabase
    .from('open_invites')
    .select('title, window_start, window_end')
    .eq('id', id)
    .maybeSingle();

  const title = invite?.title || 'Nowish Invite';
  const when = fmtWhen(invite?.window_start, invite?.window_end);

  // --- Styles: brand small, title big, when medium, single CTA strip at bottom ---
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg,#0f1115 0%,#1c1f25 60%,#0f1115 100%)',
          color: '#fff',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        {/* Padding frame */}
        <div style={{ padding: '56px 56px 0 56px' }}>
          {/* Brand (small) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: 0.92 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(225deg,#6ee7b7 0%,#3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 24,
                color: '#0b1020',
              }}
            >
              N
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 0.3 }}>Nowish</div>
          </div>

          {/* Main content */}
          <div style={{ marginTop: 28, maxWidth: 1000 }}>
            <div
              style={{
                fontSize: 86,
                lineHeight: 1.04,
                fontWeight: 900,
                wordBreak: 'break-word',
                marginBottom: 18,
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 40, opacity: 0.85 }}>{when}</div>
          </div>
        </div>

        {/* CTA strip (single, not duplicated) */}
        <div
          style={{
            width: '100%',
            height: 110,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 56px',
          }}
        >
          <div style={{ fontSize: 30, opacity: 0.9 }}>Tap to RSVP →</div>
          <div style={{ fontSize: 28, opacity: 0.7 }}>nowish.vercel.app</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=86400',
      },
    }
  );
}