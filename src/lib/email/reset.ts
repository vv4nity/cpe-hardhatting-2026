import "server-only";
import { sendWithFallback } from "./transport";

const SUBJECT = "Reset your CPE Hardhatting 2026 password";

function html(link: string): string {
  return `<!doctype html><html><body style="margin:0;background:#faf6ee;font-family:Helvetica,Arial,sans-serif;color:#1a1712;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ee;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:#fffdf9;border:1px solid #efe7d6;border-radius:20px;">
      <tr><td style="padding:28px 28px 8px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;color:#ea580c;text-transform:uppercase;">CPE Hardhatting 2026</div>
        <h1 style="margin:8px 0 6px;font-size:22px;">Reset your password</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#6b6357;">
          We got a request to reset your password. Tap below to choose a new one. If you didn't ask for this, you can ignore this email.
        </p>
        <a href="${link}" style="display:inline-block;background:#ffbf00;color:#1a1712;font-weight:700;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:12px;">Reset my password</a>
        <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#9a9082;">Button not working? Paste this into your browser:<br><span style="color:#6b6357;word-break:break-all;">${link}</span></p>
      </td></tr>
      <tr><td style="padding:18px 28px 26px;"><hr style="border:none;border-top:1px solid #eee6d6;margin:0 0 12px;">
        <p style="margin:0;font-size:11px;color:#b3a994;">This link expires shortly for your security.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

/** Send a password-reset email via Gmail SMTP (with backup-account failover). */
export async function sendResetEmail(to: string, link: string) {
  const body = html(link);
  await sendWithFallback((from) => ({ from, to, subject: SUBJECT, html: body }));
}
