'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function SetupNameInner() {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/create';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.replace('/login');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          display_name: name.trim()
        });
      
      if (error) {
        alert('Failed to save name: ' + error.message);
        return;
      }
      
      // Redirect to the intended destination
      window.location.replace(next);
    } catch (err) {
      alert('Failed to save name');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Nowish ⚡</h1>
          <p className="text-slate-600">Let&apos;s personalize your invites</p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-lg font-semibold text-slate-900">
                What should we call you?
              </label>
              <p className="text-sm text-slate-600">
                This makes your invites more personal. People will see &quot;Raj would love to see you at...&quot; instead of your email.
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
                maxLength={50}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className={`w-full rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 disabled:cursor-not-allowed ${
                saving || !name.trim()
                  ? 'bg-slate-300'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl active:scale-95'
              }`}
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function SetupNamePage() {
  return (
    <Suspense fallback={
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Loading...</div>
        </div>
      </main>
    }>
      <SetupNameInner />
    </Suspense>
  );
}
