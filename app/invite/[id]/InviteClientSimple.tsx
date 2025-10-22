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
  const [showGuestForm, setShowGuestForm] = useState(false);

  async function sendRSVP(status: 'join' | 'maybe' | 'decline') {
    if (busy) return;
    
    setBusy(true);
    try {
      setState(status);
      
      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;
      
      if (!userEmail) {
        // If not logged in, show guest form
        setShowGuestForm(true);
        setState(null); // Reset state since we need guest info first
        setBusy(false);
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
        setShowGuestForm(false); // Hide form after successful save
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
        background: '#f8f9fa', 
        borderRadius: 12, 
        border: '1px solid #e9ecef',
        maxWidth: 500,
        marginInline: 'auto'
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#212529' }}>
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
          <p style={{ margin: 0, fontSize: 16, color: '#6c757d' }}>
            from {invite.host_name}
          </p>
        )}
      </div>

      {/* Guest form */}
      {showGuestForm && (
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
          onClick={() => showGuestForm ? sendGuestRSVP('join') : sendRSVP('join')}
          disabled={busy}
          style={{ background: '#111', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 600, minWidth: 110 }}
        >
          I&apos;m in
        </button>
        <button
          onClick={() => showGuestForm ? sendGuestRSVP('maybe') : sendRSVP('maybe')}
          disabled={busy}
          style={{ background: '#f4f4f4', border: '1px solid #ccc', padding: '10px 18px', borderRadius: 8, fontWeight: 600, minWidth: 110 }}
        >
          Maybe
        </button>
        <button
          onClick={() => showGuestForm ? sendGuestRSVP('decline') : sendRSVP('decline')}
          disabled={busy}
          style={{ background: 'transparent', border: '1px solid #ccc', padding: '10px 18px', borderRadius: 8, color: '#777', fontWeight: 600, minWidth: 110 }}
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
