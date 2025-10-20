'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// prevent static prerender; this page must run on the client with the URL code
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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