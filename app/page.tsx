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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
      setChecking(false);
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

  if (checking) {
    return <main style={{ padding: 24 }}>Loading…</main>;
  }

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1.02); }
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
      
      <main style={{ 
        maxWidth: 600, 
        margin: '4rem auto', 
        padding: '2rem 1.5rem',
        textAlign: 'center'
      }}>
      {/* Hero Section */}
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ 
          fontSize: '4rem',
          fontWeight: '800',
          margin: '0 0 1rem',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em'
        }}>
          Nowish
        </h1>
        <div style={{ 
          fontSize: '1.5rem',
          marginBottom: '0.5rem',
          color: '#6b7280'
        }}>
          ⚡️
        </div>
        <p style={{ 
          fontSize: '1.25rem',
          color: '#6b7280',
          margin: '0 0 1rem',
          fontWeight: '500'
        }}>
          Built for the moment — to see who&apos;s in.
        </p>
        <p style={{ 
          fontSize: '1rem',
          color: '#9ca3af',
          margin: '0 0 2rem',
          fontWeight: '400'
        }}>
          Nowish is for spontaneous hangs.<br />
          Text it like you normally would; we make it look good.
        </p>
      </div>

      {/* Preview Card */}
      <div style={{ 
        margin: '0 auto 3rem',
        maxWidth: '320px',
        background: '#f8f9fa',
        borderRadius: '16px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        animation: cardAnimated ? 'pulse 0.4s ease-in-out' : 'none',
        transform: cardAnimated ? 'scale(1.02)' : 'scale(1)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            ☕ Coffee hang?
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            marginBottom: '8px'
          }}>
            Today at 3:00 PM to 5:00 PM
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            marginBottom: '12px'
          }}>
            from Sarah
          </div>
          <div style={{ 
            fontSize: '12px',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            Built for the moment — to see who&apos;s in.
          </div>
        </div>
        <div style={{ 
          textAlign: 'center', 
          marginTop: '8px',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          Tap to RSVP · Works in iMessage/WhatsApp
        </div>
      </div>

      {/* User Status */}
      {email && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 100%)',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            margin: '0 0 2rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}
        >
          <p style={{ 
            margin: 0, 
            fontSize: '0.95rem',
            color: '#475569',
            fontWeight: '500'
          }}>
            Signed in as <strong style={{ color: '#1e293b' }}>{email}</strong>
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'grid', 
        gap: '1rem', 
        marginTop: '2rem',
        maxWidth: '400px',
        margin: '2rem auto 0'
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
          marginTop: '8px',
          lineHeight: '1.4'
        }}>
          <div>Takes ~10 seconds. No app required.</div>
          <div>You&apos;ll share a link. Friends don&apos;t need an account.</div>
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

      {/* Why Nowish Section */}
      <div style={{ 
        marginTop: '3rem',
        padding: '2rem',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '16px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ 
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 1.5rem',
          textAlign: 'center'
        }}>
          Why Nowish?
        </h3>
        <div style={{ 
          display: 'grid', 
          gap: '1rem',
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
            <span style={{ fontSize: '1.5rem' }}>🔗</span>
            <span style={{ color: '#475569', fontWeight: '500' }}>
              One link with everything — title, time & map in one place
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
            <span style={{ fontSize: '1.5rem' }}>👆</span>
            <span style={{ color: '#475569', fontWeight: '500' }}>
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
            <span style={{ fontSize: '1.5rem' }}>📱</span>
            <span style={{ color: '#475569', fontWeight: '500' }}>
              No app to install — send over text, works with your messaging
            </span>
          </div>
        </div>
        
        {/* Trust Microcopy */}
        <div style={{ 
          textAlign: 'center',
          marginTop: '2rem',
          fontSize: '0.75rem',
          color: '#9ca3af'
        }}>
          No contacts upload. We won&apos;t text anyone unless they opt in.
        </div>
      </div>
      </main>
    </>
  );
}