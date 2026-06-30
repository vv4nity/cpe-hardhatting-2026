import "server-only";
import path from "path";
import { firstNameOf } from "@/lib/format";
import { sendWithFallback } from "./transport";

const SUBJECT = "Reminder: activate your CPE Hardhatting 2026 account";

const ASSETS = [
  { cid: "cover", file: "main cover landscape.jpg" },
  { cid: "headline", file: "email/headline-invited.png" },
  { cid: "access", file: "access.png" },
  { cid: "cpedept", file: "cpe dept logo.png" },
  { cid: "icpep", file: "icpep.png" },
  { cid: "icCalendar", file: "email/ic-calendar.png" },
  { cid: "icClock", file: "email/ic-clock.png" },
  { cid: "icPin", file: "email/ic-pin.png" },
  { cid: "icTicket", file: "email/ic-ticket.png" },
  { cid: "icId", file: "email/ic-id.png" },
] as const;

const REMINDERS: { cid: string; html: string }[] = [
  {
    cid: "icTicket",
    html: "Activate first so your <b>digital QR pass</b> is ready on event day.",
  },
  { cid: "icId", html: "Bring a <b>valid school ID</b> when you come in." },
  {
    cid: "icClock",
    html: "Complete activation <b>before the ceremony</b> so you can open your seat and pass.",
  },
  {
    cid: "icCalendar",
    html: "If you've already activated, you can safely <b>ignore</b> this reminder.",
  },
];

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

function reminderHtml(name: string, link: string): string {
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
      @media only screen and (min-width:601px) {
        .pad { padding-left:40px !important; padding-right:40px !important; }
        .hero { padding:18px 18px 0 !important; }
        .headline { width:300px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#faf6ee;-webkit-font-smoothing:antialiased;font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif;color:#1a1712;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your account is still waiting for activation — open it now so your seat and QR pass are ready.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ee;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #efe7d6;border-radius:24px;overflow:hidden;">

          <tr><td class="hero" style="padding:12px 12px 0;">
            <img src="cid:cover" width="100%" alt="CPE Hardhatting 2026" style="display:block;width:100%;height:auto;border-radius:18px;border:0;outline:none;text-decoration:none;" />
          </td></tr>

          <tr><td class="pad" style="padding:28px 26px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;color:#ea580c;text-transform:uppercase;">CPE Hardhatting Ceremony 2026</div>
            <img src="cid:headline" class="headline" alt="Reminder" width="260" height="58" style="display:block;margin:12px 0 0;width:260px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
          </td></tr>

          <tr><td class="pad" style="padding:20px 26px 0;">
            <p style="margin:0 0 8px;font-size:17px;line-height:1.5;color:#1a1712;">Hi ${first}, your account is almost ready.</p>
            <p style="margin:0;font-size:15.5px;line-height:1.7;color:#6b6357;">
              We still need you to activate your account so your seat assignment and digital pass will open on time. Tap below to continue your setup.
            </p>
          </td></tr>

          <tr><td class="pad" style="padding:24px 26px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:14px;background:#ffbf00;">
              <a href="${link}" style="display:block;padding:17px 24px;font-size:16px;font-weight:700;letter-spacing:0.2px;color:#1a1712;text-decoration:none;border-radius:14px;text-align:center;">Activate my account &nbsp;&rarr;</a>
            </td></tr></table>
          </td></tr>

          <tr><td class="pad" style="padding:30px 26px 0;">
            <div style="border:1px solid #efe7d6;background:#faf6ee;border-radius:18px;padding:6px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${detailRow("icCalendar", "Status", "Still waiting", "Activate to unlock your seat and pass")}
                ${detailRow("icClock", "Tip", "Do it before event day", "So you do not need to rush later")}
                ${detailRow("icPin", "Venue", "Bulwagang Balagtas", "PUP Sta. Mesa, Manila")}
              </table>
            </div>
          </td></tr>

          <tr><td class="pad" style="padding:30px 26px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ea580c;">Why this matters</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              ${REMINDERS.map((r, i) => reminderRow(r.cid, r.html, i === REMINDERS.length - 1)).join("")}
            </table>
          </td></tr>

          <tr><td class="pad" style="padding:28px 26px 0;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#9a9082;">
              Button not working? Paste this link into your browser:<br />
              <a href="${link}" style="color:#6b6357;word-break:break-all;text-decoration:underline;">${link}</a>
            </p>
          </td></tr>

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
              If you already activated, you can ignore this reminder.
            </p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendActivationReminderEmail(to: string, name: string, link: string) {
  const publicDir = path.join(process.cwd(), "public");
  const html = reminderHtml(name, link);
  const attachments = ASSETS.map((a) => ({
    filename: a.file.split("/").pop()!,
    path: path.join(publicDir, a.file),
    cid: a.cid,
  }));
  return sendWithFallback((from) => ({
    from,
    to,
    subject: SUBJECT,
    html,
    attachments,
  }));
}
