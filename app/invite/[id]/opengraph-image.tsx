// app/invite/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

type InviteRow = {
  id: string;
  title: string;
  window_start: string;
  window_end: string;
  host_name: string | null;
};

function formatTimeDisplay(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  if (hours === 0 && minutes === 0) return 'Midnight';
  if (hours === 12 && minutes === 0) return 'Noon';
  
  const timeString = date.toLocaleTimeString(undefined, { 
    hour: 'numeric', 
    minute: minutes === 0 ? undefined : '2-digit'
  });
  
  return timeString;
}

function formatWhen(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);

  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  
  const dateFormatted = new Intl.DateTimeFormat(undefined, opts).format(start);
  const startTime = formatTimeDisplay(start);
  const endTime = formatTimeDisplay(end);
  
  return `${dateFormatted}, ${startTime} – ${endTime}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;
    
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
      .eq('id', id)
      .maybeSingle<InviteRow>();

    // Fallbacks if not found
    const title = data?.title ?? 'Nowish Invite';
    const when = data ? formatWhen(data.window_start, data.window_end) : 'Happening soon';
    const hostName = data?.host_name ?? 'Someone';
    
    // Extract emoji from title if present
    const emojiMatch = title.match(/^([^\w\s])\s+(.+)$/);
    const emoji = emojiMatch ? emojiMatch[1] : '';
    const cleanTitle = emojiMatch ? emojiMatch[2] : title;

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #ffffff 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ fontSize: 52, color: '#ffffff', display: 'flex', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '600' }}>
            {emoji && <span style={{ fontSize: 58, marginRight: 14 }}>{emoji}</span>}
            {hostName} would love to see you at {cleanTitle}
          </div>
          <div style={{ fontSize: 44, color: '#ffffff', display: 'flex', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '500' }}>
            {when}
          </div>
          <div style={{ fontSize: 36, color: '#ffffff', display: 'flex', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '500' }}>
            Come if you&apos;re free ✨
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch {
    console.error('OpenGraph image generation failed');
    
    // Fallback image
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontFamily: 'system-ui',
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 700 }}>Nowish</div>
          <div style={{ fontSize: 24, opacity: 0.9 }}>Join the invite</div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}