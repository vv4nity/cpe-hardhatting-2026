import "server-only";
import path from "path";
import nodemailer from "nodemailer";
import { firstNameOf } from "@/lib/format";

const SUBJECT = "You're invited — activate your CPE Hardhatting 2026 seat";

/**
 * Event details shown in the invite. ⚠️ Update the call time here once it's
 * finalized — it's a placeholder for now.
 */
const EVENT = {
  date: "July 1, 2026",
  time: "12:00 PM",
  venue: "Bulwagang Balagtas",
  venueSub: "PUP Sta. Mesa, Manila",
};

const REMINDERS: { cid: string; html: string }[] = [
  { cid: "icTicket", html: "Bring your <b>digital QR pass</b> — you'll find it in the app." },
  { cid: "icId", html: "Bring a <b>valid school ID</b>." },
  { cid: "icClock", html: "<b>Arrive at least 30 minutes</b> before call time." },
  { cid: "icShirt", html: 'Wear the <a href="https://m.facebook.com/story.php?story_fbid=pfbid0EUKPTdyJZ91PKfAPnxE4fFCdfSUDHRzARXXgZH724y41gbLbzuCNFQGt8eFxnh6Ml&amp;id=100063871723008&amp;mibextid=Nif5oz" style="color:#ea580c;font-weight:700;text-decoration:underline;">preferred dress code</a> for the event.' },
];

/** Inline images, embedded via CID so they render everywhere (incl. localhost). */
const ASSETS = [
  { cid: "cover", file: "main cover landscape.jpg" },
  { cid: "headline", file: "email/headline-invited.png" },
  { cid: "access", file: "access.png" },
  { cid: "cpedept", file: "cpe dept logo.png" },
  { cid: "icpep", file: "icpep.png" },
  { cid: "icCalendar", file: "email/ic-calendar.png" },
  { cid: "icClock", file: "email/ic-clock.png" },
  { cid: "icPin", file: "email/ic-pin.png" },
  { cid: "icShirt", file: "email/ic-shirt.png" },
  { cid: "icTicket", file: "email/ic-ticket.png" },
  { cid: "icId", file: "email/ic-id.png" },
] as const;

/** Reused Gmail SMTP transport (created once). */
let transport: nodemailer.Transporter | null = null;
function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      service: "gmail",
      // Pool one authenticated connection and reuse it for many messages so a
      // whole batch is a SINGLE login — Gmail throttles login attempts
      // (454-4.7.0) long before its daily message limit.
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transport;
}

function detailRow(cid: string, label: string, value: string, sub?: string) {
  return `<tr>
    <td width="44" valign="top" style="padding:10px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;background:#fdf3da;border:1px solid #f3e6c0;border-radius:12px;">
          <img src="cid:${cid}" width="22" height="22" alt="" style="display:inline-block;vertical-align:middle;border:0;" />
        </td>
      </tr></table>
    </td>
    <td valign="middle" style="padding:10px 0 10px 14px;">
      <div style="font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#a89e8b;">${label}</div>
      <div style="margin-top:3px;font-size:16px;font-weight:700;line-height:1.25;color:#1a1712;">${value}</div>
      ${sub ? `<div style="margin-top:1px;font-size:13px;color:#857c6d;">${sub}</div>` : ""}
    </td>
  </tr>`;
}

function reminderRow(cid: string, html: string, last: boolean) {
  return `<tr>
    <td width="28" valign="top" style="padding:0 0 ${last ? 0 : 14}px;">
      <img src="cid:${cid}" width="20" height="20" alt="" style="display:block;border:0;margin-top:1px;" />
    </td>
    <td valign="top" style="padding:0 0 ${last ? 0 : 14}px 12px;font-size:14.5px;line-height:1.55;color:#4a443b;">${html}</td>
  </tr>`;
}

