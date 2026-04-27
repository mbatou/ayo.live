import { Resend } from "resend";

interface TicketEmailParams {
  to: string;
  ticketToken: string;
  eventTitle: string;
  artistName: string;
  scheduledAt: string;
  watchUrl: string;
}

// Default to Resend's onboarding sender so testing works before
// ayo.live DNS is verified. Override with EMAIL_FROM in production.
const FROM = process.env.EMAIL_FROM ?? "Ayo <onboarding@resend.dev>";

export async function sendTicketEmail(params: TicketEmailParams) {
  const { to, ticketToken, eventTitle, artistName, scheduledAt, watchUrl } =
    params;

  const resend = new Resend(process.env.RESEND_API_KEY);

  const formattedDate = new Date(scheduledAt).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Your ticket for ${eventTitle}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Ayo ticket</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" style="max-width:520px;">
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#F59E0B;letter-spacing:-0.5px;">ayọ</span>
              <p style="margin:4px 0 0;color:#6B7280;font-size:12px;letter-spacing:2px;text-transform:uppercase;">JOY · LIVE</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1A1A1A;border-radius:12px;border:1px solid #2A2A2A;padding:32px;">
              <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">Your ticket</p>
              <h1 style="margin:0 0 8px;color:#FFFFFF;font-size:22px;font-weight:700;line-height:1.3;">${eventTitle}</h1>
              <p style="margin:0 0 24px;color:#9CA3AF;font-size:14px;">${artistName} · ${formattedDate}</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${watchUrl}" style="display:inline-block;background:#F59E0B;color:#0A0A0A;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Watch the show →
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background:#0A0A0A;border-radius:8px;border:1px solid #2A2A2A;padding:14px;text-align:center;">
                <p style="margin:0;color:#22C55E;font-size:12px;">🔒 Protected stream</p>
                <p style="margin:4px 0 0;color:#6B7280;font-size:11px;">This link is yours alone. Opening on a second device will break the session.</p>
              </div>
              <p style="margin:20px 0 0;color:#6B7280;font-size:11px;text-align:center;">
                Ticket ID: ${ticketToken}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#6B7280;font-size:11px;">
                Ayo · Joy, Live. · Made for Africa<br>
                If you didn't buy this ticket, ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });

  if (error) console.error("[Resend] ticket email error:", error);
  return { data, error };
}
