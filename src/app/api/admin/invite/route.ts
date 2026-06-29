import { NextResponse } from "next/server";
import {
  createAdminClient,
  isAdminConfigured,
  isEmailConfigured,
} from "@/lib/supabase/admin";
import { requireAdmin, adminError } from "@/lib/supabase/admin-guard";
import { sendInviteEmail } from "@/lib/email/invite";
import { inviteOne, type InviteRow, type InviteResult } from "@/lib/email/invite-one";

// nodemailer (Gmail SMTP) needs the Node.js runtime, not Edge.
export const runtime = "nodejs";
// a batch of emails can take ~20-30s; raise the function limit (Vercel default 10s)
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadStats(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from("directory")
    .select("email, claimed_by, invited_at");
  const rows = (data ?? []) as {
    email: string | null;
    claimed_by: string | null;
    invited_at: string | null;
  }[];
  const withEmail = rows.filter((r) => !!r.email);
  return {
    total: withEmail.length,
    registered: rows.filter((r) => r.claimed_by).length,
    invited: rows.filter((r) => r.invited_at).length,
    pending: withEmail.filter((r) => !r.claimed_by).length,
  };
}

async function isPaused(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "activation_open")
    .maybeSingle();
  return !!data && data.value !== "true";
}

/** GET — invitation counts for the admin dashboard. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const admin = createAdminClient();
  return NextResponse.json({
    stats: await loadStats(admin),
    emailReady: isEmailConfigured,
  });
}

/**
 * POST:
 *   { test: "email" }        -> send one preview email (no data change)
 *   { ids: ["...", "..."] }  -> send invites to that batch, return per-recipient results
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!isEmailConfigured) {
    return NextResponse.json({ error: "email_not_configured" }, { status: 503 });
  }

  const origin = new URL(request.url).origin;
  const body = (await request.json().catch(() => ({}))) as {
    test?: string;
    ids?: string[];
  };

  // preview test — sends a sample, changes nothing
  if (body.test && body.test.trim()) {
    try {
      await sendInviteEmail(body.test.trim(), "Dela Cruz, Juan", `${origin}/activate`);
      return NextResponse.json({ sent: 1, failed: 0, test: true });
    } catch (e) {
      return NextResponse.json(
        { error: "send_failed", detail: e instanceof Error ? e.message : "" },
        { status: 500 },
      );
    }
  }

  if (!Array.isArray(body.ids)) {
    return NextResponse.json({ error: "no_ids" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (await isPaused(admin)) {
    return NextResponse.json({ error: "activation_paused" }, { status: 409 });
  }

  if (body.ids.length === 0) {
    return NextResponse.json({ results: [], stats: await loadStats(admin) });
  }

  const { data } = await admin
    .from("directory")
    .select("id, full_name, email")
    .in("id", body.ids);
  const rows = (data ?? []) as InviteRow[];

  const results: InviteResult[] = [];
  for (const row of rows) {
    results.push(await inviteOne(admin, row, origin));
    await sleep(150);
  }

  return NextResponse.json({ results, stats: await loadStats(admin) });
}