function inviteHtml(name: string, link: string): string {
  const first = firstNameOf(name) || "there";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light" />
    <title>${SUBJECT}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&display=swap');
      :root { color-scheme: light only; supported-color-schemes: light; }
      /* Mobile-first base styles are inline; desktop clients (which honor
         <style>) get roomier padding via this min-width enhancement. Gmail's
         mobile app ignores <style>, so it keeps the comfortable inline base. */
      @media only screen and (min-width:601px) {
        .pad { padding-left:40px !important; padding-right:40px !important; }
        .hero { padding:18px 18px 0 !important; }
        .headline { width:340px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#faf6ee;-webkit-font-smoothing:antialiased;font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif;color:#1a1712;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your seat for Hardhatting 2026 is reserved — activate your account in under a minute.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ee;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #efe7d6;border-radius:24px;overflow:hidden;">

          <!-- hero cover -->
          <tr><td class="hero" style="padding:12px 12px 0;">
            <img src="cid:cover" width="100%" alt="CPE Hardhatting 2026" style="display:block;width:100%;height:auto;border-radius:18px;border:0;outline:none;text-decoration:none;" />
          </td></tr>

          <!-- eyebrow + headline -->
          <tr><td class="pad" style="padding:28px 26px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;color:#ea580c;text-transform:uppercase;">CPE Hardhatting Ceremony 2026</div>
            <img src="cid:headline" class="headline" alt="You're Invited" width="300" height="62" style="display:block;margin:12px 0 0;width:300px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
          </td></tr>

          <!-- body -->
          <tr><td class="pad" style="padding:20px 26px 0;">
            <p style="margin:0 0 8px;font-size:17px;line-height:1.5;color:#1a1712;">Hi ${first}, your seat is reserved.</p>
            <p style="margin:0;font-size:15.5px;line-height:1.7;color:#6b6357;">
              Activate your account to view your seat assignment and your digital entry pass.
              It takes under a minute — confirm your name and block, then choose a password.
            </p>
          </td></tr>

          <!-- CTA -->
          <tr><td class="pad" style="padding:24px 26px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:14px;background:#ffbf00;">
              <a href="${link}" style="display:block;padding:17px 24px;font-size:16px;font-weight:700;letter-spacing:0.2px;color:#1a1712;text-decoration:none;border-radius:14px;text-align:center;">Activate my account &nbsp;&rarr;</a>
            </td></tr></table>
          </td></tr>

          <!-- event details card -->
          <tr><td class="pad" style="padding:30px 26px 0;">
            <div style="border:1px solid #efe7d6;background:#faf6ee;border-radius:18px;padding:6px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${detailRow("icCalendar", "Date", EVENT.date)}
                ${detailRow("icClock", "Call time", EVENT.time)}
                ${detailRow("icPin", "Venue", EVENT.venue, EVENT.venueSub)}
              </table>
            </div>
          </td></tr>

          <!-- reminders -->
          <tr><td class="pad" style="padding:30px 26px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ea580c;">Before you come</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              ${REMINDERS.map((r, i) => reminderRow(r.cid, r.html, i === REMINDERS.length - 1)).join("")}
            </table>
          </td></tr>

          <!-- fallback link -->
          <tr><td class="pad" style="padding:28px 26px 0;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#9a9082;">
              This invitation is personal to you — please don't forward it. Button not working?
              Paste this link into your browser:<br />
              <a href="${link}" style="color:#6b6357;word-break:break-all;text-decoration:underline;">${link}</a>
            </p>
          </td></tr>

          <!-- partner footer -->
          <tr><td class="pad" style="padding:30px 26px 0;">
            <div style="border-top:1px solid #efe7d6;"></div>
          </td></tr>
          <tr><td class="pad" align="center" style="padding:18px 26px 0;">
            <div style="font-size:10.5px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#b3a994;">In partnership with</div>
          </td></tr>
          <tr><td class="pad" align="center" style="padding:16px 26px 4px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding:0 13px;" valign="middle"><img src="cid:access" height="32" alt="ACCESS" style="display:block;height:32px;width:auto;border:0;" /></td>
              <td style="padding:0 13px;" valign="middle"><img src="cid:cpedept" height="32" alt="PUP CpE Department" style="display:block;height:32px;width:auto;border:0;" /></td>
              <td style="padding:0 13px;" valign="middle"><img src="cid:icpep" height="38" alt="ICPEP SE - PUP" style="display:block;height:38px;width:auto;border:0;" /></td>
            </tr></table>
          </td></tr>
          <tr><td class="pad" align="center" style="padding:18px 26px 30px;">
            <p style="margin:0;font-size:11px;line-height:1.6;color:#b3a994;">
              ACCESS &bull; PUP CpE Department &bull; ICPEP SE - PUP<br />
              If you weren't expecting this, you can safely ignore this email.
            </p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Send one invitation email via Gmail SMTP. Throws on failure. */
export async function sendInviteEmail(to: string, name: string, link: string) {
  const from =
    process.env.INVITE_FROM_EMAIL ||
    `CPE Hardhatting 2026 <${process.env.GMAIL_USER}>`;
  const publicDir = path.join(process.cwd(), "public");
  await getTransport().sendMail({
    from,
    to,
    subject: SUBJECT,
    html: inviteHtml(name, link),
    attachments: ASSETS.map((a) => ({
      filename: a.file.split("/").pop()!,
      path: path.join(publicDir, a.file),
      cid: a.cid,
    })),
  });
}
