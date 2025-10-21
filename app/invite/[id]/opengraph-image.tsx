import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const alt = 'Nowish Invite';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, { global: { fetch } });

const DEFAULT_TZ = process.env.NEXT_PUBLIC_DEFAULT_TZ || 'America/Chicago';

function fmt(startISO?: string|null, endISO?: string|null, tz = DEFAULT_TZ) {
  if (!startISO || !endISO) return 'Happening soon — tap to RSVP';
  const start = new Date(startISO);
  const end = new Date(endISO);
  const d = new Intl.DateTimeFormat('en-US',{ timeZone: tz, dateStyle:'medium' }).format(start);
  const t = new Intl.DateTimeFormat('en-US',{ timeZone: tz, timeStyle:'short' });
  const same =
    new Intl.DateTimeFormat('en-CA',{ timeZone: tz, dateStyle:'short' }).format(start) ===
    new Intl.DateTimeFormat('en-CA',{ timeZone: tz, dateStyle:'short' }).format(end);
  return same ? `${d} • ${t.format(start)} – ${t.format(end)}` :
                `${d} ${t.format(start)} → ${new Intl.DateTimeFormat('en-US',{ timeZone: tz, dateStyle:'medium' }).format(end)} ${t.format(end)}`;
}

export default async function OgImage({ params }: { params: { id: string } }) {
  const { data: invite } = await supabase
    .from('open_invites')
    .select('title, window_start, window_end')
    .eq('id', params.id)
    .maybeSingle();

  const title = invite?.title || 'Nowish Invite';
  const when = fmt(invite?.window_start, invite?.window_end);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: 56,
          background: 'linear-gradient(135deg,#0f1115 0%,#1c1f25 60%,#0f1115 100%)',
          color: '#fff',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
        }}
      >
        {/* Brand bar */}
        <div style={{ display:'flex', alignItems:'center', gap:16, opacity:.92 }}>
          <div style={{
            width:44, height:44, borderRadius:12,
            background:'linear-gradient(225deg,#6ee7b7 0%,#3b82f6 100%)',
            display:'grid', placeItems:'center', fontWeight:800, fontSize:28, color:'#0b1020'
          }}>N</div>
          <div style={{ fontSize:38, fontWeight:800, letterSpacing:.3 }}>Nowish</div>
        </div>

        {/* Title + when */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <div style={{
            fontSize: 80, lineHeight: 1.05, fontWeight: 900,
            maxWidth: 1000, wordBreak:'break-word'
          }}>
            {title}
          </div>
          <div style={{ fontSize: 36, opacity:.9 }}>{when}</div>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:28, opacity:.8 }}>Tap to RSVP →</div>
          <div style={{ fontSize:28, opacity:.7 }}>nowish.vercel.app</div>
        </div>
      </div>
    ),
    { ...size }
  );
}