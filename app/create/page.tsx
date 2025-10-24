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
  { keywords: ['running', 'run', 'jog', 'jogging', 'marathon'], emoji: '🏃' },
  { keywords: ['hiking', 'hike', 'trail'], emoji: '🥾' },
  { keywords: ['swimming', 'swim', 'pool'], emoji: '🏊' },
  { keywords: ['basketball', 'hoops'], emoji: '🏀' },
  { keywords: ['football', 'soccer', 'futbol'], emoji: '⚽' },
  { keywords: ['cycling', 'bike', 'biking', 'bicycle'], emoji: '🚴' },
  { keywords: ['yoga', 'meditation'], emoji: '🧘' },
  { keywords: ['golf', 'golfing'], emoji: '⛳' },
  { keywords: ['climbing', 'rock climbing', 'bouldering'], emoji: '🧗' },

  // Food & Drinks (with work context override)
  { keywords: ['coffee', 'cafe', 'latte', 'espresso', 'cappuccino'], emoji: '☕' },
  { keywords: ['dinner', 'dining'], emoji: '🍽️' },
  { keywords: ['lunch'], emoji: '🥪', workContext: '🥗' }, // Different emoji for work lunch
  { keywords: ['brunch', 'breakfast'], emoji: '🥞' },
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
  { keywords: ['game', 'gaming', 'video games', 'board games', 'game night'], emoji: '🎮' },
  { keywords: ['bowling'], emoji: '🎳' },
  { keywords: ['karaoke'], emoji: '🎤' },
  { keywords: ['museum', 'exhibition'], emoji: '🏛️' },
  { keywords: ['art', 'gallery', 'painting'], emoji: '🎨' },

  // Family & Kids
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
  };
  const start = new Intl.DateTimeFormat(undefined, opts).format(p.start);
  if (!p.end) return `${p.title} — ${start}`;
  const end = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(p.end);
  return `${p.title} — ${start} to ${end}`;
}

function detectEmoji(input: string): string | null {
  const lowerInput = input.toLowerCase();
  
  // Check for work context
  const workContextKeywords = ['office', 'work', 'meeting', 'coworker', 'colleague', 'team', 'project', 'conference'];
  const isWorkContext = workContextKeywords.some(keyword => lowerInput.includes(keyword));
  
  // Find matching emoji
  for (const mapping of EMOJI_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
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
    .replace(/\b(\d{1,2})([:\d]*)\s*pm\s+to\s+(\d{1,2})([:\d]*)\b(?!\s*(?:am|pm|a|p)\b)/gi, '$1$2 pm to $3$4 pm');

  const results = chrono.parse(processedInput, refDate);
  
  let start: Date | null = null;
  let end: Date | null = null;

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
  }

  // Title is input with the time phrase removed (best effort)
  const timeSpan =
    results.length > 0 ? input.slice(results[0].index, results[0].index + results[0].text.length) : '';
  let title = input.replace(timeSpan, '').trim().replace(/[–—-]\s*$/,'') || input.trim();
  
  // Clean up common punctuation that might be left behind
  title = title.replace(/,\s*$/, '').replace(/\.\s*$/, '').trim();

  // Detect emoji
  const emoji = detectEmoji(input);

  return {
    title,
    start,
    end,
    whenText: results.length > 0 ? results[0].text : null,
    emoji,
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
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const rotatingTips = [
    'Try "Coffee at 3pm today"',
    'Try "Dinner tomorrow at 7:30pm"',
    'Try "Park with kids, 3-5p"',
    'Try "Movie night Friday 8p-10p"',
    'Try "Brunch Sunday morning"',
    'Try "Drinks after work"'
  ];

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user?.email) {
        const handle = data.session.user.email.split('@')[0] ?? '';
        setHostName((prev) => prev || handle);
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

  // Auto-update circle when input changes and circle is detected
  useEffect(() => {
    if (input && detectedCircle !== circle) {
      setCircle(detectedCircle);
    }
  }, [input, detectedCircle, circle]);

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

  // Rotate tips every 3 seconds when input is empty
  useEffect(() => {
    if (!input) {
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % rotatingTips.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [input, rotatingTips.length]);

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
      const base = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nowish.vercel.app');
      const url = `${base}/invite/${id}`;
      setLink(url);

      // try to share right away
      if (navigator.share) {
        try {
          await navigator.share({
            title: parsed.title,
            text: `Join me: ${preview}`,
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

  return (
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

      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">What&apos;s happening?</h1>
        <p className="text-slate-600">Type it like a text; we&apos;ll make it look good.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
        {/* What are you doing */}
        <div className="space-y-2">
          <label className="block text-lg font-semibold text-slate-900">
            Tell us about it
          </label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="Type your invite here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />

          {/* Helper text when typing but no time detected */}
          {input && !parsed.start && (
            <div className="mt-2 text-sm text-slate-500">
              💡 Add a time like <span className="font-medium">&quot;3pm&quot;</span> or <span className="font-medium">&quot;tomorrow&quot;</span> to create your invite
            </div>
          )}

          {/* Rotating tips when input is empty */}
          {!input && (
            <div className="mt-2 text-sm text-slate-500 transition-opacity duration-500">
              💡 {rotatingTips[currentTipIndex]}
            </div>
          )}

          {/* Live Preview Card */}
          {input && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 shadow-lg">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium text-slate-600">Live Preview</span>
              </div>
              
              <div className="space-y-3">
                {/* Title */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedEmoji && (
                      <span className="text-xl">{selectedEmoji}</span>
                    )}
                    <div className="text-lg font-semibold text-slate-900">
                      {parsed.title ? (
                        <span>
                          {hostName || 'You'} would love to see you at {parsed.title}
                        </span>
                      ) : (
                        'What are you doing?'
                      )}
                    </div>
                  </div>
                  {parsed.title && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        {detectedCircle}
                      </span>
        <span className="text-sm text-slate-600">
          Come if you&apos;re free ✨
        </span>
                    </div>
                  )}
                </div>

                {/* Emoji Control */}
                {parsed.emoji && (
                  <div className="flex items-center gap-2 text-sm">
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

                {/* Time */}
                {parsed.start ? (
                  <div className="flex items-center gap-2 text-slate-600">
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
                  <div className="text-slate-400 italic">
                    Add a time to see when this happens
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
              onChange={(e) => setCircle(e.target.value as Circle)}
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
  );
}