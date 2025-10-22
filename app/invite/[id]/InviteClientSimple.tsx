'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function InviteClientSimple({ inviteId }: { inviteId: string }) {
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<{
    id: string;
    title: string;
    window_start: string;
    window_end: string;
    host_name: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  
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
        // Form will be hidden automatically since user is now "logged in" conceptually
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
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
        borderRadius: 16, 
        border: '1px solid #cbd5e1',
        maxWidth: 500,
        marginInline: 'auto',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <h1 style={{ 
          margin: '0 0 12px', 
          fontSize: 32, 
          fontWeight: 800, 
          color: '#1e293b',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
        }}>
          {invite.title}
        </h1>
        <p style={{ margin: '0 0 8px', fontSize: 18, color: '#495057' }}>
          {new Date(invite.window_start).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })} to {new Date(invite.window_end).toLocaleString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
        {invite.host_name && (
          <p style={{ margin: '0 0 12px', fontSize: 16, color: '#6c757d' }}>
            from {invite.host_name}
          </p>
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
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => isLoggedIn === true ? sendRSVP('join') : sendGuestRSVP('join')}
          disabled={busy || (isLoggedIn !== true && !guestEmail.trim())}
          style={{ 
            background: isLoggedIn !== true && !guestEmail.trim() ? '#ccc' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
            color: '#fff', 
            border: 'none', 
            padding: '10px 18px', 
            borderRadius: 8, 
            fontWeight: 600, 
            minWidth: 110,
            boxShadow: isLoggedIn !== true && !guestEmail.trim() ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.3)'
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
            padding: '10px 18px', 
            borderRadius: 8, 
            fontWeight: 600, 
            minWidth: 110 
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
            padding: '10px 18px', 
            borderRadius: 8, 
            color: isLoggedIn !== true && !guestEmail.trim() ? '#ccc' : '#777', 
            fontWeight: 600, 
            minWidth: 110 
          }}
        >
          Can&apos;t make it
        </button>
      </div>

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
