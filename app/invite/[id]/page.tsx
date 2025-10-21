// app/invite/[id]/page.tsx
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import InviteClient from './InviteClient'; // expects { inviteId: string }

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DEFAULT_TZ = process.env.NEXT_PUBLIC_DEFAULT_TZ || 'America/Los_Angeles';

// ---- Helper for formatting ----
function formatWhen(startISO?: string | null, endISO?: string | null, tz = DEFAULT_TZ) {
  if (!startISO || !endISO) return 'Happening soon';
  const start = new Date(startISO);
  const end = new Date(endISO);

  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start);

  const t = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  });

  const same =
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(start) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(end);

  return same
    ? `${day} • ${t.format(start)} – ${t.format(end)}`
    : `${day} ${t.format(start)} → ${new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        month: 'short',
        day: 'numeric',
      }).format(end)} ${t.format(end)}`;
}

// ---- Metadata for OG images ----
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://nowish.vercel.app';

  const { data: invite } = await supabaseServer
    .from('open_invites')
    .select('id, title, window_start, window_end')
    .eq('id', id)
    .maybeSingle();

  const title = invite?.title ? `Nowish: ${invite.title}` : 'Nowish Invite';
  const when = formatWhen(invite?.window_start, invite?.window_end);
  // Try static image first to test if meta tags work
  const ogUrl = `${base}/invite/${id}/opengraph-image`;

  return {
    title,
    description: when,
    openGraph: {
      type: 'website',
      title,
      description: when,
      url: `${base}/invite/${id}`,
      siteName: 'Nowish',
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: 'Nowish Invite',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: when,
      images: [ogUrl],
    },
    alternates: { canonical: `${base}/invite/${id}` },
    other: {
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/png',
      'og:image:secure_url': ogUrl,
      'og:locale': 'en_US',
      'og:updated_time': new Date().toISOString(),
      'og:image:alt': 'Nowish Invite',
      'og:image:url': ogUrl,
      'og:image': ogUrl,
    },
  };
}

// ---- Page component (server) ----
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Optional: verify invite exists
  const { data: exists } = await supabaseServer
    .from('open_invites')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!exists) return notFound();

  // Render the interactive client component
  return <InviteClient inviteId={id} />;
}