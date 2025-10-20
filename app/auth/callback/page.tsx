'use client';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      router.replace('/login');
      return;
    }
    // Exchange the code from the magic link for a session
    await supabase.auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          router.replace('/login');
        } else {
          router.replace('/create'); // land on Create after sign-in
        }
      });
  }, [params, router]);

  return <main style={{padding:24}}>Signing you in…</main>;
}
