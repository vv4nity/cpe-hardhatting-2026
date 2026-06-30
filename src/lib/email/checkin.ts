import "server-only";
import path from "path";
import { firstNameOf } from "@/lib/format";
import { sendWithFallback } from "./transport";

const SUBJECT = "You're checked in — CPE Hardhatting 2026 ✓";

/** Inline images, embedded via CID (cover + partner-logo footer). */
const ASSETS = [
  { cid: "cover", file: "main cover landscape.jpg" },
  { cid: "icPin", file: "email/ic-pin.png" },
  { cid: "icClock", file: "email/ic-clock.png" },
  { cid: "access", file: "access.png" },
  { cid: "cpedept", file: "cpe dept logo.png" },
  { cid: "icpep", file: "icpep.png" },
] as const;

export function checkinHtml(
  name: string,
  seat: string,
  block: string,
  timeLabel: string,
): string {
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
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">You're checked in. Welcome to CPE Hardhatting 2026!</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ee;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #efe7d6;border-radius:24px;overflow:hidden;">

          <!-- hero cover -->
          <tr><td class="hero" style="padding:12px 12px 0;">
            <img src="cid:cover" width="100%" alt="CPE Hardhatting 2026" style="display:block;width:100%;height:auto;border-radius:18px;border:0;outline:none;text-decoration:none;" />
          </td></tr>

          <!-- success badge + heading -->
          <tr><td class="pad" align="center" style="padding:28px 26px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td width="56" height="56" align="center" valign="middle" style="width:56px;height:56px;background:#2e7d52;border-radius:16px;font-size:30px;line-height:56px;color:#ffffff;">&#10003;</td>
            </tr></table>
          </td></tr>
          <tr><td class="pad" align="center" style="padding:16px 26px 0;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;color:#2e7d52;text-transform:uppercase;">Checked in</div>
            <div style="margin:8px 0 0;font-size:28px;line-height:1.1;font-weight:700;color:#1a1712;">You're all set, ${first}!</div>
            <p style="margin:10px 0 0;font-size:15.5px;line-height:1.6;color:#6b6357;">
              Your attendance for the CPE Hardhatting Ceremony 2026 has been recorded. Welcome — enjoy the ceremony!
            </p>
          </td></tr>

          <!-- detail card -->
          <tr><td class="pad" style="padding:24px 26px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #efe7d6;background:#faf6ee;border-radius:18px;">
              <tr>
                <td width="50%" align="center" style="padding:20px 10px;border-right:1px solid #efe7d6;">
                  <img src="cid:icPin" width="20" height="20" alt="" style="display:inline-block;border:0;opacity:0.85;" />
                  <div style="margin-top:8px;font-size:10.5px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#9a9082;">Seat</div>
                  <div style="margin-top:4px;font-size:24px;font-weight:700;color:#1a1712;">${seat || "—"}</div>
                </td>
                <td width="50%" align="center" style="padding:20px 10px;">
                  <img src="cid:icClock" width="20" height="20" alt="" style="display:inline-block;border:0;opacity:0.85;" />
                  <div style="margin-top:8px;font-size:10.5px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#9a9082;">Checked in at</div>
                  <div style="margin-top:4px;font-size:24px;font-weight:700;color:#1a1712;">${timeLabel}</div>
                </td>
              </tr>
            </table>
          </td></tr>

          ${
            block
              ? `<!-- block pill -->
          <tr><td class="pad" align="center" style="padding:16px 26px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
              <td style="background:#1a1712;border-radius:999px;padding:8px 18px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#f9eeda;text-transform:uppercase;font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif;">Block ${block}</td>
            </tr></table>
          </td></tr>`
              : ""
          }

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
              This is an automated check-in confirmation.
            </p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Send one check-in confirmation email (with backup-account failover). */
export async function sendCheckinEmail(
  to: string,
  name: string,
  seat: string,
  block: string,
  timeLabel: string,
) {
  const publicDir = path.join(process.cwd(), "public");
  const html = checkinHtml(name, seat, block, timeLabel);
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
