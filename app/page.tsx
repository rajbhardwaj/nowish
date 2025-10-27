'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cardAnimated, setCardAnimated] = useState(false);
  const [totalInvites, setTotalInvites] = useState<number | null>(null);
  const [showWhyAccordion, setShowWhyAccordion] = useState(false);
  const [hasPulsed, setHasPulsed] = useState(false);
  const [showRipple, setShowRipple] = useState(false);

  const toggleWhyAccordion = () => {
    const newState = !showWhyAccordion;
    setShowWhyAccordion(newState);
    
    // If opening the accordion, scroll to it after a longer delay to ensure DOM update
    if (newState) {
      setTimeout(() => {
        const accordionElement = document.getElementById('why-accordion');
        if (accordionElement) {
          accordionElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 200);
    }
  };

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

  useEffect(() => {
    // Set checking to false immediately for faster initial render
    setChecking(false);
    
    // Load data in background
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setEmail(data.session?.user?.email ?? null);
        
        // Get total invites created (non-blocking)
        const { count } = await supabase
          .from('open_invites')
          .select('*', { count: 'exact', head: true });
        setTotalInvites(count);
      } catch (error) {
        console.error('Error loading page data:', error);
      }
    })();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCardAnimated(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Trigger lightning pulse on first visit
  useEffect(() => {
    if (!hasPulsed) {
      const timer = setTimeout(() => {
        setHasPulsed(true);
      }, 1500); // 1.5 seconds duration
      return () => clearTimeout(timer);
    }
  }, [hasPulsed]);

  if (checking) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-4 text-center pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Loading…</div>
        </div>
      </main>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1.02); }
        }
        @keyframes lightningPulse {
          0% { transform: scale(1); opacity: 1; }
          25% { transform: scale(1.1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          75% { transform: scale(1.08); opacity: 0.9; }
          100% { transform: scale(1); opacity: 1; }
        }
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
          animation: bounce 3s infinite;
          animation-play-state: running;
        }
        .bounce-emoji:hover {
          animation-play-state: paused;
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
      `}</style>
      
      {/* Top Navigation */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 10
      }}>
        {email ? (
          <button
            onClick={async () => {
              const { supabase } = await import('@/lib/supabaseClient');
              await supabase.auth.signOut();
              setEmail(null);
              router.push('/');
            }}
            style={{
              color: '#6b7280',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            Logout
          </button>
        ) : (
          <button
            onClick={() => router.push('/login')}
            style={{
              color: '#6b7280',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            Log in
          </button>
        )}
      </div>
      
      <main className="max-w-2xl mx-auto px-6 py-4 text-center pb-[max(120px,env(safe-area-inset-bottom))]">
      {/* Hero Section */}
      <div className="mb-4">
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
          Nowish
        </h1>
        <div className={`text-2xl mb-1 text-slate-500 ${!hasPulsed ? 'animate-pulse' : ''}`} style={{
          animation: !hasPulsed ? 'lightningPulse 1.5s ease-in-out' : 'none'
        }}>
          ⚡️
        </div>
        <div className="text-sm text-slate-500 mb-1 font-medium tracking-wide">
          About to do something?
        </div>
        <p className="text-xl text-slate-700 mb-3 font-medium leading-tight" style={{ textWrap: 'balance' }}>
          See who&apos;s in.
        </p>
      </div>

      {/* Preview Card */}
      <div 
        className={`ripple-effect ${showRipple ? 'ripple-effect' : ''}`}
        style={{ 
          margin: '0 auto 1rem',
          maxWidth: '320px',
          background: `linear-gradient(135deg, #fdf2f8 0%, #e0e7ff 50%, #ddd6fe 100%)`,
          borderRadius: '16px',
          padding: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          animation: cardAnimated ? 'pulse 0.4s ease-in-out' : 'none',
          transform: cardAnimated ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onTouchStart={handleCardTouch}
        onClick={handleCardTouch}
      >
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #faf5ff 100%)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Host line - muted */}
          <div style={{ 
            fontSize: '14px', 
            color: '#64748b',
            marginBottom: '12px'
          }}>
            Sarah is heading to…
          </div>
          
          {/* Big title with emoji */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              fontSize: '32px', 
              marginBottom: '8px'
            }}>
              <span className="bounce-emoji">☕</span>
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#0f172a',
              marginBottom: '8px'
            }}>
              Coffee
            </div>
          </div>
          
          {/* Time */}
          <div style={{ 
            fontSize: '16px', 
            color: '#334155',
            marginBottom: '8px'
          }}>
            Today, 3–5 PM
          </div>
          
          {/* Friendly invite line */}
          <div style={{ 
            fontSize: '12px', 
            color: '#64748b',
            fontStyle: 'italic',
            marginBottom: '12px'
          }}>
            If you&apos;re free, swing by ✨
          </div>
          
          {/* Attendance strip */}
          <div style={{
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            background: 'rgba(239, 246, 255, 0.5)',
            padding: '12px 16px',
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#15803d',
              fontWeight: '500'
            }}>
              Raj, Jenae, & 1 more are in
            </div>
          </div>
        </div>
        <div style={{ 
          textAlign: 'center', 
          marginTop: '8px',
          fontSize: '12px',
          color: '#9ca3af',
          position: 'relative',
          zIndex: 1
        }}>
          Tap to RSVP
        </div>
      </div>
      
      {/* Demo Card Caption */}
      <div style={{ 
        textAlign: 'center',
        marginTop: '0.25rem',
        fontSize: '0.7rem',
        color: '#9ca3af',
        fontStyle: 'italic'
      }}>
        For moments, not parties.
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'grid', 
        gap: '1rem', 
        marginTop: '1rem',
        maxWidth: '400px',
        margin: '1rem auto 0'
      }}>
        <button
          onClick={() => router.push('/create')}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: '#fff',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '600',
            fontSize: '1.1rem',
            boxShadow: isScrolled ? '0 8px 24px rgba(59, 130, 246, 0.4)' : '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            position: isScrolled ? 'sticky' : 'static',
            top: isScrolled ? '1rem' : 'auto',
            zIndex: isScrolled ? 50 : 'auto',
            marginBottom: isScrolled ? '1rem' : '0'
          }}
        >
          Create an invite
        </button>
        <div style={{ 
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#9ca3af',
          marginTop: '4px',
          lineHeight: '1.4'
        }}>
          No app for your friends. One link, tap to RSVP.
        </div>
        
        <div style={{ 
          textAlign: 'center',
          marginTop: '1rem'
        }}>
          <button
            onClick={toggleWhyAccordion}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Why Nowish?
          </button>
          {totalInvites !== null && (
            <div style={{
              fontSize: '0.7rem',
              color: '#9ca3af',
              marginTop: '0.25rem'
            }}>
              {totalInvites} invites created so far
            </div>
          )}
        </div>

        {email && (
          <button
            onClick={() => router.push('/my')}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              padding: '1rem 2rem',
              background: '#f8fafc',
              color: '#374151',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
          >
            See my invites
          </button>
        )}

      </div>

      {/* User Status */}
      {email && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 100%)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            margin: '1rem auto 0',
            maxWidth: '400px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}
        >
          <p style={{ 
            margin: 0, 
            fontSize: '0.8rem',
            color: '#475569',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            Signed in as <strong style={{ color: '#1e293b' }}>{email}</strong>
          </p>
        </div>
      )}

      {/* Why Nowish Accordion */}
      {showWhyAccordion && (
        <div 
          id="why-accordion"
          style={{ 
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
          <div style={{ 
            display: 'grid', 
            gap: '0.75rem',
            textAlign: 'left'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'white',
              borderRadius: '8px',
            }}>
              <span style={{ fontSize: '1.25rem' }}>🔗</span>
              <span style={{ color: '#475569', fontWeight: '500', fontSize: '0.9rem' }}>
                One link with everything — title & time in one place
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'white',
              borderRadius: '8px',
            }}>
              <span style={{ fontSize: '1.25rem' }}>👆</span>
              <span style={{ color: '#475569', fontWeight: '500', fontSize: '0.9rem' }}>
                Tap to RSVP — see who&apos;s in without the group-chat scroll
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'white',
              borderRadius: '8px',
            }}>
              <span style={{ fontSize: '1.25rem' }}>📱</span>
              <span style={{ color: '#475569', fontWeight: '500', fontSize: '0.9rem' }}>
                No app to install — send over text, works with your messaging
              </span>
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            marginTop: '1rem',
            fontSize: '0.7rem',
            color: '#9ca3af'
          }}>
            No contacts upload. We won&apos;t text anyone unless they opt in.
          </div>
        </div>
      )}

      </main>
    </>
  );
}