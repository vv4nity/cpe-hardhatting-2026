import { NextResponse } from "next/server";
import {
  createAdminClient,
  isAdminConfigured,
  isEmailConfigured,
} from "@/lib/supabase/admin";
import { requireAdmin, adminError } from "@/lib/supabase/admin-guard";
import { inviteOne } from "@/lib/email/invite-one";

export const runtime = "nodejs";
export const maxDuration = 30;

/** GET — pending email-change requests with student details. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const admin = createAdminClient();
  const { data: reqs } = await admin
    .from("email_change_requests")
    .select("id, requested_email, created_at, directory_id")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const ids = (reqs ?? []).map((r) => r.directory_id);
  const { data: dirs } = ids.length
    ? await admin
        .from("directory")
        .select("id, full_name, block, seat, email, claimed_by")
        .in("id", ids)
    : { data: [] };
  const dmap = Object.fromEntries((dirs ?? []).map((d) => [d.id, d]));

  const requests = (reqs ?? []).map((r) => {
    const d = dmap[r.directory_id];
    return {
      id: r.id,
      requestedEmail: r.requested_email,
      createdAt: r.created_at,
      name: d?.full_name ?? "—",
      block: d?.block ?? "",
      seat: d?.seat ?? "",
      currentEmail: d?.email ?? "",
      registered: !!d?.claimed_by,
    };
  });
  return NextResponse.json({ requests });
}

/** POST { id, action: "approve" | "reject" }. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const { id, action } = (await request.json().catch(() => ({}))) as {
    id?: string;
    action?: "approve" | "reject";
  };
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("email_change_requests")
    .select("id, requested_email, directory_id, status")
    .eq("id", id)
    .single();
  if (!req || req.status !== "pending") {
    return NextResponse.json({ error: "not_pending" }, { status: 409 });
  }

  if (action === "reject") {
    await admin
      .from("email_change_requests")
      .update({ status: "rejected" })
      .eq("id", id);
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  // approve: update the directory email + clear invited_at, then send invite
  const { data: row } = await admin
    .from("directory")
    .update({ email: req.requested_email, invited_at: null })
    .eq("id", req.directory_id)
    .select("id, full_name, email, claimed_by")
    .single();
  await admin
    .from("email_change_requests")
    .update({ status: "approved" })
    .eq("id", id);

  let sent = false;
  if (row && !row.claimed_by && isEmailConfigured) {
    const { data: setting } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "activation_open")
      .maybeSingle();
    const paused = !!setting && setting.value !== "true";
    if (!paused) {
      const origin = new URL(request.url).origin;
      const result = await inviteOne(admin, row, origin);
      sent = result.status === "sent";
    }
  }
  return NextResponse.json({ ok: true, action: "approved", sent });
}
