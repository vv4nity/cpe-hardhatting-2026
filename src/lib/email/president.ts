import "server-only";
import path from "path";
import { firstNameOf } from "@/lib/format";
import { sendWithFallback } from "./transport";

const SUBJECT = "Your role as a Block President — CPE Hardhatting 2026";

/** Inline images, embedded via CID (cover + partner-logo footer). */
const ASSETS = [
  { cid: "cover", file: "main cover landscape.jpg" },
  { cid: "access", file: "access.png" },
  { cid: "cpedept", file: "cpe dept logo.png" },
  { cid: "icpep", file: "icpep.png" },
] as const;

const DUTIES: { title: string; body: string }[] = [
  {
    title: "Monitor your block's attendance",
    body: "Open your Block Oversight dashboard to see — live — who has checked in and your block's overall turnout at a glance.",
  },
  {
    title: "Follow up with absent blockmates",
    body: "Give a nudge to classmates who haven't checked in yet (or haven't activated their account) so your block shows up in full.",
  },
  {
    title: "Help with activation & invite issues",
    body: 'If a blockmate didn\'t receive their invite or can\'t sign in, point them to <b>"Didn\'t get your invitation? Fix your email"</b> and <b>"Forgot password"</b> on the sign-in page.',
  },
];

function dutyRow(n: number, title: string, body: string, last: boolean) {
  return `<tr>
    <td width="34" valign="top" style="padding:0 0 ${last ? 0 : 18}px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background:#ffbf00;border-radius:8px;font-size:13px;font-weight:700;color:#1a1712;font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif;">${n}</td>
      </tr></table>
    </td>
    <td valign="top" style="padding:0 0 ${last ? 0 : 18}px 12px;">
      <div style="font-size:15.5px;font-weight:700;color:#1a1712;">${title}</div>
      <div style="margin-top:3px;font-size:14px;line-height:1.55;color:#6b6357;">${body}</div>
    </td>
  </tr>`;
}

function presidentHtml(name: string, link: string): string {
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
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#faf6ee;-webkit-font-smoothing:antialiased;font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif;color:#1a1712;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">As a block president, you help your block show up in full — here's how.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ee;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #efe7d6;border-radius:24px;overflow:hidden;">

          <!-- hero cover -->
          <tr><td class="hero" style="padding:12px 12px 0;">
            <img src="cid:cover" width="100%" alt="CPE Hardhatting 2026" style="display:block;width:100%;height:auto;border-radius:18px;border:0;outline:none;text-decoration:none;" />
          </td></tr>

          <!-- eyebrow + heading -->
          <tr><td class="pad" style="padding:28px 26px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;color:#ea580c;text-transform:uppercase;">Block President &bull; CPE Hardhatting 2026</div>
            <div style="margin:10px 0 0;font-size:30px;line-height:1.1;font-weight:700;letter-spacing:0.2px;color:#1a1712;">Your role for the big day</div>
          </td></tr>

          <!-- body -->
          <tr><td class="pad" style="padding:18px 26px 0;">
            <p style="margin:0 0 8px;font-size:17px;line-height:1.5;color:#1a1712;">Hi ${first}, you're a <b>block president</b> for the ceremony.</p>
            <p style="margin:0;font-size:15.5px;line-height:1.7;color:#6b6357;">
              Beyond your own seat, you have a special role: helping your block show up — and be accounted for — on event day. Here's what we'll count on you for.
            </p>
          </td></tr>

          <!-- duties -->
          <tr><td class="pad" style="padding:26px 26px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ea580c;">What you'll do</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              ${DUTIES.map((d, i) => dutyRow(i + 1, d.title, d.body, i === DUTIES.length - 1)).join("")}
            </table>
          </td></tr>

          <!-- CTA -->
          <tr><td class="pad" style="padding:28px 26px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:14px;background:#ffbf00;">
              <a href="${link}" style="display:block;padding:17px 24px;font-size:16px;font-weight:700;letter-spacing:0.2px;color:#1a1712;text-decoration:none;border-radius:14px;text-align:center;">Open my Block Oversight &nbsp;&rarr;</a>
            </td></tr></table>
            <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#9a9082;">Sign in with your attendee account to open it. The dashboard shows your block's roster and live turnout.</p>
          </td></tr>

          <!-- fallback link -->
          <tr><td class="pad" style="padding:22px 26px 0;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#9a9082;">
              Button not working? Paste this link into your browser:<br />
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

/** Send one block-president briefing email (with backup-account failover). */
export async function sendPresidentEmail(to: string, name: string, link: string) {
  const publicDir = path.join(process.cwd(), "public");
  const html = presidentHtml(name, link);
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
