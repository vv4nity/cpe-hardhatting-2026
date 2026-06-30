import { NextResponse } from "next/server";
import {
  createAdminClient,
  isAdminConfigured,
  isEmailConfigured,
} from "@/lib/supabase/admin";
import { requireStaff, adminError } from "@/lib/supabase/admin-guard";
import { sendCheckinEmail } from "@/lib/email/checkin";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST { seat } — send the attendee at this seat a "you're checked in"
 * confirmation. Called by the scanner right after a successful check-in, so it
 * works even when the attendee presented a saved PNG (their app isn't open).
 * Safe to no-op if the seat isn't present / has no email.
 */
export async function POST(request: Request) {
  const auth = await requireStaff();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured || !isEmailConfigured) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const { seat } = (await request.json().catch(() => ({}))) as { seat?: string };
  const s = (seat ?? "").trim().toUpperCase();
  if (!s) return NextResponse.json({ ok: false, reason: "no_seat" });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("directory")
    .select("full_name, email, seat, block, status, checked_in_at")
    .eq("seat", s)
    .maybeSingle();

  if (!row || !row.email || row.status !== "present") {
    return NextResponse.json({ ok: false, reason: "not_eligible" });
  }

  const time = row.checked_in_at ? new Date(row.checked_in_at) : new Date();
  const timeLabel = time.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  });

  try {
    await sendCheckinEmail(
      row.email,
      row.full_name,
      row.seat ?? s,
      row.block ?? "",
      timeLabel,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      reason: e instanceof Error ? e.message : "send_failed",
    });
  }
}
