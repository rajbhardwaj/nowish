// app/create/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import * as chrono from 'chrono-node';

type Circle = 'Family' | 'Close Friends' | 'Coworkers';

type Parsed = {
  title: string;
  start: Date | null;
  end: Date | null;
  whenText: string | null;
  emoji: string | null;
  timeMovedToTomorrow: boolean;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Comprehensive emoji mapping with variations and context awareness
const EMOJI_MAPPINGS = [
  // Sports & Fitness
  { keywords: ['table tennis', 'ping pong'], emoji: '🏓' },
  { keywords: ['tennis'], emoji: '🎾' },
  { keywords: ['gym', 'gymnasium', 'workout', 'work out', 'exercising', 'exercise'], emoji: '💪' },
  { keywords: ['running', 'run', 'jog', 'jogging', 'marathon', 'short run'], emoji: '🏃' },
  { keywords: ['hiking', 'hike', 'trail'], emoji: '🥾' },
  { keywords: ['swimming', 'swim', 'pool'], emoji: '🏊' },
  { keywords: ['basketball', 'hoops', 'lakers', 'warriors', 'celtics', 'heat', 'bulls', 'knicks', 'nets', '76ers', 'bucks', 'suns', 'nuggets', 'mavericks', 'clippers', 'spurs'], emoji: '🏀' },
  { keywords: ['football', 'chiefs', 'cowboys', 'patriots', 'packers', 'steelers', '49ers', 'bills', 'dolphins', 'ravens', 'bengals', 'eagles', 'giants', 'jets', 'bears', 'lions'], emoji: '🏈' },
  { keywords: ['soccer', 'futbol'], emoji: '⚽' },
  { keywords: ['cycling', 'bike', 'biking', 'bicycle'], emoji: '🚴' },
  { keywords: ['yoga', 'meditation'], emoji: '🧘' },
  { keywords: ['golf', 'golfing'], emoji: '⛳' },
  { keywords: ['climbing', 'rock climbing', 'bouldering'], emoji: '🧗' },
  { keywords: ['pickleball'], emoji: '🏓' },

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
  { keywords: ['quick bite'], emoji: '🌯' },

  // Entertainment
  { keywords: ['movie', 'cinema', 'film', 'movies', 'movie night'], emoji: '🎬' },
  { keywords: ['concert', 'music', 'live music', 'gig', 'show'], emoji: '🎵' },
  { keywords: ['party', 'celebration'], emoji: '🎉' },
  { keywords: ['game', 'gaming', 'video games', 'board games', 'game night'], emoji: '🎮' },
  { keywords: ['bowling'], emoji: '🎳' },
  { keywords: ['karaoke'], emoji: '🎤' },
  { keywords: ['museum', 'exhibition'], emoji: '🏛️' },
  { keywords: ['art', 'gallery', 'painting'], emoji: '🎨' },

  // Family & Kids
  { keywords: ['park with kids', 'park w/ kids'], emoji: '🌳👶🏽' },
  { keywords: ['kids', 'children', 'child', 'baby'], emoji: '👶' },
  { keywords: ['park', 'playground', 'play date'], emoji: '🌳' },
  { keywords: ['zoo', 'aquarium'], emoji: '🦁' },
  { keywords: ['library', 'story time'], emoji: '📚' },
  { keywords: ['school', 'pickup'], emoji: '🏫' },

  // Work & Professional
  { keywords: ['meeting', 'meet', 'standup', 'sync'], emoji: '🤝' },
  { keywords: ['office', 'work', 'working', 'workplace'], emoji: '💼' },
  { keywords: ['conference', 'convention', 'summit'], emoji: '🎯' },
  { keywords: ['presentation', 'demo', 'pitch'], emoji: '📊' },

  // Shopping & Errands
  { keywords: ['shopping', 'shop', 'mall'], emoji: '🛍️' },
  { keywords: ['market', 'grocery', 'grocery store', 'supermarket'], emoji: '🛒' },
  { keywords: ['errand'], emoji: '🛒' },
  { keywords: ['flea market', 'thrift'], emoji: '🏺' },

  // Outdoor & Nature
  { keywords: ['beach', 'ocean', 'shore'], emoji: '🏖️' },
  { keywords: ['camping', 'camp'], emoji: '⛺' },
  { keywords: ['picnic'], emoji: '🧺' },
  { keywords: ['gardening', 'garden'], emoji: '🌱' },
  { keywords: ['sunset', 'sunrise'], emoji: '🌅' },
  { keywords: ['stargazing', 'stars'], emoji: '⭐' },

  // Travel & Transportation
  { keywords: ['road trip', 'driving'], emoji: '🚗' },
  { keywords: ['airport', 'flight', 'flying'], emoji: '✈️' },
  { keywords: ['train', 'railway'], emoji: '🚂' },
  { keywords: ['walking', 'walk'], emoji: '🚶' },
  { keywords: ['dog park'], emoji: '🐶' },
  { keywords: ['park with kids'], emoji: '🌳' },
  { keywords: ['game + drinks', 'game and drinks', 'game + beers', 'game and beers'], emoji: '🍻' },
  { keywords: ['lunch near work'], emoji: '🥪' },
  { keywords: ['ice-cream', 'ice cream'], emoji: '🍦' },

  // Special Occasions
  { keywords: ['birthday', 'bday'], emoji: '🎂' },
  { keywords: ['anniversary'], emoji: '💕' },
  { keywords: ['wedding', 'ceremony'], emoji: '💒' },
  { keywords: ['graduation', 'grad'], emoji: '🎓' },
  { keywords: ['holiday', 'vacation'], emoji: '🎊' },

  // Home & Relaxation
  { keywords: ['spa', 'massage', 'relaxation'], emoji: '💆' },
  { keywords: ['book club', 'reading', 'books'], emoji: '📖' },
  { keywords: ['board games', 'game night'], emoji: '🎲' },
  { keywords: ['cooking', 'baking', 'recipe'], emoji: '👨‍🍳' },

  // Modern Activities
  { keywords: ['photography', 'photo', 'photos', 'photoshoot'], emoji: '📸' },
  { keywords: ['podcast', 'recording'], emoji: '🎙️' },
  { keywords: ['streaming', 'netflix', 'movie night'], emoji: '📺' },
  { keywords: ['zoom', 'video call', 'meeting'], emoji: '💻' },
];

function formatTimeDisplay(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // Handle special times
  if (hours === 0 && minutes === 0) return 'Midnight';
  if (hours === 12 && minutes === 0) return 'Noon';
  
  // Format regular times
  const timeString = date.toLocaleTimeString(undefined, { 
    hour: 'numeric', 
    minute: minutes === 0 ? undefined : '2-digit'
  });
  
  return timeString;
}

function formatPreview(p: Parsed): string {
  if (!p.title) return 'add a title';
  if (!p.start) return p.title;
  
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  const start = new Intl.DateTimeFormat(undefined, opts).format(p.start);
  if (!p.end) return `${p.title} — ${start}`;
  
  const end = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(p.end);
  
  // Format according to style guide
  const formatTime = (time: string) => {
    // Remove :00 minutes
    return time.replace(':00', '');
  };
  
  const startFormatted = formatTime(start);
  const endFormatted = formatTime(end);
  
  // Check if same meridiem
  const startMeridiem = start.includes('AM') ? 'AM' : 'PM';
  const endMeridiem = end.includes('AM') ? 'AM' : 'PM';
  const sameMeridiem = startMeridiem === endMeridiem;
  
  // Format start time - remove meridiem if same as end
  const startTimeOnly = startFormatted.replace(/ (AM|PM)/, '');
  const finalStartTime = sameMeridiem ? startTimeOnly : startFormatted;
  
  return `${p.title} — ${finalStartTime}–${endFormatted}`;
}

function detectEmoji(input: string): string | null {
  const lowerInput = input.toLowerCase();
  
  // Check for work context
  const workContextKeywords = ['office', 'work', 'meeting', 'coworker', 'colleague', 'team', 'project', 'conference'];
  const isWorkContext = workContextKeywords.some(keyword => lowerInput.includes(keyword));
  
  // Find matching emoji with word boundary matching
  for (const mapping of EMOJI_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      // Use word boundaries for single words, or exact phrase matching for multi-word phrases
      const regex = lowerKeyword.includes(' ') 
        ? new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
        : new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      
      if (regex.test(lowerInput)) {
        // Use work context emoji if available and in work context
        if (isWorkContext && mapping.workContext) {
          return mapping.workContext;
        }
        return mapping.emoji;
      }
    }
  }
  
  return null;
}

