import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type RsvpState = 'join' | 'maybe' | 'decline';

interface RsvpRow {
  state: RsvpState;
  guest_name: string | null;
  guest_email: string | null;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { inviteId, rsvpData } = (await request.json()) as {
      inviteId: string;
      rsvpData: RsvpRow[];
    };

    if (!inviteId || !rsvpData) {
      return Response.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Get invite details
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('open_invites')
      .select('title, host_name, start_time, end_time, location, creator_id')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      return Response.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Get creator's email from auth.users
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (usersError || !users?.users) {
      return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const creator = users.users.find(user => user.id === invite.creator_id);
    if (!creator?.email) {
      return Response.json({ error: 'Creator email not found' }, { status: 404 });
    }

    // Format the email content
    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const joinCount = rsvpData.filter((rsvp: RsvpRow) => rsvp.state === 'join').length;
    const maybeCount = rsvpData.filter((rsvp: RsvpRow) => rsvp.state === 'maybe').length;
    
    const joinNames = rsvpData
      .filter((rsvp: RsvpRow) => rsvp.state === 'join')
      .map((rsvp: RsvpRow) => rsvp.guest_name || 'Someone')
      .join(', ');
    
    const maybeNames = rsvpData
      .filter((rsvp: RsvpRow) => rsvp.state === 'maybe')
      .map((rsvp: RsvpRow) => rsvp.guest_name || 'Someone')
      .join(', ');

    const totalCount = joinCount + maybeCount;
    const emoji = totalCount === 1 ? '🎉' : '🎉🎉';

    let attendanceText = '';
    if (joinCount > 0 && maybeCount > 0) {
      attendanceText = `${joinNames} are in, ${maybeNames} maybe`;
    } else if (joinCount > 0) {
      attendanceText = `${joinNames} ${joinCount === 1 ? 'is' : 'are'} in`;
    } else if (maybeCount > 0) {
      attendanceText = `${maybeNames} ${maybeCount === 1 ? 'is' : 'are'} maybe`;
    }

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'Nowish <notifications@nowish.app>',
      to: [creator.email],
      subject: `${emoji} Someone's in!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #fdf2f8 0%, #e0e7ff 50%, #ddd6fe 100%); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1e293b; font-size: 24px; margin: 0 0 10px 0; font-weight: 600;">
              ${emoji} Someone's in!
            </h1>
            <p style="color: #64748b; font-size: 16px; margin: 0;">
              Your invite is getting responses
            </p>
          </div>
          
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 16px 0; font-weight: 600;">
              ${invite.title}
            </h2>
            
            <div style="margin-bottom: 16px;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 4px 0; font-weight: 500;">WHEN</p>
              <p style="color: #1e293b; font-size: 16px; margin: 0; font-weight: 600;">
                ${formatTime(invite.start_time)} - ${formatTime(invite.end_time)}
              </p>
            </div>
            
            ${invite.location ? `
            <div style="margin-bottom: 16px;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 4px 0; font-weight: 500;">WHERE</p>
              <p style="color: #1e293b; font-size: 16px; margin: 0; font-weight: 600;">
                ${invite.location}
              </p>
            </div>
            ` : ''}
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 20px;">
              <p style="color: #1e293b; font-size: 16px; margin: 0; font-weight: 600;">
                ${attendanceText}
              </p>
              <p style="color: #64748b; font-size: 14px; margin: 8px 0 0 0;">
                ${totalCount} ${totalCount === 1 ? 'person' : 'people'} ${totalCount === 1 ? 'has' : 'have'} responded
              </p>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://nowish.app'}/host/${inviteId}" 
               style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View all responses
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              This is an automated notification from Nowish
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return Response.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Email API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
