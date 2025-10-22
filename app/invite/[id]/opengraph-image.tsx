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

  // Use the same timezone as the create flow (undefined = user's local timezone)
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  
  const startFormatted = new Intl.DateTimeFormat(undefined, opts).format(start);
  const endFormatted = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(end);
  
  return `${startFormatted} to ${endFormatted}`;
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

  // Clean, readable preview with better contrast
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
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 60,
        }}
      >
        {/* Nowish branding */}
        <div style={{ 
          fontSize: 48, 
          fontWeight: 'bold', 
          marginBottom: 40, 
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          Nowish
        </div>
        
        {/* Event title */}
        <div style={{ 
          fontSize: 96, 
          fontWeight: 'bold', 
          marginBottom: 32, 
          textAlign: 'center',
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          lineHeight: 1.0
        }}>
          {title}
        </div>
        
        {/* Time */}
        <div style={{ 
          fontSize: 48, 
          marginBottom: 32, 
          textAlign: 'center',
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          fontWeight: '600'
        }}>
          {when}
        </div>
        
        {/* Tagline */}
        <div style={{ 
          fontSize: 32, 
          marginBottom: 40, 
          textAlign: 'center', 
          fontStyle: 'italic',
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          fontWeight: '500'
        }}>
          Built for the moment — to see who&apos;s in.
        </div>
        
        {/* Call to action */}
        <div style={{ 
          fontSize: 36, 
          fontWeight: 'bold', 
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          background: 'rgba(255,255,255,0.2)',
          padding: '20px 40px',
          borderRadius: '16px',
          border: '2px solid rgba(255,255,255,0.3)'
        }}>
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