'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Add styles for animations
const styles = `
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-8px); }
    60% { transform: translateY(-4px); }
  }
  @keyframes ripple {
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(4); opacity: 0; }
  }
  .bounce-emoji {
    animation: bounce 2s infinite;
  }
  .ripple-effect {
    position: relative;
    overflow: hidden;
  }
  .ripple-effect::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    animation: ripple 0.6s ease-out;
  }
`;

function formatTimeNicely(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const now = new Date();
  
  // Check if it's today
  const isToday = start.toDateString() === now.toDateString();
  const isTomorrow = start.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  const startTime = start.toLocaleTimeString(undefined, timeOptions);
  const endTime = end.toLocaleTimeString(undefined, timeOptions);
  
  // Format times according to style guide
  const formatTime = (time: string) => {
    // Remove :00 minutes
    return time.replace(':00', '');
  };
  
  const startFormatted = formatTime(startTime);
  const endFormatted = formatTime(endTime);
  
  // Check if same meridiem
  const startMeridiem = startTime.includes('AM') ? 'AM' : 'PM';
  const endMeridiem = endTime.includes('AM') ? 'AM' : 'PM';
  const sameMeridiem = startMeridiem === endMeridiem;
  
  // Format start time - remove meridiem if same as end
  const startTimeOnly = startFormatted.replace(/ (AM|PM)/, '');
  const finalStartTime = sameMeridiem ? startTimeOnly : startFormatted;
  
  if (isToday) {
    return `Today, ${finalStartTime}–${endFormatted}`;
  } else if (isTomorrow) {
    return `Tomorrow, ${finalStartTime}–${endFormatted}`;
  } else {
    // For other days, show day and time
    const dayOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    const startFormatted = start.toLocaleString(undefined, dayOptions);
    const endFormatted = end.toLocaleTimeString(undefined, timeOptions);
    return `${startFormatted}–${endFormatted}`;
  }
}

function formatNamesList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are`;
  if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]} are`;
  return `${names[0]}, ${names[1]}, and ${names.length - 2} more are`;
}

// Emoji detection function (same as creation preview)
function detectEmojiFromTitle(title: string): string {
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
}

// Input sanitization function

