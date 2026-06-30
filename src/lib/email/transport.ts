import "server-only";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

/**
 * Gmail SMTP transport with an optional BACKUP account for failover. If the
 * primary account errors mid-send (daily limit, throttle, auth hiccup), the
 * message is retried through the backup Gmail — and the primary is marked down
 * for the rest of this run so we stop hammering a capped/throttled account.
 *
 * Configure the backup with GMAIL_USER_2 + GMAIL_APP_PASSWORD_2 (and optionally
 * INVITE_FROM_EMAIL_2). With no backup set, behavior is unchanged (just throws).
 *
 * Each message's `from` MUST match the sending account (Gmail only sends as the
 * authenticated user), so callers pass a builder that receives the correct
 * `from` for whichever account is used.
 */

const POOL = { pool: true as const, maxConnections: 1, maxMessages: 100 };

function make(user?: string, pass?: string): nodemailer.Transporter {
  return nodemailer.createTransport({ service: "gmail", ...POOL, auth: { user, pass } });
}

const primaryFrom =
  process.env.INVITE_FROM_EMAIL ||
  `CPE Hardhatting 2026 <${process.env.GMAIL_USER}>`;
const backupFrom =
  process.env.INVITE_FROM_EMAIL_2 ||
  `CPE Hardhatting 2026 <${process.env.GMAIL_USER_2}>`;

export const hasBackup = !!(
  process.env.GMAIL_USER_2 && process.env.GMAIL_APP_PASSWORD_2
);

let primary: nodemailer.Transporter | null = null;
let backup: nodemailer.Transporter | null = null;
let primaryDown = false;

function getPrimary() {
  return (primary ??= make(process.env.GMAIL_USER, process.env.GMAIL_APP_PASSWORD));
}
function getBackup() {
  return (backup ??= make(process.env.GMAIL_USER_2, process.env.GMAIL_APP_PASSWORD_2));
}

/**
 * Send a message, trying the primary account first and falling back to the
 * backup. `build(from)` returns the nodemailer message for the given `from`.
 * Returns which account actually sent it.
 */
export async function sendWithFallback(
  build: (from: string) => Mail.Options,
): Promise<{ account: "primary" | "backup" }> {
  if (!primaryDown) {
    try {
      await getPrimary().sendMail(build(primaryFrom));
      return { account: "primary" };
    } catch (err) {
      if (!hasBackup) throw err;
      // primary is capped/throttled — route the rest of this run to the backup
      primaryDown = true;
    }
  }
  await getBackup().sendMail(build(backupFrom));
  return { account: "backup" };
}
