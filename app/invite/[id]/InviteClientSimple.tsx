'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
  
  if (isToday) {
    return `Today at ${startTime} to ${endTime}`;
  } else if (isTomorrow) {
    return `Tomorrow at ${startTime} to ${endTime}`;
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
    return `${startFormatted} to ${endFormatted}`;
  }
}

function formatNamesList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are`;
  if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]} are`;
  return `${names[0]}, ${names[1]}, and ${names.length - 2} more are`;
}

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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Check if user is logged in
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    })();
  }, []);

  async function sendRSVP(status: 'join' | 'maybe' | 'decline') {
    if (busy) return;
    
    setBusy(true);
    try {
      setState(status);
      
      // Get current user email (should be logged in at this point)
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;
      
      if (!userEmail) {
        alert('Please log in to RSVP.');
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
      
      if (error) {
        console.error('Failed to save RSVP:', error);
        alert(`Could not save RSVP: ${error.message}`);
        setState(null);
      } else {
        console.log('RSVP saved successfully:', data);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
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
    
    const email = guestEmail.trim();
    const name = guestName.trim();
    
    if (!email) {
      alert('Please enter your email address.');
      return;
    }
    
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    
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
      
      if (error) {
        console.error('Failed to save guest RSVP:', error);
        alert(`Could not save RSVP: ${error.message}`);
        setState(null);
      } else {
        console.log('Guest RSVP saved successfully:', data);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Guest RSVP error:', err);
      alert(`Unexpected error: ${(err as Error).message}`);
      setState(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    console.log('Fetching invite for ID:', inviteId);
    
    const fetchInvite = async () => {
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

        if (!rsvpError && rsvpData) {
          console.log('RSVP data:', rsvpData); // Debug log
          const counts = { join: 0, maybe: 0, decline: 0 };
          const names = { join: [] as string[], maybe: [] as string[] };
          
          rsvpData.forEach(rsvp => {
            if (rsvp.state === 'join') {
              counts.join++;
              // Use guest_name if available, otherwise use email username
              const displayName = rsvp.guest_name || 'Someone';
              console.log('Join RSVP:', { guest_name: rsvp.guest_name, displayName }); // Debug log
              names.join.push(displayName);
            } else if (rsvp.state === 'maybe') {
              counts.maybe++;
              const displayName = rsvp.guest_name || 'Someone';
              names.maybe.push(displayName);
            } else if (rsvp.state === 'decline') {
              counts.decline++;
            }
          });
          
          setRsvpCounts(counts);
          setRsvpNames(names);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Exception fetching invite:', err);
        setLoading(false);
      }
    };
    
    fetchInvite();
  }, [inviteId]);

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
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="space-y-6">
        {/* Invite Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 shadow-lg backdrop-blur-sm">
          {/* Subtle decorative pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/10 via-transparent to-purple-100/10"></div>
          
          <div className="relative space-y-4 text-center">
            {/* Title with emoji */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900">
                {invite.title}
              </h1>
              <p className="text-lg text-slate-600">
                {formatTimeNicely(invite.window_start, invite.window_end)}
              </p>
              {invite.host_name && (
                <p className="text-slate-500">
                  from {invite.host_name}
                </p>
              )}
            </div>
            
            {/* RSVP Counts */}
            {(rsvpCounts.join > 0 || rsvpCounts.maybe > 0 || rsvpCounts.decline > 0) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  {rsvpCounts.join > 0 && (
                    <span className="font-medium text-green-600">
                      👥 {formatNamesList(rsvpNames.join)} in
                    </span>
                  )}
                  {rsvpCounts.maybe > 0 && (
                    <span className="font-medium text-amber-600">
                      {formatNamesList(rsvpNames.maybe)} maybe
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <p className="text-sm text-slate-500 italic">
              Built for the moment — to see who&apos;s in.
            </p>
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
  );
}
