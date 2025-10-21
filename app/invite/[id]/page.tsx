import { createClient } from '@supabase/supabase-js';
import InviteClient from './InviteClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseKey, { global: { fetch } });

// Use a stable IANA timezone for rendering OG/meta previews.
// You can set NEXT_PUBLIC_DEFAULT_TZ in Vercel if you prefer another.
const DEFAULT_TZ = process.env.NEXT_PUBLIC_DEFAULT_TZ || 'America/Chicago';

function formatWindow(startISO?: string | null, endISO?: string | null, tz = DEFAULT_TZ) {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO);
  const end = new Date(endISO);

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    dateStyle: 'medium',
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeStyle: 'short',
  });

  const sameDay =
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(start) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, dateStyle: 'short' }).format(end);

  const datePart = dateFmt.format(start);
  const startTime = timeFmt.format(start);
  const endTime = timeFmt.format(end);

  return sameDay ? `${datePart}, ${startTime} – ${endTime}` : `${datePart} ${startTime} → ${dateFmt.format(end)} ${endTime}`;
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://nowish.vercel.app';
  // ...fetch invite, build title/when like before...
  const img1 = `${base}/api/og/${params.id}.png?v=4`;        // dynamic, rich card
  const img2 = `${base}/og-fallback.png?v=1`;                 // instant static fallback

  return {
    title,
    description: when,
    openGraph: {
      title, description: when, url: `${base}/invite/${params.id}`, siteName: 'Nowish',
      images: [
        { url: img1, width: 1200, height: 630, alt: 'Nowish Invite' },
        { url: img2, width: 1200, height: 630, alt: 'Nowish Invite (fallback)' },
      ],
    },
    twitter: {
      card: 'summary_large_image', title, description: when, images: [img1, img2],
    },
    other: {
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/png',
      'og:image:secure_url': img1,
    },
  };
}

export default async function InvitePage({ params }: { params: { id: string } }) {
  const { data: invite } = await supabaseServer
    .from('open_invites')
    .select('id, title, window_start, window_end, creator_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!invite) {
    return (
      <main style={{ maxWidth: 720, margin: '1.5rem auto', padding: 16 }}>
        <h1>Invite not found</h1>
        <p>This invite may have been deleted or the link is incorrect.</p>
      </main>
    );
  }

  const when = formatWindow(invite.window_start, invite.window_end) ?? '';

  return (
    <main style={{ maxWidth: 720, margin: '1.5rem auto', padding: 16 }}>
      <h1 style={{ fontSize: 'clamp(24px,5vw,36px)' }}>{invite.title}</h1>
      <p style={{ color: '#555' }}>{when}</p>

      {/* Client component handles RSVP interactions + identity prompt for guests */}
      <InviteClient inviteId={invite.id} />
    </main>
  );
}