function detectCircle(input: string): Circle {
  const lowerInput = input.toLowerCase();
  
  // Family keywords
  const familyKeywords = ['kids', 'children', 'family', 'mom', 'dad', 'parents', 'grandma', 'grandpa', 'park', 'playground'];
  if (familyKeywords.some(keyword => lowerInput.includes(keyword))) {
    return 'Family';
  }
  
  // Work keywords
  const workKeywords = ['work', 'office', 'meeting', 'lunch', 'coworker', 'colleague', 'team', 'project'];
  if (workKeywords.some(keyword => lowerInput.includes(keyword))) {
    return 'Coworkers';
  }
  
  // Default to Close Friends for social activities
  const socialKeywords = ['dinner', 'drinks', 'party', 'movie', 'concert', 'game', 'tennis', 'gym', 'hiking', 'brunch', 'coffee'];
  if (socialKeywords.some(keyword => lowerInput.includes(keyword))) {
    return 'Close Friends';
  }
  
  return 'Close Friends'; // Default fallback
}

  function parseInput(input: string, refDate: Date): Parsed {
  // Preprocess input to handle common abbreviations and special times
  const processedInput = input
    // Handle "p" abbreviation for "pm"
    .replace(/\b(\d{1,2})([:\d]*)\s*p\b/g, '$1$2 pm')
    // Handle "a" abbreviation for "am" 
    .replace(/\b(\d{1,2})([:\d]*)\s*a\b/g, '$1$2 am')
    // Handle "noon" as 12:00 pm
    .replace(/\bnoon\b/gi, '12:00 pm')
    // Handle "midnight" as :00 am
    .replace(/\bmidnight\b/gi, '12:00 am')
    // Handle "midday" as 12:00 pm
    .replace(/\bmidday\b/gi, '12:00 pm')
    // Handle "noon to X" pattern - assume pm if no am/pm specified
    .replace(/\bnoon\s+to\s+(\d{1,2})([:\d]*)\b(?!\s*(?:am|pm|a|p)\b)/gi, '12:00 pm to $1$2 pm')
    // Handle "X to Y" pattern where X is pm and Y has no am/pm - assume Y is pm too
    .replace(/\b(\d{1,2})([:\d]*)\s*pm\s+to\s+(\d{1,2})([:\d]*)\b(?!\s*(?:am|pm|a|p)\b)/gi, '$1$2 pm to $3$4 pm')
    // Handle time ranges like "3-5" or "10-11" - assume daytime hours
    .replace(/\b(\d{1,2})([:\d]*)\s*[-–—]\s*(\d{1,2})([:\d]*)\b(?!\s*(?:am|pm|a|p)\b)/g, (match, startHour, startMin, endHour, endMin) => {
      const start = parseInt(startHour);
      const end = parseInt(endHour);
      
      // If it's clearly morning hours (6-11), assume AM
      if (start >= 6 && start <= 11 && end >= 6 && end <= 11) {
        return `${startHour}${startMin} am - ${endHour}${endMin} am`;
      }
      // If it's clearly evening hours (8-11), assume PM  
      else if (start >= 8 && start <= 11 && end >= 8 && end <= 11) {
        return `${startHour}${startMin} pm - ${endHour}${endMin} pm`;
      }
      // For afternoon hours (12-7), assume PM
      else if (start >= 12 || start <= 7 || end >= 12 || end <= 7) {
        return `${startHour}${startMin} pm - ${endHour}${endMin} pm`;
      }
      // Default to PM for most cases
      else {
        return `${startHour}${startMin} pm - ${endHour}${endMin} pm`;
      }
    });

  const results = chrono.parse(processedInput, refDate);
  
  let start: Date | null = null;
  let end: Date | null = null;
  let timeMovedToTomorrow = false;

  if (results.length > 0) {
    const r = results[0];
    start = r.start?.date() ?? null;
    // End may be missing; if so, default to +60min from start
    end = r.end?.date() ?? (start ? new Date(start.getTime() + 60 * 60 * 1000) : null);
    
    // If the parsed time is in the middle of the night (2am-6am), prefer the afternoon version
    if (start && start.getHours() >= 2 && start.getHours() <= 6) {
      // Check if this looks like it should be afternoon (no explicit am/pm in original input)
      const hasExplicitAmPm = /[ap]m\b/i.test(input);
      if (!hasExplicitAmPm) {
        // Add 12 hours to shift to afternoon
        start = new Date(start.getTime() + 12 * 60 * 60 * 1000);
        if (end) {
          end = new Date(end.getTime() + 12 * 60 * 60 * 1000);
        }
      }
    }
    
    // Smart time logic: if the parsed time is in the past today, move it to tomorrow
    if (start) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const parsedToday = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      
      // Check if user explicitly said "today"
      const hasExplicitToday = /\b(today)\b/i.test(input);
      
      // If the parsed time is today but in the past, move to tomorrow
      if (parsedToday.getTime() === today.getTime() && start.getTime() < now.getTime()) {
        start = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        if (end) {
          end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        }
        
        // Track if we moved it to tomorrow due to explicit "today"
        if (hasExplicitToday) {
          timeMovedToTomorrow = true;
        }
      }
    }
  }

  // Title is input with the time phrase removed (best effort)
  const timeSpan =
    results.length > 0 ? input.slice(results[0].index, results[0].index + results[0].text.length) : '';
  let title = input.replace(timeSpan, '').trim().replace(/[–—-]\s*$/,'') || input.trim();
  
  // Additional cleanup for mobile - remove common time words that might be left behind
  title = title.replace(/\b(from|at|@)\s+[a-z]+\b/gi, '').trim();
  
  // If title is still too long or contains time-related words, try more aggressive cleanup
  if (title.length > 20 || /\b(noon|midnight|am|pm|morning|afternoon|evening|night)\b/i.test(title)) {
    // Split by common time indicators and take the first part
    const timeIndicators = /\b(from|at|@|on|in)\s+/i;
    const parts = title.split(timeIndicators);
    if (parts.length > 1) {
      title = parts[0].trim();
    }
  }
  
  // Clean up common punctuation that might be left behind
  title = title.replace(/,\s*$/, '').replace(/\.\s*$/, '').trim();

  // Detect emoji
  const emoji = detectEmoji(input);

  // Smart sports duration detection
  if (start && end) {
    const lowerTitle = title.toLowerCase();
    
    // Check if this is the default 1-hour duration (60 minutes)
    const isDefaultDuration = end.getTime() - start.getTime() === 60 * 60 * 1000;
    
    if (isDefaultDuration) {
      // NFL teams - 3 hours duration
      const nflTeams = ['chiefs', 'cowboys', 'patriots', 'packers', 'steelers', '49ers', 'bills', 'dolphins', 'ravens', 'bengals', 'eagles', 'giants', 'jets', 'bears', 'lions'];
      const isNFL = nflTeams.some(team => lowerTitle.includes(team));
      
      // NBA teams - 2.5 hours duration  
      const nbaTeams = ['lakers', 'warriors', 'celtics', 'heat', 'bulls', 'knicks', 'nets', '76ers', 'bucks', 'suns', 'nuggets', 'mavericks', 'clippers', 'spurs'];
      const isNBA = nbaTeams.some(team => lowerTitle.includes(team));
      
      if (isNFL) {
        // NFL games are typically 3 hours
        end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      } else if (isNBA) {
        // NBA games are typically 2.5 hours
        end = new Date(start.getTime() + 2.5 * 60 * 60 * 1000);
      }
    }
  }

  return {
    title,
    start,
    end,
    whenText: results.length > 0 ? results[0].text : null,
    emoji,
    timeMovedToTomorrow,
  };
}

