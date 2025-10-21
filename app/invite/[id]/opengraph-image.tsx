/* app/invite/[id]/opengraph-image.tsx */
import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

// Edge is faster for crawlers like Apple Messages/Twitter
export const runtime = 'edge';
export const alt = 'Nowish Invite';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ---- tiny helpers ----
const timeout = (ms: number) =>
  new Promise((_r, rej) => setTimeout(() => rej(new Error('timeout')), ms));

function fmtWhen(start?: string | null, end?: string | null) {
  if (!start || !end) return 'Happening soon';
  const s = new Date(start);
  const e = new Date(end);

  const sameDay = s.toDateString() === e.toDateString();
  const fmtDay = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(s);

  const fmtTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const sT = fmtTime.format(s);
  const eT = fmtTime.format(e);

  if (sameDay) return `${fmtDay} • ${sT} — ${eT}`;
  const eDay = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(e);
  return `${fmtDay} ${sT} → ${eDay} ${eT}`;
}

function card({
  title,
  when,
  host,
}: {
  title: string;
  when: string;
  host?: string | null;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background:
            'linear-gradient(135deg, rgb(12,16,24) 0%, rgb(22,28,40) 100%)',
          color: 'white',
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI',
          padding: '64px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: '100%',
            height: '100%',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 30,
                opacity: 0.9,
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              <span>{when}</span>
              {host ? (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>from {host}</span>
                </>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 28,
              opacity: 0.9,
            }}
          >
            <span>Tap to RSVP →</span>
            <span style={{ opacity: 0.6 }}>nowish.vercel.app</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}

export default async function OpengraphImage({
  params,
}: {
  params: { id: string };
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon);

  let title = 'Nowish Invite';
  let when = 'Happening soon';
  let host: string | null | undefined = null;

  try {
    // keep the route snappy; bail to generic after ~1200ms
    const { data } = (await Promise.race([
      supabase
        .from('open_invites')
        .select('title, window_start, window_end, host_name')
        .eq('id', params.id)
        .maybeSingle(),
      timeout(1200),
    ])) as { data?: any };

    if (data) {
      title = data.title || title;
      when = fmtWhen(data.window_start, data.window_end);
      host = data.host_name;
    }
  } catch {
    // swallow – we'll render a generic card
  }

  return card({ title, when, host });
}