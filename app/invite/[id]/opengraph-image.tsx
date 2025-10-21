import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const alt = 'Nowish Invite';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { global: { fetch } }
);

export default async function OgImage({ params }: { params: { id: string } }) {
  const { data: invite } = await supabaseServer
    .from('open_invites')
    .select('title, window_start, window_end')
    .eq('id', params.id)
    .maybeSingle();

  const title = invite?.title || 'Nowish Invite';
  const when =
    invite?.window_start && invite?.window_end
      ? `${new Date(invite.window_start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} — ${new Date(
          invite.window_end
        ).toLocaleTimeString([], { timeStyle: 'short' })}`
      : 'Join this activity';

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