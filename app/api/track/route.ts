'use server';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type AllowedEvent =
  | 'landing_view'
  | 'create_click'
  | 'invite_open'
  | 'rsvp_tap'
  | 'footer_create_click'
  | 'add_to_calendar';

const ALLOWED_EVENTS = new Set<AllowedEvent>([
  'landing_view',
  'create_click',
  'invite_open',
  'rsvp_tap',
  'footer_create_click',
  'add_to_calendar',
]);

type TrackRequestBody = {
  event?: string;
  sessionId?: string;
  inviteId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TrackRequestBody;
    const { event, sessionId, inviteId, userId, metadata, occurredAt } = body;

    if (!event || !ALLOWED_EVENTS.has(event as AllowedEvent)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    const cleanedMetadata: Record<string, unknown> = isPlainObject(metadata) ? { ...metadata } : {};
    const userAgent = req.headers.get('user-agent');
    if (userAgent) cleanedMetadata.userAgent = userAgent;
    const referer = req.headers.get('referer');
    if (referer) cleanedMetadata.referer = referer;

    // Limit metadata size to avoid oversized payloads
    const metadataString = JSON.stringify(cleanedMetadata);
    if (metadataString.length > 4000) {
      return NextResponse.json({ error: 'Metadata too large' }, { status: 400 });
    }

    const occurredAtIso =
      occurredAt && !Number.isNaN(Date.parse(occurredAt)) ? new Date(occurredAt).toISOString() : undefined;

    const { error } = await supabaseAdmin.from('analytics_events').insert({
      event,
      session_id: typeof sessionId === 'string' ? sessionId.slice(0, 128) : null,
      user_id: typeof userId === 'string' ? userId : null,
      invite_id: typeof inviteId === 'string' ? inviteId : null,
      metadata: cleanedMetadata,
      occurred_at: occurredAtIso,
    });

    if (error) {
      console.error('Failed to insert analytics event', error);
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Analytics track error', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

