import { NextResponse } from "next/server";
import {
  createAdminClient,
  isAdminConfigured,
  isEmailConfigured,
} from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendResetEmail } from "@/lib/email/reset";

export const runtime = "nodejs";
export const maxDuration = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public: request a password reset. Always responds OK (no account
 * enumeration). Sends a recovery link via Gmail when the account exists.
 * Rate-limited per email + IP.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured || !isEmailConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const clean = (email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ip = clientIp(request);
  const okIp = await rateLimit(admin, `reset:ip:${ip}`);
  const okEmail = await rateLimit(admin, `reset:email:${clean}`);
  if (!okIp || !okEmail) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const origin = new URL(request.url).origin;
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: clean,
    });
    if (!error && data?.properties?.hashed_token) {
      const link = `${origin}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/reset-password`;
      await sendResetEmail(clean, link);
    }
  } catch {
    // swallow — never reveal whether an account exists
  }
  return NextResponse.json({ ok: true });
}
