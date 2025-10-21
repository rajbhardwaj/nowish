// app/invite/[id]/page.tsx
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import InviteClient from './InviteClient'; // <-- use the file you already have

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
export async function generateMetadata({ params }: { params: { id: string } }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://nowish.vercel.app';

  const { data: invite } = await supabaseServer
    .from('open_invites')
    .select('id, title, window_start, window_end')
    .eq('id', params.id)
    .maybeSingle();

  const title = invite?.title ? `Nowish: ${invite.title}` : 'Nowish Invite';
  const when = formatWhen(invite?.window_start, invite?.window_end);

  const imgDynamic = `${base}/api/og/${params.id}.png?v=5`;
  const imgFallback = `${base}/og-fallback.png?v=1`;

  return {
    title,
    description: when,
    openGraph: {
      title,
      description: when,
      url: `${base}/invite/${params.id}`,
      siteName: 'Nowish',
      images: [
        { url: imgDynamic, width: 1200, height: 630, alt: 'Nowish Invite' },
        { url: imgFallback, width: 1200, height: 630, alt: 'Nowish Invite (fallback)' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: when,
      images: [imgDynamic, imgFallback],
    },
    alternates: { canonical: `${base}/invite/${params.id}` },
    other: {
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/png',
      'og:image:secure_url': imgDynamic,
    },
  };
}

// ---- Page component (server) ----
export default async function Page({ params }: { params: { id: string } }) {
  const { data: invite } = await supabaseServer
    .from('open_invites')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!invite) return notFound();

  // Render the interactive client component
  return <InviteClient invite={invite} />;
}