export default function InviteClientSimple({ inviteId }: { inviteId: string }) {
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invite, setInvite] = useState<{
    id: string;
    title: string;
    window_start: string;
    window_end: string;
    host_name: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpCounts, setRsvpCounts] = useState<{
    join: number;
    maybe: number;
    decline: number;
  }>({ join: 0, maybe: 0, decline: 0 });
  const [rsvpNames, setRsvpNames] = useState<{
    join: string[];
    maybe: string[];
  }>({ join: [], maybe: [] });
  
  // Guest form state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  
  // Input validation for guest fields
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showRipple, setShowRipple] = useState(false);

  const handleCardTouch = () => {
    // Trigger ripple effect
    setShowRipple(true);
    
    // Trigger haptic feedback (if supported and in secure context)
    if (typeof navigator !== 'undefined' && navigator.vibrate && window.isSecureContext) {
      try {
        // Try different vibration patterns for better feedback
        navigator.vibrate([50, 30, 50]); // Pattern: vibrate, pause, vibrate
      } catch (error) {
        console.log('Vibration not supported:', error);
      }
    } else {
      console.log('Vibration not available - navigator.vibrate:', !!navigator?.vibrate, 'isSecureContext:', window.isSecureContext);
    }
    
    // Reset ripple after animation
    setTimeout(() => setShowRipple(false), 600);
  };

  // Check if user is logged in and handle RSVP from login redirect
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      
      // No automatic RSVP application needed - all RSVPs are guest RSVPs
    })();
  }, []);

  async function sendRSVP(status: 'join' | 'maybe' | 'decline') {
    if (busy) return;
    
    console.log('sendRSVP called (logged in user), isLoggedIn:', isLoggedIn);
    
    setBusy(true);
    try {
      setState(status);
      
      // Get current user (should be logged in at this point)
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;
      
      if (!userEmail) {
        alert('You need to be signed in to RSVP.');
        setState(null);
        return;
      }
      
      // Get user's display name from their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      
      const displayName = profile?.display_name || userEmail.split('@')[0];
      
      // Save RSVP to database (logged in user)
      const { data, error } = await supabase
        .from('rsvps')
        .upsert({
          invite_id: inviteId,
          state: status,
          guest_email: userEmail,
          guest_name: displayName,
        }, { onConflict: 'invite_id,guest_email' })
        .select();
      
      console.log('RSVP save result:', { data, error });
      console.log('Saved with email:', userEmail);
      console.log('Saved with name:', displayName);
      console.log('Saved with status:', status);
      
      if (error) {
        console.error('Failed to save RSVP:', error);
        alert(`Could not save RSVP: ${error.message}`);
        setState(null);
            } else {
              console.log('RSVP saved successfully:', data);
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 2000);
              // Refresh the invite data to show updated RSVPs
              fetchInvite();
            }
    } catch (err) {
      console.error('RSVP error:', err);
      alert(`Unexpected error: ${(err as Error).message}`);
      setState(null);
    } finally {
      setBusy(false);
    }
  }

  async function sendGuestRSVP(status: 'join' | 'maybe' | 'decline') {
    if (busy) return;
    
    const email = guestEmail.trim().toLowerCase();
    const name = guestName.trim();
    
    if (!email) {
      alert('Please enter your email address.');
      return;
    }
    
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    
    // All RSVPs work as guest RSVPs - no login required
    
    setBusy(true);
    try {
      setState(status);
      
      // Save guest RSVP to database
      const { data, error } = await supabase
        .from('rsvps')
        .upsert({
          invite_id: inviteId,
          state: status,
          guest_email: email,
          guest_name: name || null,
        }, { onConflict: 'invite_id,guest_email' })
        .select();
      
      console.log('Guest RSVP save result:', { data, error });
      console.log('Guest RSVP status:', status);
      console.log('Guest RSVP email:', email);
      console.log('Guest RSVP name:', name);
      
      if (error) {
        console.error('Failed to save guest RSVP:', error);
        alert(`Could not save RSVP: ${error.message}`);
        setState(null);
        } else {
          console.log('Guest RSVP saved successfully:', data);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
          // Refresh the invite data to show updated RSVPs
          fetchInvite();
        }
    } catch (err) {
      console.error('Guest RSVP error:', err);
      alert(`Unexpected error: ${(err as Error).message}`);
      setState(null);
    } finally {
      setBusy(false);
    }
  }

  const fetchInvite = useCallback(async () => {
    try {
      // Fetch invite details
      const { data, error } = await supabase
        .from('open_invites')
        .select('id, title, window_start, window_end, host_name')
        .eq('id', inviteId)
        .single();
      
      console.log('Fetch result:', { data, error });
      
      if (error) {
        console.error('Error fetching invite:', error);
        setLoading(false);
        return;
      }
      
      setInvite(data);

      // Fetch RSVP counts and names
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('rsvps')
        .select('state, guest_name')
        .eq('invite_id', inviteId);

      if (!rsvpError && rsvpData && data) {
        console.log('RSVP data:', rsvpData); // Debug log
        const counts = { join: 0, maybe: 0, decline: 0 };
        const names = { join: [] as string[], maybe: [] as string[] };
        
        // Filter out the host from RSVP counts
        // Since the host is Major and there's a Major in the RSVP list, we need to remove one
        // We'll remove the first Major RSVP (assuming it's the host's auto-RSVP)
        const hostName = data.host_name;
        const guestRsvps = rsvpData.filter((rsvp, index) => {
          // If this is the first RSVP with the host's name, remove it (it's the host's auto-RSVP)
          if (rsvp.guest_name === hostName && index === rsvpData.findIndex(r => r.guest_name === hostName)) {
            console.log('Filtering out host RSVP:', rsvp);
            return false;
          }
          return true;
        });
        
        console.log('All RSVP data before filtering:', rsvpData);
        console.log('Filtered guest RSVPs:', guestRsvps);
        
        guestRsvps.forEach((rsvp) => {
          if (rsvp.state === 'join') {
            counts.join++;
            // Use guest_name if available, otherwise use email username
            const displayName = rsvp.guest_name || 'Someone';
            names.join.push(displayName);
          } else if (rsvp.state === 'maybe') {
            counts.maybe++;
            const displayName = rsvp.guest_name || 'Someone';
            names.maybe.push(displayName);
          } else if (rsvp.state === 'decline') {
            counts.decline++;
            // Also add decline names for potential future display
            const displayName = rsvp.guest_name || 'Someone';
            names.decline = names.decline || [];
            names.decline.push(displayName);
          }
        });
        
        setRsvpCounts(counts);
        setRsvpNames(names);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error in fetchInvite:', err);
      setLoading(false);
    }
  }, [inviteId]);

  useEffect(() => {
    console.log('Fetching invite for ID:', inviteId);
    fetchInvite();
  }, [inviteId, fetchInvite]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="text-center">
          <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading invite...</p>
        </div>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Invite Not Found</h1>
          <p className="mt-2 text-slate-600">This invite may have been deleted or doesn&apos;t exist.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="space-y-6">
        {/* Invite Card */}
        <div 
          className={`ripple-effect ${showRipple ? 'ripple-effect' : ''} relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 shadow-lg backdrop-blur-sm cursor-pointer`}
          onTouchStart={handleCardTouch}
          onClick={handleCardTouch}
        >
          {/* Subtle decorative pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/10 via-transparent to-purple-100/10"></div>
          
          <div className="relative space-y-4 text-center">
            {/* Host line - muted */}
            {invite.host_name && (
              <div className="text-base text-slate-500">
                {invite.host_name} is heading to…
              </div>
            )}
            
            {/* Big title with emoji */}
            <div className="space-y-3">
              <div className="bounce-emoji text-5xl">
                {detectEmojiFromTitle(invite.title)}
              </div>
              <h1 className="text-4xl font-bold text-slate-900">
                {invite.title.replace(/^[^\w\s]*\s*/, '')}
              </h1>
            </div>
            
            {/* Time and location */}
            <div className="text-lg text-slate-700">
              {formatTimeNicely(invite.window_start, invite.window_end)}
            </div>
            
            {/* Friendly invite line */}
            <div className="text-sm italic text-slate-500">
              If you&apos;re free, swing by ✨
            </div>
            
            {/* Attendance strip */}
            {rsvpCounts.join < 1 ? (
              <div className="flex justify-center">
                <div className="inline-block rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                  <div className="text-sm text-slate-600">
                    Open invite — be the first to join!
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-blue-200/50 bg-blue-50/50 px-4 py-3 backdrop-blur-sm">
                <div className="text-sm text-green-700 font-medium">
                  {rsvpCounts.join === 1 ? (
                    `${invite.host_name} & ${rsvpNames.join[0]} are in`
                  ) : rsvpCounts.join === 2 ? (
                    `${invite.host_name}, ${rsvpNames.join[0]}, & ${rsvpNames.join[1]} are in`
                  ) : (
                    `${invite.host_name}, ${rsvpNames.join[0]}, & ${rsvpCounts.join - 1} others are in`
                  )}
                </div>
                {rsvpCounts.maybe > 0 && (
                  <div className="text-sm text-amber-700 mt-1">
                    {formatNamesList(rsvpNames.maybe)} maybe
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Guest form - show by default, hide only if confirmed logged in */}
        {isLoggedIn !== true && (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-900">Let the host know who you are</h2>
                <p className="text-sm text-slate-600">This helps them recognize you</p>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Your email (helps for future invites)"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
        {/* RSVP Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => isLoggedIn === true ? sendRSVP('join') : sendGuestRSVP('join')}
            disabled={busy || (isLoggedIn !== true && !guestEmail.trim())}
            className={`relative rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 disabled:cursor-not-allowed ${
              busy || (isLoggedIn !== true && !guestEmail.trim())
                ? 'bg-slate-300'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl active:scale-95'
            }`}
          >
            {state === 'join' && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 shadow-lg" />
            )}
            I&apos;m in
          </button>
          
          <button
            onClick={() => isLoggedIn === true ? sendRSVP('maybe') : sendGuestRSVP('maybe')}
            disabled={busy || (isLoggedIn !== true && !guestEmail.trim())}
            className={`relative rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 shadow-lg transition-all duration-200 hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
              state === 'maybe' ? 'ring-2 ring-amber-500' : ''
            }`}
          >
            {state === 'maybe' && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 shadow-lg" />
            )}
            Maybe
          </button>
          
          <button
            onClick={() => isLoggedIn === true ? sendRSVP('decline') : sendGuestRSVP('decline')}
            disabled={busy || (isLoggedIn !== true && !guestEmail.trim())}
            className={`relative rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 shadow-lg transition-all duration-200 hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
              state === 'decline' ? 'ring-2 ring-red-500' : ''
            }`}
          >
            {state === 'decline' && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 shadow-lg" />
            )}
            Can&apos;t make it
          </button>
        </div>

        {/* Success Animation */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl animate-pulse">
              ✓ RSVP saved!
            </div>
          </div>
        )}

        {/* Confirmation messages */}
        {state && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
            <p className="font-semibold text-blue-700">
              {state === 'join'
                ? 'Great — see you there!'
                : state === 'maybe'
                ? 'Got it — maybe!'
                : 'No worries, thanks for replying!'}
            </p>
          </div>
        )}
      </div>
    </main>
    </>
  );
}
