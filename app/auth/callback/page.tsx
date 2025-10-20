'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// tell Next not to prerender this route
export const dynamic = 'force-dynamic';

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      router.replace('/login');
      return;
    }

    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error(error);
        router.replace('/login');
      } else {
        router.replace('/create');
      }
    })();
  }, [params, router]);

  return <main style={{ padding: 24 }}>Signing you in…</main>;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading…</main>}>
      <CallbackInner />
    </Suspense>
  );
}