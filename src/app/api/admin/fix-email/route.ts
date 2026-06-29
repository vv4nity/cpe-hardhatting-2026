import { NextResponse } from "next/server";
import {
  createAdminClient,
  isAdminConfigured,
  isEmailConfigured,
} from "@/lib/supabase/admin";
import { requireAdmin, adminError } from "@/lib/supabase/admin-guard";
import { inviteOne } from "@/lib/email/invite-one";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST { id, email } — correct a student's email (typo fix). Updates the
 * directory, then auto-sends a fresh invite to the new address (unless
 * activation is paused or they're already registered).
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { id, email } = (await request.json().catch(() => ({}))) as {
    id?: string;
    email?: string;
  };
  const clean = (email ?? "").trim().toLowerCase();
  if (!id || !EMAIL_RE.test(clean)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();

  // update email + clear invited_at so it re-sends as a fresh invite
  const { data: row, error } = await admin
    .from("directory")
    .update({ email: clean, invited_at: null })
    .eq("id", id)
    .select("id, full_name, email, claimed_by")
    .single();
  if (error || !row) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // already registered → just the email change, no invite needed
  if (row.claimed_by) {
    return NextResponse.json({ updated: true, sent: false, reason: "registered" });
  }

  // respect the activation pause + email config
  const { data: setting } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "activation_open")
    .maybeSingle();
  const paused = !!setting && setting.value !== "true";
  if (paused || !isEmailConfigured) {
    return NextResponse.json({
      updated: true,
      sent: false,
      reason: paused ? "paused" : "email_off",
    });
  }

  const origin = new URL(request.url).origin;
  const result = await inviteOne(admin, row, origin);
  return NextResponse.json({
    updated: true,
    sent: result.status === "sent",
    result,
  });
}
