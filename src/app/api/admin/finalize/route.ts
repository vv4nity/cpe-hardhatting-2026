import { NextResponse } from "next/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { requireAdmin, adminError } from "@/lib/supabase/admin-guard";

export const runtime = "nodejs";

/**
 * POST { action: "finalize" | "undo" } — admin-only end-of-event control.
 *  - finalize: mark every still-`assigned` seat as `no-show` (locks in absences
 *    for the post-event report). Re-scanning a no-show still marks them present,
 *    so late arrivals are handled.
 *  - undo: revert no-shows back to `assigned` (e.g. clicked too early).
 * `present` rows are never touched.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { action } = (await request.json().catch(() => ({}))) as {
    action?: "finalize" | "undo";
  };
  if (action !== "finalize" && action !== "undo") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  const [from, to] =
    action === "finalize" ? ["assigned", "no-show"] : ["no-show", "assigned"];

  const { data, error } = await admin
    .from("directory")
    .update({ status: to })
    .eq("status", from)
    .not("seat", "is", null)
    .select("id");
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action, count: data?.length ?? 0 });
}
