'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return <main style={{ padding: 24 }}>Loading…</main>;
  }

  return (
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
          margin: '0 0 2rem',
          fontWeight: '500'
        }}>
          Spontaneous hangs with your people
        </p>
      </div>

      {/* User Status */}
      {email ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 100%)',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            margin: '0 0 2rem',
            border: '1px solid #e2e8f0',
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
      ) : (
        <div style={{ 
          background: '#fef3c7',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          margin: '0 0 2rem',
          border: '1px solid #fbbf24'
        }}>
          <p style={{ 
            margin: 0, 
            color: '#92400e',
            fontSize: '0.95rem',
            fontWeight: '500'
          }}>
            <button 
              onClick={() => router.push('/login')}
              style={{ 
                color: '#92400e', 
                textDecoration: 'underline',
                fontWeight: '600',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Log in
            </button> to create and manage invites
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
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          Create an invite
        </button>

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

        {!email && (
          <button
            onClick={() => router.push('/login')}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              padding: '1rem 2rem',
              background: '#f3f4f6',
              color: '#374151',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              fontWeight: '600',
              fontSize: '1.1rem',
              cursor: 'pointer'
            }}
          >
            Log in
          </button>
        )}
      </div>
    </main>
  );
}