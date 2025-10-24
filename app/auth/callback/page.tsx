'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

function CallbackInner() {
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        // allow override like /auth/callback?next=/create
        const next = params.get('next') || '/create';

        // 1) magic-link flow with ?code=
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            window.location.replace('/login');
            return;
          }
          
          // Check if user needs to set their name
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', user.id)
              .single();
            
            // If user doesn't have a display name, redirect to name setup
            if (!profile?.display_name) {
              window.location.replace('/setup-name?next=' + encodeURIComponent(next));
              return;
            }
          }
          
          window.location.replace(next);
          return;
        }

        // 2) hash-token flow: /auth/callback#access_token=...&refresh_token=...
        const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
        if (hasHash) {
          const hash = new URLSearchParams(window.location.hash.slice(1));
          const access_token = hash.get('access_token') || '';
          const refresh_token = hash.get('refresh_token') || '';
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
              window.location.replace('/login');
              return;
            }
            
            // Check if user needs to set their name
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', user.id)
                .single();
              
              // If user doesn't have a display name, redirect to name setup
              if (!profile?.display_name) {
                window.location.replace('/setup-name?next=' + encodeURIComponent(next));
                return;
              }
            }
            
            window.location.replace(next);
            return;
          }
        }

        // nothing useful found → back to login
        window.location.replace('/login');
      } catch (error) {
        console.error('Auth callback error:', error);
        window.location.replace('/login');
      }
    })();

    // Fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      window.location.replace('/login');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [params]);

  return (
    <main className="max-w-2xl mx-auto px-6 py-4 text-center pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Signing you in…</div>
      </div>
    </main>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <main className="max-w-2xl mx-auto px-6 py-4 text-center pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Loading…</div>
        </div>
      </main>
    }>
      <CallbackInner />
    </Suspense>
  );
}