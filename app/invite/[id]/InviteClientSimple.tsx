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
      
      // Save RSVP to database (logged in user)
      const { data, error } = await supabase
        .from('rsvps')
        .upsert({
          invite_id: inviteId,
          state: status,
          guest_email: userEmail,
          guest_name: null,
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

        // Fetch RSVP counts
        const { data: rsvpData, error: rsvpError } = await supabase
          .from('rsvps')
          .select('response')
          .eq('invite_id', inviteId);

        if (!rsvpError && rsvpData) {
          const counts = rsvpData.reduce((acc, rsvp) => {
            if (rsvp.response === 'join') acc.join++;
            else if (rsvp.response === 'maybe') acc.maybe++;
            else if (rsvp.response === 'decline') acc.decline++;
            return acc;
          }, { join: 0, maybe: 0, decline: 0 });
          setRsvpCounts(counts);
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
    return <div style={{ marginTop: 24, textAlign: 'center' }}>Loading...</div>;
  }

  if (!invite) {
    return <div style={{ marginTop: 24, textAlign: 'center' }}>
      <h1>Invite Not Found</h1>
      <p>ID: {inviteId}</p>
    </div>;
  }

  return (
    <div style={{ marginTop: 24, textAlign: 'center' }}>
      <div style={{ 
        marginBottom: 32, 
        padding: 24, 
        background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #f3e8ff 100%)', 
        borderRadius: 16, 
        border: '1px solid #a5b4fc',
        maxWidth: 500,
        marginInline: 'auto',
        boxShadow: '0 8px 25px -5px rgba(59, 130, 246, 0.2), 0 4px 6px -2px rgba(139, 92, 246, 0.1), 0 0 0 1px rgba(59, 130, 246, 0.1)'
      }}>
        <h1 style={{ 
          margin: '0 0 12px', 
          fontSize: 32, 
          fontWeight: 700, 
          color: '#1e293b',
          fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          letterSpacing: '-0.025em'
        }}>
          {invite.title}
        </h1>
        <p style={{ margin: '0 0 8px', fontSize: 18, color: '#495057', fontWeight: 500 }}>
          {formatTimeNicely(invite.window_start, invite.window_end)}
        </p>
        {invite.host_name && (
          <p style={{ margin: '0 0 12px', fontSize: 16, color: '#6c757d' }}>
            from {invite.host_name}
          </p>
        )}
        
        {/* RSVP Counts */}
        {(rsvpCounts.join > 0 || rsvpCounts.maybe > 0 || rsvpCounts.decline > 0) && (
          <div style={{ 
            margin: '0 0 12px', 
            padding: '8px 12px', 
            background: 'rgba(255, 255, 255, 0.7)', 
            borderRadius: 8,
            fontSize: 14,
            color: '#475569'
          }}>
            {rsvpCounts.join > 0 && (
              <span style={{ color: '#059669', fontWeight: 600 }}>
                {rsvpCounts.join} {rsvpCounts.join === 1 ? 'person is' : 'people are'} in
              </span>
            )}
            {rsvpCounts.join > 0 && rsvpCounts.maybe > 0 && <span> • </span>}
            {rsvpCounts.maybe > 0 && (
              <span style={{ color: '#d97706', fontWeight: 600 }}>
                {rsvpCounts.maybe} {rsvpCounts.maybe === 1 ? 'person is' : 'people are'} maybe
              </span>
            )}
          </div>
        )}
        
        <p style={{ margin: 0, fontSize: 14, color: '#6c757d', fontStyle: 'italic' }}>
          Built for the moment — to see who&apos;s in.
        </p>
      </div>

      {/* Guest form - show by default, hide only if confirmed logged in */}
      {isLoggedIn !== true && (
        <div style={{ 
          marginBottom: 20, 
          padding: 16, 
          background: '#f8f9fa', 
          borderRadius: 8, 
          border: '1px solid #e9ecef',
          maxWidth: 400,
          marginInline: 'auto'
        }}>
          <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>
            Let the host know who you are:
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
            />
            <input
              type="email"
              placeholder="Your email (helps for future invites)"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
            />
          </div>
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        justifyContent: 'center', 
        flexWrap: 'wrap',
        padding: '0 16px'
      }}>
        <button
          onClick={() => isLoggedIn === true ? sendRSVP('join') : sendGuestRSVP('join')}
          disabled={busy || (isLoggedIn !== true && !guestEmail.trim())}
          style={{ 
            background: isLoggedIn !== true && !guestEmail.trim() ? '#ccc' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
            color: '#fff', 
            border: 'none', 
            padding: '14px 24px', 
            borderRadius: 12, 
            fontWeight: 600, 
            minWidth: 120,
            minHeight: 48,
            fontSize: 16,
            boxShadow: isLoggedIn !== true && !guestEmail.trim() ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          I&apos;m in
        </button>
        <button
          onClick={() => isLoggedIn === true ? sendRSVP('maybe') : sendGuestRSVP('maybe')}
          disabled={busy || (isLoggedIn !== true && !guestEmail.trim())}
          style={{ 
            background: isLoggedIn !== true && !guestEmail.trim() ? '#f0f0f0' : '#f4f4f4', 
            border: '1px solid #ccc', 
            padding: '14px 24px', 
            borderRadius: 12, 
            fontWeight: 600, 
            minWidth: 120,
            minHeight: 48,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Maybe
        </button>
        <button
          onClick={() => isLoggedIn === true ? sendRSVP('decline') : sendGuestRSVP('decline')}
          disabled={busy || (isLoggedIn !== true && !guestEmail.trim())}
          style={{ 
            background: 'transparent', 
            border: '1px solid #ccc', 
            padding: '14px 24px', 
            borderRadius: 12, 
            color: isLoggedIn !== true && !guestEmail.trim() ? '#ccc' : '#777', 
            fontWeight: 600, 
            minWidth: 120,
            minHeight: 48,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Can&apos;t make it
        </button>
      </div>

      {/* Success Animation */}
      {showSuccess && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '20px 30px',
          borderRadius: '16px',
          fontSize: '18px',
          fontWeight: '600',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
          zIndex: 1000,
          animation: 'successPulse 0.6s ease-out'
        }}>
          ✓ RSVP saved!
        </div>
      )}

      {/* Confirmation messages */}
      {state && (
        <p style={{ marginTop: 16, color: '#0070f3', fontWeight: 600 }}>
          {state === 'join'
            ? 'Great — see you there!'
            : state === 'maybe'
            ? 'Got it — maybe!'
            : 'No worries, thanks for replying!'}
        </p>
      )}
    </div>
  );
}
