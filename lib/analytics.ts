'use client';

import { supabase } from '@/lib/supabaseClient';

export type AnalyticsEvent =
  | 'landing_view'
  | 'create_click'
  | 'invite_open'
  | 'rsvp_tap'
  | 'footer_create_click'
  | 'add_to_calendar';

type TrackOptions = {
  inviteId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
};

const SESSION_STORAGE_KEY = 'nowish_session_id';
let cachedSessionId: string | null = null;

function ensureSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  if (cachedSessionId) return cachedSessionId;
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      cachedSessionId = existing;
      return cachedSessionId;
    }
    const generated = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
    cachedSessionId = generated;
    return cachedSessionId;
  } catch (error) {
    console.warn('Unable to access localStorage for analytics session', error);
    return null;
  }
}

async function resolveUserId(provided?: string | null) {
  if (provided) return provided;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch (error) {
    console.warn('Error resolving user ID for analytics', error);
    return null;
  }
}

export async function track(event: AnalyticsEvent, options: TrackOptions = {}) {
  if (typeof window === 'undefined') return;

  const sessionId = ensureSessionId();
  const userId = await resolveUserId(options.userId ?? null);

  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        sessionId,
        inviteId: options.inviteId ?? null,
        userId,
        metadata: options.metadata ?? {},
        occurredAt: options.occurredAt ? options.occurredAt.toISOString() : undefined,
      }),
    });
  } catch (error) {
    console.warn('Analytics track failed', error);
  }
}

export function resetSessionForTesting() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  cachedSessionId = null;
}

