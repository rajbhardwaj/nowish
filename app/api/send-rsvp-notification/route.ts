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
    console.log('Looking for invite with ID:', inviteId);
    
    // First, let's see what's actually in the open_invites table
    const { data: allInvites, error: allInvitesError } = await supabaseAdmin
      .from('open_invites')
      .select('id, title, creator_id')
      .limit(5);
    
    console.log('Sample invites in database:', { allInvites, allInvitesError });
    
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('open_invites')
      .select('title, host_name, window_start, window_end, creator_id')
      .eq('id', inviteId)
      .single();

    console.log('Invite query result:', { invite, inviteError });

    if (inviteError || !invite) {
      console.error('Invite not found:', inviteError);
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

    // Format time like the app does
    const formatTimeNicely = (startISO: string, endISO: string): string => {
      const start = new Date(startISO);
      const end = new Date(endISO);
      const now = new Date();
      
      // Check if it's today
      const isToday = start.toDateString() === now.toDateString();
      const isTomorrow = start.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
      
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      
      const startTime = start.toLocaleTimeString(undefined, timeOptions);
      const endTime = end.toLocaleTimeString(undefined, timeOptions);
      
      // Format times according to style guide
      const formatTime = (time: string) => {
        // Remove :00 minutes
        return time.replace(':00', '');
      };
      
      const startFormatted = formatTime(startTime);
      const endFormatted = formatTime(endTime);
      
      // Check if same meridiem
      const startMeridiem = startTime.includes('AM') ? 'AM' : 'PM';
      const endMeridiem = endTime.includes('AM') ? 'AM' : 'PM';
      const sameMeridiem = startMeridiem === endMeridiem;
      
      // Format start time - remove meridiem if same as end
      const startTimeOnly = startFormatted.replace(/ (AM|PM)/, '');
      const finalStartTime = sameMeridiem ? startTimeOnly : startFormatted;
      
      if (isToday) {
        return `Today, ${finalStartTime}–${endFormatted}`;
      } else if (isTomorrow) {
        return `Tomorrow, ${finalStartTime}–${endFormatted}`;
      } else {
        // For other days, show day and time
        const dayOptions: Intl.DateTimeFormatOptions = {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        };
        const startFormatted = start.toLocaleString(undefined, dayOptions);
        const endFormatted = end.toLocaleTimeString(undefined, timeOptions);
        return `${startFormatted}–${endFormatted}`;
      }
    };

    const joinCount = rsvpData.filter((rsvp: RsvpRow) => rsvp.state === 'join').length;
    const maybeCount = rsvpData.filter((rsvp: RsvpRow) => rsvp.state === 'maybe').length;
    
    const joinNames = rsvpData
      .filter((rsvp: RsvpRow) => rsvp.state === 'join')
      .map((rsvp: RsvpRow) => rsvp.guest_name || 'Someone');
    
    const maybeNames = rsvpData
      .filter((rsvp: RsvpRow) => rsvp.state === 'maybe')
      .map((rsvp: RsvpRow) => rsvp.guest_name || 'Someone');

    const totalCount = joinCount + maybeCount;
    
    // Format names list like the app does
    const formatNamesList = (names: string[]) => {
      if (names.length === 0) return '';
      if (names.length === 1) return `${names[0]} is`;
      if (names.length === 2) return `${names[0]} and ${names[1]} are`;
      if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]} are`;
      return `${names[0]}, ${names[1]}, and ${names.length - 2} more are`;
    };

    let attendanceText = '';
    if (joinCount > 0 && maybeCount > 0) {
      attendanceText = `${formatNamesList(joinNames)} in, ${formatNamesList(maybeNames)} maybe`;
    } else if (joinCount > 0) {
      attendanceText = `${formatNamesList(joinNames)} in`;
    } else if (maybeCount > 0) {
      attendanceText = `${formatNamesList(maybeNames)} maybe`;
    }

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'Nowish <notifications@mail.nowish.rsvp>',
      to: [creator.email],
      subject: `🎉🥳 Someone's in!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);">
          
          <!-- Celebration Card -->
          <div style="background: linear-gradient(135deg, #fdf2f8 0%, #ffffff 50%, #e0e7ff 100%); padding: 30px; border-radius: 16px; text-align: center; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #1e293b; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;">
              🎉🥳 Someone's in!
            </h1>
            <p style="color: #64748b; font-size: 16px; margin: 0;">
              Your invite is getting responses
            </p>
          </div>
          
          <!-- Event Details Card -->
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
            
            <!-- Event Title with Emoji -->
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-size: 32px; margin-bottom: 8px;">☕</div>
              <h2 style="color: #1e293b; font-size: 24px; margin: 0; font-weight: 700;">
                ${invite.title}
              </h2>
            </div>
            
            <!-- Time -->
            <div style="margin-bottom: 20px;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 4px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">WHEN</p>
              <p style="color: #1e293b; font-size: 18px; margin: 0; font-weight: 600;">
                ${formatTimeNicely(invite.window_start, invite.window_end)}
              </p>
            </div>
            
            <!-- Attendance -->
            <div style="background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0;">
              <p style="color: #1e293b; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">
                ${attendanceText}
              </p>
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                ${totalCount} ${totalCount === 1 ? 'person' : 'people'} ${totalCount === 1 ? 'has' : 'have'} responded
              </p>
            </div>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://nowish.app'}/host/${inviteId}" 
               style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              View all responses
            </a>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
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
