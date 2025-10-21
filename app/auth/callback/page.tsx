'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

function CallbackInner() {
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      // allow override like /auth/callback?next=/create
      const next = params.get('next') || '/create';

      // 1) magic-link flow with ?code=
      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        // even if error, send to login so user can retry
        window.location.replace(error ? '/login' : next);
        return;
      }

      // 2) hash-token flow: /auth/callback#access_token=...&refresh_token=...
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hash.get('access_token') || '';
        const refresh_token = hash.get('refresh_token') || '';
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          window.location.replace(error ? '/login' : next);
          return;
        }
      }

      // nothing useful found → back to login
      window.location.replace('/login');
    })();
  }, [params]);

  return <main style={{ padding: 24 }}>Signing you in…</main>;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading…</main>}>
      <CallbackInner />
    </Suspense>
  );
}