export default function CreateInvitePage() {
  const [user, setUser] = useState<User | null>(null);

  const [input, setInput] = useState('');
  const [circle, setCircle] = useState<Circle>('Family');
  const [hostName, setHostName] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [emojiManuallyRemoved, setEmojiManuallyRemoved] = useState(false);
  const [circleManuallyChanged, setCircleManuallyChanged] = useState(false);
  const [hasEditedAfterCreation, setHasEditedAfterCreation] = useState(false);
  const [baselineState, setBaselineState] = useState<{input: string, hostName: string, circle: Circle} | null>(null);

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        // Load user's display name from their profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', data.session.user.id)
          .single();
        
        if (profile?.display_name) {
          setHostName(profile.display_name);
        } else {
          // Fallback to email username
          const handle = data.session.user.email?.split('@')[0] ?? '';
          setHostName(handle);
        }
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUser(sess?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const detectedCircle = useMemo(() => detectCircle(input), [input]);
  const parsed = useMemo(() => parseInput(input, new Date()), [input]);
  const preview = useMemo(() => formatPreview(parsed), [parsed]);

  // Auto-update circle when input changes and circle is detected (unless manually changed)
  useEffect(() => {
    if (input && detectedCircle !== circle && !circleManuallyChanged) {
      setCircle(detectedCircle);
    }
  }, [input, detectedCircle, circle, circleManuallyChanged]);

  // Auto-update emoji when input changes (unless manually removed)
  useEffect(() => {
    if (input && !emojiManuallyRemoved) {
      setSelectedEmoji(parsed.emoji);
    }
  }, [input, parsed.emoji, emojiManuallyRemoved]);

  // Reset emoji removal flag when input changes significantly
  useEffect(() => {
    if (input && !parsed.emoji) {
      setEmojiManuallyRemoved(false);
    }
  }, [input, parsed.emoji]);


  // Detect if user has edited after creating an invite
  useEffect(() => {
    if (link && baselineState && !hasEditedAfterCreation) {
      const hasChanged = 
        input !== baselineState.input || 
        hostName !== baselineState.hostName || 
        circle !== baselineState.circle;
      
      if (hasChanged) {
        setHasEditedAfterCreation(true);
        setLink(null); // Clear the link since they're creating a new invite
      }
    }
  }, [input, hostName, circle, link, baselineState, hasEditedAfterCreation]);

  // Scroll to show input and preview when tapped on mobile
  const handleInputFocus = () => {
    // Wait for keyboard to appear, then scroll to show the "Tell us about it" label
    setTimeout(() => {
      const label = document.querySelector('label');
      if (label) {
        label.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const canCreate =
    !!user &&
    !!parsed.title &&
    !!parsed.start &&
    !!parsed.end &&
    !!hostName &&
    !creating;

  async function handleCreate() {
    setErrorMsg(null);

    if (!user) {
      setErrorMsg('You need to be signed in.');
      return;
    }
    if (!parsed.start || !parsed.end) {
      setErrorMsg('Please include a time (e.g., “3–5p today”).');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('open_invites')
        .insert([
          {
            creator_id: user.id,
            title: selectedEmoji ? `${selectedEmoji} ${parsed.title}` : parsed.title,
            window_start: parsed.start.toISOString(),
            window_end: parsed.end.toISOString(),
            host_name: hostName || user.email?.split('@')[0],
            circle_ids: [], // Required field - empty array for now
          },
        ])
        .select('id')
        .single();

      if (error) {
        setErrorMsg(`Create failed: ${error.message}`);
        setCreating(false);
        return;
      }
      const id: string = data.id;
      
      // Get fresh display name from profile for host RSVP
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      
      const hostDisplayName = profile?.display_name || hostName || user.email?.split('@')[0] || 'Host';
      
      // Add the host as the first RSVP
      await supabase
        .from('rsvps')
        .insert({
          invite_id: id,
          state: 'join',
          guest_email: user.email,
          guest_name: hostDisplayName,
        });
      
      // Detect user's timezone for OpenGraph image
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Store timezone in database (ignore errors if column doesn't exist yet)
      try {
        await supabase
          .from('open_invites')
          .update({ timezone: userTimezone })
          .eq('id', id);
      } catch (error) {
        console.log('Timezone column not found, skipping timezone storage:', error);
      }
      
      const base = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nowish.vercel.app');
      const url = `${base}/invite/${id}`;
      setLink(url);
      setHasEditedAfterCreation(false); // Reset the flag since we have a new invite
      setBaselineState({ input, hostName, circle }); // Set baseline state

      // try to share right away
      if (navigator.share) {
        try {
          await navigator.share({
            title: parsed.title,
            url,
          });
        } catch {
          // user may cancel share; ignore
        }
      }
     } catch {
       setErrorMsg('Unexpected error creating invite.');
     } finally {
       setCreating(false);
     }
  }

  function copyLink() {
    if (link) {
      navigator.clipboard.writeText(link).catch(() => {});
    }
  }

  function shareLink() {
    if (!link) return;
    if (navigator.share) {
      navigator
        .share({ title: parsed.title || 'Invite', text: preview, url: link })
        .catch(() => {});
    } else {
      copyLink();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const styles = `
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-10px);
      }
      60% {
        transform: translateY(-5px);
      }
    }
    
    .bounce-emoji {
      animation: bounce 2s ease-in-out;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="space-y-6">
      {/* signed in banner */}
      {user ? (
        <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm flex items-center justify-between">
          <span>
            You&apos;re signed in as <span className="font-medium">{user.email}</span>
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span>
              <span className="font-medium">Sign in required</span> to create invites
            </span>
            <button
              onClick={() => window.location.href = '/login'}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      <header>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">What&apos;s happening?</h1>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
        {/* What are you doing */}
        <div className="space-y-2">
          <label className="block text-lg font-semibold text-slate-900">
            Tell us about it
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 placeholder:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="Type it like a text; we'll make it look good"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onClick={handleInputFocus}
            autoFocus
          />

          {/* Helper text when typing but no time detected */}
          {input && !parsed.start && (
            <div className="mt-2 text-sm text-slate-500">
              💡 Add a time like <span className="font-medium">&quot;3pm&quot;</span> or <span className="font-medium">&quot;tomorrow&quot;</span> to create your invite
            </div>
          )}


          {/* Activity chips */}
          <div className="mt-6">
            <div className="mb-2 text-sm font-medium text-slate-600">Try one, or just type</div>
            <div className="flex flex-wrap gap-2">
              {[
                { emoji: '☕', text: 'Coffee', suggestion: 'Coffee' },
                { emoji: '🌳', text: 'Park w/ kids', suggestion: 'Park with kids' },
                { emoji: '🏈', text: 'Game + drinks', suggestion: 'Game + drinks' },
                { emoji: '🥪', text: 'Lunch near work', suggestion: 'Lunch near work' },
              ].map((chip, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Check if user has already selected a time chip
                    const currentInput = input.toLowerCase();
                    const hasTimeChip = currentInput.includes('in 30 minutes') || 
                                      currentInput.includes('later today') || 
                                      currentInput.includes('tonight') || 
                                      currentInput.includes('tomorrow') ||
                                      currentInput.includes('at ');
                    
                    if (hasTimeChip) {
                      // Keep existing time, just replace the activity part
                      const activityOnly = chip.suggestion.split(' at ')[0].split(' in ')[0];
                      // Find and replace the activity part while keeping the time
                      let newInput = input;
                      // Remove any existing activity and add the new one
                      const timePattern = /(in \d+ minutes? today|at \d+[ap]m tomorrow|at \d+[ap]m today|at \d+[ap]m|later today|tonight)/i;
                      const timeMatch = input.match(timePattern);
                      if (timeMatch) {
                        newInput = activityOnly + ' ' + timeMatch[0];
                      } else {
                        newInput = activityOnly;
                      }
                      setInput(newInput);
                    } else {
                      // Use full suggestion with time
                      setInput(chip.suggestion);
                    }
                    
                    // Scroll to show the input area and create button
                    setTimeout(() => {
                      const label = document.querySelector('label');
                      if (label) {
                        label.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <span>{chip.emoji}</span>
                  <span>{chip.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time quick-picks */}
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium text-slate-600">Time</div>
            <div className="flex flex-wrap gap-2">
              {[
                { text: 'In 30m', suggestion: 'in 30 minutes today' },
                { 
                  text: 'Later today', 
                  suggestion: (() => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    let laterHour;
                    if (currentHour < 14) laterHour = 16; // 4pm if before 2pm
                    else if (currentHour < 16) laterHour = 18; // 6pm if 2pm-4pm
                    else if (currentHour < 18) laterHour = 20; // 8pm if 4pm-6pm
                    else laterHour = 21; // 9pm if after 6pm
                    return `at ${laterHour > 12 ? laterHour - 12 : laterHour}${laterHour >= 12 ? 'pm' : 'am'} today`;
                  })()
                },
                { 
                  text: 'Tonight', 
                  suggestion: (() => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const tonightHour = currentHour < 18 ? 21 : 22; // 9pm if before 6pm, 10pm if after
                    return `at ${tonightHour > 12 ? tonightHour - 12 : tonightHour}${tonightHour >= 12 ? 'pm' : 'am'} tonight`;
                  })()
                },
                { text: 'Tomorrow AM', suggestion: 'at 9am tomorrow' },
                { text: 'Tomorrow night', suggestion: 'at 8pm tomorrow' },
              ].map((chip, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Check if user has already selected an activity chip
                    const currentInput = input.toLowerCase();
                    const hasActivityChip = currentInput.includes('coffee') || 
                                          currentInput.includes('park with kids') || 
                                          currentInput.includes('game + drinks') || 
                                          currentInput.includes('lunch near work');
                    
                    if (hasActivityChip) {
                      // Keep existing activity, just replace the time part
                      const timeOnly = chip.suggestion;
                      // Find and replace the time part while keeping the activity
                      let newInput = input;
                      // Remove any existing time and add the new one
                      const activityPattern = /(coffee|park with kids|game \+ drinks|lunch near work)/i;
                      const activityMatch = input.match(activityPattern);
                      if (activityMatch) {
                        newInput = activityMatch[0] + ' ' + timeOnly;
                      } else {
                        newInput = timeOnly;
                      }
                      setInput(newInput);
                    } else {
                      // Remove ALL time-related phrases more aggressively
                      const newInput = input
                        // Remove common time patterns
                        .replace(/\b(at|around|@)\s+\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.)\b/gi, '')
                        .replace(/\b(in|for)\s+\d+\s*(minutes?|mins?|hours?|hrs?)\b/gi, '')
                        .replace(/\b(now|today|tomorrow|tonight|morning|afternoon|evening|later today)\b/gi, '')
                        .replace(/\b(am|pm|a\.m\.|p\.m\.)\b/gi, '')
                        // Clean up extra spaces and punctuation
                        .replace(/\s+/g, ' ')
                        .replace(/\s*[?.,]\s*$/, '')
                        .trim();
                      
                      const finalInput = newInput + (newInput ? ' ' : '') + chip.suggestion;
                      setInput(finalInput);
                    }
                  }}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <span>{chip.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Card */}
          {input && (
            <div id="live-preview-card" className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 shadow-lg backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium text-slate-600">Live Preview</span>
              </div>
              
              {/* Subtle decorative pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/10 via-transparent to-purple-100/10 rounded-2xl"></div>
              
              <div className="relative space-y-4 text-center">
                {/* Title with emoji */}
                <div className="space-y-2">
                  <div className="text-center">
                    {selectedEmoji && (
                      <div className="bounce-emoji text-5xl mb-4">
                        {selectedEmoji}
                      </div>
                    )}
                    <div className="text-center space-y-2">
                      {/* Host line - muted */}
                      {parsed.title && (
                        <div className="text-base text-slate-500">
                          {hostName || 'A friend'} is heading to…
                        </div>
                      )}
                      
                      {/* Big title */}
                      <h1 className="text-3xl font-bold text-slate-900">
                        {parsed.title || 'What are you doing?'}
                      </h1>
                      
                      {/* Friendly invite line */}
                      {parsed.title && (
                        <div className="text-sm italic text-slate-500">
                          If you&apos;re free, swing by ✨
                        </div>
                      )}
                    </div>
                  </div>
                  {parsed.title && (
                    <div className="flex justify-center mb-3">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        {detectedCircle}
                      </span>
                    </div>
                  )}
                </div>

                {/* Time */}
                {parsed.start ? (
                  <div className="flex items-center justify-center gap-2 text-slate-600 mb-3">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      {parsed.start.toLocaleDateString(undefined, { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}, {formatTimeDisplay(parsed.start)}
                      {parsed.end && ` – ${formatTimeDisplay(parsed.end)}`}
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-400 italic mb-3">
                    Add a time to see when this happens
                  </div>
                )}

                {/* Emoji Control */}
                {parsed.emoji && (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    {selectedEmoji ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Nowish guessed {selectedEmoji} for this</span>
                        <button
                          onClick={() => {
                            setSelectedEmoji(null);
                            setEmojiManuallyRemoved(true);
                          }}
                          className="text-slate-500 hover:text-slate-700 underline"
                        >
                          remove
                        </button>
                      </div>
                    ) : emojiManuallyRemoved ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Emoji removed</span>
                        <button
                          onClick={() => {
                            setSelectedEmoji(parsed.emoji);
                            setEmojiManuallyRemoved(false);
                          }}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          add back {parsed.emoji}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Time moved warning */}
                {parsed.timeMovedToTomorrow && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 text-amber-800">
                      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Time moved to tomorrow</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">
                      That time has already passed today, so we set it for tomorrow.
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

        {/* Circle & Host */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="block text-lg font-semibold text-slate-900">Who&apos;s this for?</label>
              {input && detectedCircle === circle && (
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  Auto-detected
                </span>
              )}
            </div>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              value={circle}
              onChange={(e) => {
                setCircle(e.target.value as Circle);
                setCircleManuallyChanged(true);
              }}
            >
              <option>Family</option>
              <option>Close Friends</option>
              <option>Coworkers</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-lg font-semibold text-slate-900">
              Your name (shows on invite)
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Optional — defaults to your email handle.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-4">
          {!link || hasEditedAfterCreation ? (
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className={`rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 disabled:cursor-not-allowed ${
                canCreate
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl active:scale-95'
                  : 'bg-slate-300'
              }`}
            >
              {creating 
                ? 'Creating…' 
                : !user
                  ? 'Sign in to create invite'
                  : canCreate 
                    ? 'Create invite' 
                    : parsed.start 
                      ? 'Create invite'
                      : 'Need a time first ⏰'
              }
            </button>
          ) : (
            <button
              onClick={shareLink}
              className="rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl active:scale-95"
            >
              Share invite
            </button>
          )}

          {/* Helper text */}
          <div className="text-center text-sm text-slate-500 mt-3">
            You&apos;ll get a link to text. Friends don&apos;t need an account.
          </div>

          {link && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-600">Link ready:</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  readOnly
                  value={link}
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={copyLink}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    Copy
                  </button>
                  <button
                    onClick={shareLink}
                    className="rounded-xl border border-blue-300 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 text-sm font-medium text-blue-700 hover:from-blue-100 hover:to-purple-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
        </div>
      </div>

    </div>
    </>
  );
}