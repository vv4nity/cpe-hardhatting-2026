import { NextResponse } from "next/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public: a student who never got their invite (e.g. typo'd email) requests a
 * correction. We match them against the directory and QUEUE the request for
 * admin approval (we don't change anything yet). Rate-limited.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    surname?: string;
    first_name?: string;
    block?: string;
    email?: string;
  };
  const surname = (body.surname ?? "").trim();
  const firstName = (body.first_name ?? "").trim();
  const block = (body.block ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  if (!surname || !firstName || !block || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ip = clientIp(request);
  const okIp = await rateLimit(admin, `emailreq:ip:${ip}`);
  const okEmail = await rateLimit(admin, `emailreq:email:${email}`);
  if (!okIp || !okEmail) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // match the roster (case-insensitive; surname+first+block is unique)
  const { data: row } = await admin
    .from("directory")
    .select("id, claimed_by")
    .ilike("surname", surname)
    .ilike("first_name", firstName)
    .eq("block", block)
    .maybeSingle();

  if (!row) return NextResponse.json({ status: "not_found" });
  if (row.claimed_by) return NextResponse.json({ status: "already_registered" });

  // replace any existing pending request for this student
  await admin
    .from("email_change_requests")
    .delete()
    .eq("directory_id", row.id)
    .eq("status", "pending");
  const { error } = await admin
    .from("email_change_requests")
    .insert({ directory_id: row.id, requested_email: email, status: "pending" });
  if (error) {
    return NextResponse.json({ error: "queue_failed" }, { status: 500 });
  }
  return NextResponse.json({ status: "queued" });
}
