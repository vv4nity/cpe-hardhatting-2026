import { NextResponse } from "next/server";
import {
  createAdminClient,
  isAdminConfigured,
  isEmailConfigured,
} from "@/lib/supabase/admin";
import { requireAdmin, adminError } from "@/lib/supabase/admin-guard";
import { sendPresidentEmail } from "@/lib/email/president";

export const runtime = "nodejs";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PresRow {
  id: string;
  full_name: string;
  email: string | null;
  block: string | null;
}

/** GET — block presidents (with email) for the admin briefing card. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("directory")
    .select("id, full_name, email, block")
    .eq("is_president", true)
    .not("email", "is", null)
    .order("block");
  const presidents = (data ?? []) as PresRow[];
  return NextResponse.json({
    presidents: presidents.map((p) => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
    })),
    count: presidents.length,
    emailReady: isEmailConfigured,
  });
}

/**
 * POST:
 *   { test: "email" }       -> send one preview, changes nothing
 *   { ids: ["...","..."] }  -> send the briefing to those presidents
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
  const link = `${origin}/oversight`;
  const body = (await request.json().catch(() => ({}))) as {
    test?: string;
    ids?: string[];
  };

  if (body.test && body.test.trim()) {
    try {
      await sendPresidentEmail(body.test.trim(), "Dela Cruz, Juan", link, "BSCPE 1-2");
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
  if (body.ids.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("directory")
    .select("id, full_name, email, block")
    .in("id", body.ids)
    .eq("is_president", true);
  const rows = (data ?? []) as PresRow[];

  const results = [];
  for (const row of rows) {
    const email = (row.email ?? "").trim();
    if (!email) {
      results.push({
        id: row.id,
        name: row.full_name,
        email: "",
        status: "failed" as const,
        reason: "no email on file",
      });
      continue;
    }
    try {
      const { account } = await sendPresidentEmail(
        email,
        row.full_name,
        link,
        row.block ?? "",
      );
      results.push({
        id: row.id,
        name: row.full_name,
        email,
        status: "sent" as const,
        account,
      });
    } catch (e) {
      results.push({
        id: row.id,
        name: row.full_name,
        email,
        status: "failed" as const,
        reason: e instanceof Error ? e.message : "send error",
      });
    }
    await sleep(150);
  }

  return NextResponse.json({ results });
}
