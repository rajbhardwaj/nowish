// app/invite/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'Nowish Invite';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function fmtRange(startISO?: string | null, endISO?: string | null) {
  if (!startISO || !endISO) return 'Happening soon';
  const start = new Date(startISO);
  const end = new Date(endISO);
  const day = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const st = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const et = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} • ${st} – ${et}`;
}

// 🔴 REQUIRED: default export that returns an ImageResponse
export default async function OpengraphImage({
  params,
}: {
  params: { id: string };
}) {
  // Fetch invite (host_name supported)
  const { data: invite } = await supabase
    .from('open_invites')
    .select('title, window_start, window_end, host_name, creator_id')
    .eq('id', params.id)
    .maybeSingle();

  const title = invite?.title ?? 'Invite';
  const when = fmtRange(invite?.window_start, invite?.window_end);

  // Prefer stored host_name; fallback to profiles if present; finally “A friend”
  let host = invite?.host_name || 'A friend';
  if (!invite?.host_name && invite?.creator_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, full_name, nickname')
      .eq('id', invite.creator_id)
      .maybeSingle();
    host =
      profile?.display_name ||
      profile?.full_name ||
      profile?.nickname ||
      host;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: 'flex',
          background:
            'linear-gradient(145deg, #12161B 0%, #131A22 40%, #0E141A 100%)',
          color: '#EAF2FF',
          padding: 48,
          fontFamily:
            'ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
          {/* Brand + From */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background:
                  'conic-gradient(from 220deg at 50% 50%, #66B2FF, #4F86FF 35%, #7A5AF8 70%, #66B2FF)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 28, opacity: 0.95 }}>Nowish</div>
              <div style={{ fontSize: 22, opacity: 0.8 }}>From {host}</div>
            </div>
          </div>

          {/* Title + time */}
          <div>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>
              {title}
            </div>
            <div style={{ marginTop: 12, fontSize: 28, opacity: 0.9 }}>
              {when}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, opacity: 0.9 }}>
            <div>Tap to RSVP →</div>
            <div style={{ opacity: 0.65 }}>nowish.vercel.app</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}