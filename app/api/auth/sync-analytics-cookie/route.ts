'use server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isEmailAllowedForAnalytics } from '@/lib/analyticsAuth';

const COOKIE_NAME = 'nowish-analytics-email';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: Request) {
  try {
    const { accessToken } = (await req.json()) as { accessToken?: string };
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data?.user?.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const email = data.user.email.toLowerCase();

    if (!isEmailAllowedForAnalytics(email)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set({
      name: COOKIE_NAME,
      value: email,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('sync analytics cookie error', error);
    return NextResponse.json({ error: 'Failed to sync cookie' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}

