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
  timezone: string | null;
};


function formatWhen(startISO: string, endISO: string, timezone?: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);

  // Use provided timezone or default to Pacific time
  const tz = timezone || 'America/Los_Angeles';
  
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start);

  const t = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const startTime = t.format(start);
  const endTime = t.format(end);
  
  // Format times according to style guide (remove :00 minutes)
  const formatTime = (time: string) => time.replace(':00', '');
  const startFormatted = formatTime(startTime);
  const endFormatted = formatTime(endTime);
  
  return `${day}, ${startFormatted} – ${endFormatted}`;
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
      .select('id,title,window_start,window_end,host_name,timezone')
      .eq('id', id)
      .maybeSingle<InviteRow>();

    // Fallbacks if not found
    const title = data?.title ?? 'Nowish Invite';
    const when = data ? formatWhen(data.window_start, data.window_end, data.timezone || undefined) : 'Happening soon';
    const hostName = data?.host_name ?? 'Someone';
    
    // Use the same emoji detection logic as the RSVP card
    const detectEmojiFromTitle = (title: string): string => {
      const lowerTitle = title.toLowerCase();
      
      // Check for work context
      const workContextKeywords = ['office', 'work', 'meeting', 'coworker', 'colleague', 'team', 'project', 'conference'];
      const isWorkContext = workContextKeywords.some(keyword => lowerTitle.includes(keyword));
      
      // Comprehensive emoji mappings
      const EMOJI_MAPPINGS = [
        // Sports & Fitness
        { keywords: ['table tennis', 'ping pong'], emoji: '🏓' },
        { keywords: ['tennis'], emoji: '🎾' },
        { keywords: ['gym', 'gymnasium', 'workout', 'work out', 'exercising', 'exercise'], emoji: '💪' },
        { keywords: ['running', 'run', 'jog', 'jogging', 'marathon'], emoji: '🏃' },
        { keywords: ['hiking', 'hike', 'trail'], emoji: '🥾' },
        { keywords: ['swimming', 'swim', 'pool'], emoji: '🏊' },
        { keywords: ['basketball', 'hoops', 'lakers', 'warriors', 'celtics', 'heat', 'bulls', 'knicks', 'nets', '76ers', 'bucks', 'suns', 'nuggets', 'mavericks', 'clippers', 'spurs'], emoji: '🏀' },
        { keywords: ['football', 'chiefs', 'cowboys', 'patriots', 'packers', 'steelers', '49ers', 'bills', 'dolphins', 'ravens', 'bengals', 'eagles', 'giants', 'jets', 'bears', 'lions'], emoji: '🏈' },
        { keywords: ['soccer', 'futbol'], emoji: '⚽' },
        { keywords: ['cycling', 'bike', 'biking', 'bicycle'], emoji: '🚴' },
        { keywords: ['yoga', 'meditation'], emoji: '🧘' },
        { keywords: ['golf', 'golfing'], emoji: '⛳' },
        { keywords: ['climbing', 'rock climbing', 'bouldering'], emoji: '🧗' },

        // Food & Drinks (with work context override)
        { keywords: ['coffee', 'cafe', 'latte', 'espresso', 'cappuccino'], emoji: '☕' },
        { keywords: ['dinner', 'dining'], emoji: '🍽️' },
        { keywords: ['lunch'], emoji: '🥪', workContext: '🥗' }, // Different emoji for work lunch
        { keywords: ['brunch', 'breakfast'], emoji: '🥞' },
        { keywords: ['game + drinks', 'game and drinks'], emoji: '🏈' },
        { keywords: ['drinks', 'cocktails', 'cocktail', 'bar', 'happy hour'], emoji: '🍸' },
        { keywords: ['beer', 'brewery', 'brewing'], emoji: '🍺' },
        { keywords: ['wine', 'winery', 'tasting'], emoji: '🍷' },
        { keywords: ['pizza'], emoji: '🍕' },
        { keywords: ['sushi'], emoji: '🍣' },
        { keywords: ['ice cream', 'dessert'], emoji: '🍦' },
        { keywords: ['cake', 'birthday cake'], emoji: '🎂' },

        // Entertainment
        { keywords: ['movie', 'cinema', 'film', 'movies', 'movie night'], emoji: '🎬' },
        { keywords: ['concert', 'music', 'live music', 'gig', 'show'], emoji: '🎵' },
        { keywords: ['party', 'celebration'], emoji: '🎉' },
        { keywords: ['game', 'gaming', 'board game', 'video game'], emoji: '🎮' },
        { keywords: ['theater', 'theatre', 'play', 'drama'], emoji: '🎭' },
        { keywords: ['museum', 'exhibition', 'gallery'], emoji: '🏛️' },
        { keywords: ['book', 'reading', 'book club'], emoji: '📚' },

        // Social & Activities
        { keywords: ['walk', 'walking', 'stroll'], emoji: '🚶' },
        { keywords: ['park with kids', 'park w/ kids'], emoji: '🌳👶🏽' },
        { keywords: ['park', 'outdoor', 'picnic'], emoji: '🌳' },
        { keywords: ['beach', 'ocean', 'sea'], emoji: '🏖️' },
        { keywords: ['shopping', 'mall', 'store'], emoji: '🛍️' },
        { keywords: ['spa', 'massage', 'relaxation'], emoji: '🧖' },
        { keywords: ['road trip', 'driving'], emoji: '🚗' },
        { keywords: ['travel', 'vacation'], emoji: '✈️' },
        { keywords: ['study', 'learning', 'class'], emoji: '📖' },
        { keywords: ['work', 'office', 'meeting'], emoji: '💼' },
      ];
      
              // Find matching emoji with word boundary matching
              for (const mapping of EMOJI_MAPPINGS) {
                for (const keyword of mapping.keywords) {
                  const lowerKeyword = keyword.toLowerCase();
                  // Use word boundaries for single words, or exact phrase matching for multi-word phrases
                  const regex = lowerKeyword.includes(' ') 
                    ? new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
                    : new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
                  
                  if (regex.test(lowerTitle)) {
                    // Use work context emoji if available and in work context
                    if (isWorkContext && mapping.workContext) {
                      return mapping.workContext;
                    }
                    return mapping.emoji;
                  }
                }
              }
      
      return '📅'; // Default calendar emoji
    };

    const emoji = detectEmojiFromTitle(title);
    const cleanTitle = title.replace(/^[^\w\s]*\s*/, '');

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
            background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #f3e8ff 100%)',
            position: 'relative',
          }}
        >
          {/* Card container */}
          <div
            style={{
              width: 800,
              height: 500,
              background: 'white',
              borderRadius: '24px',
              padding: '60px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle decorative pattern */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, transparent 50%, rgba(147, 51, 234, 0.05) 100%)',
              }}
            />
            
            {/* Content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Emoji at top */}
              <div
                style={{
                  fontSize: '80px',
                  marginBottom: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {emoji || '📅'}
              </div>
              
              {/* Host line */}
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: '400',
                  color: '#64748b',
                  marginBottom: '12px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {hostName} is heading to…
              </div>
              
              {/* Main title */}
              <div
                style={{
                  fontSize: '64px',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '20px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {cleanTitle}
              </div>
              
              <div
                style={{
                  fontSize: '32px',
                  color: '#64748b',
                  marginBottom: '16px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {when}
              </div>
              
              <div
                style={{
                  fontSize: '24px',
                  fontStyle: 'italic',
                  color: '#64748b',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                If you&apos;re free, swing by ✨
              </div>
            </div>
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