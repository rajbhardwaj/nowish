'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nextUrl, setNextUrl] = useState('/create');

  // Get the next URL from query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const next = urlParams.get('next');
    if (next) {
      setNextUrl(next);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      const result = await supabase.auth.signInWithOtp({
        email,
        options: { 
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}` 
        },
      });

      if (result.error) {
        alert(result.error.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      console.error(err);
      alert('Could not send magic link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Nowish ⚡</h1>
          <p className="text-slate-600">Get started with a magic link</p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
          {!sent ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-slate-900">
                  Enter your email
                </label>
                <p className="text-sm text-slate-600">
                  We&apos;ll send you a magic link to sign in
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className={`w-full rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 disabled:cursor-not-allowed ${
                  busy
                    ? 'bg-slate-300'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl active:scale-95'
                }`}
              >
                {busy ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">Check your inbox!</h2>
                <p className="text-slate-600">
                  We&apos;ve sent a magic link to <span className="font-medium">{email}</span>
                </p>
                <p className="text-sm text-slate-500">
                  Click the link in your email to sign in
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}