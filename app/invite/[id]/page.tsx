import { createClient } from '@supabase/supabase-js';
import InviteClient from './InviteClient';

// Server-side Supabase (anon key OK on server)
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { global: { fetch } }
);

export async function generateMetadata({ params }: { params: { id: string } }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://nowish.vercel.app';

  const { data: invite } = await supabaseServer
    .from('open_invites')
    .select('id, title, window_start, window_end')
    .eq('id', params.id)
    .maybeSingle();

  const title = invite?.title ? `Nowish: ${invite.title}` : 'Nowish Invite';
  const desc =
    invite?.window_start && invite?.window_end
      ? new Date(invite.window_start).toLocaleString([], {
          dateStyle: 'medium',
          timeStyle: 'short',
        }) +
        ' – ' +
        new Date(invite.window_end).toLocaleTimeString([], {
          timeStyle: 'short',
        })
      : 'Join this Nowish invite';

  const ogImage = `${base}/invite/${params.id}/opengraph-image`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `${base}/invite/${params.id}`,
      siteName: 'Nowish',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImage],
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

  return (
    <main style={{ maxWidth: 720, margin: '1.5rem auto', padding: 16 }}>
      <h1 style={{ fontSize: 'clamp(24px,5vw,36px)' }}>{invite.title}</h1>
      <p style={{ color: '#555' }}>
        {invite.window_start
          ? new Date(invite.window_start).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            }) +
            ' – ' +
            new Date(invite.window_end).toLocaleTimeString([], {
              timeStyle: 'short',
            })
          : ''}
      </p>

      {/* Client component handles RSVP interactions */}
      <InviteClient inviteId={invite.id} />
    </main>
  );
}