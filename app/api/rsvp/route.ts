import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { inviteId, state, guestName, guestEmail } = await req.json();

    if (!inviteId || !state || !['join','maybe','decline'].includes(state)) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    // 1) Load invite: creator + circles + still active
    const { data: invite, error: invErr } = await supabaseAdmin
      .from('open_invites')
      .select('id, creator_id, circle_ids, window_end')
      .eq('id', inviteId)
      .maybeSingle();

    if (invErr || !invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    if (new Date(invite.window_end).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 400 });
    }

    // 2) If guest provided an email, upsert them into each circle
    let memberId: string | null = null;

    if (guestEmail && guestEmail.length > 3 && Array.isArray(invite.circle_ids)) {
      for (const circleId of invite.circle_ids as string[]) {
        // Try find existing member by email
        const { data: existing, error: findErr } = await supabaseAdmin
          .from('circle_members')
          .select('id')
          .eq('circle_id', circleId)
          .eq('email', guestEmail)
          .maybeSingle();

        if (findErr) console.error(findErr);

        if (!existing) {
          const { data: inserted, error: insErr } = await supabaseAdmin
            .from('circle_members')
            .insert({ circle_id: circleId, name: guestName || null, email: guestEmail })
            .select('id')
            .single();
          if (!insErr && inserted) memberId = inserted.id;
        } else {
          memberId = existing.id;
        }
      }
    }

    // 3) Insert RSVP (memberId may be null if no email provided)
    const { error: rsvpErr } = await supabaseAdmin
      .from('rsvps')
      .insert({
        invite_id: inviteId,
        member_id: memberId,
        guest_name: guestName || null,
        guest_email: guestEmail || null,
        state
      });

    if (rsvpErr) return NextResponse.json({ error: rsvpErr.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}