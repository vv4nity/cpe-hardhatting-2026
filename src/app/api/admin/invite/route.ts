import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  isAdminConfigured,
  isEmailConfigured,
} from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/email/invite";

// nodemailer (Gmail SMTP) needs the Node.js runtime, not Edge.
export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Verify the caller is a signed-in admin. Returns the admin client or null. */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "forbidden" as const };
  return { ok: true as const };
}

interface DirRow {
  id: string;
  full_name: string;
  email: string | null;
  claimed_by: string | null;
  invited_at: string | null;
}

async function loadStats(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from("directory")
    .select("email, claimed_by, invited_at");
  const rows = (data ?? []) as Pick<
    DirRow,
    "email" | "claimed_by" | "invited_at"
  >[];
  const withEmail = rows.filter((r) => !!r.email);
  return {
    total: withEmail.length,
    registered: rows.filter((r) => r.claimed_by).length,
    invited: rows.filter((r) => r.invited_at).length,
    pending: withEmail.filter((r) => !r.claimed_by).length,
  };
}

/** GET — invitation counts for the admin dashboard. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === "forbidden" ? 403 : 401 });
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const admin = createAdminClient();
  return NextResponse.json({ stats: await loadStats(admin), emailReady: isEmailConfigured });
}

/** POST — send an invite to every not-yet-registered attendee with an email. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === "forbidden" ? 403 : 401 });
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!isEmailConfigured) {
    return NextResponse.json({ error: "email_not_configured" }, { status: 503 });
  }

  const origin = new URL(request.url).origin;

  // Preview mode: send a single sample email to a typed address. Touches no
  // data — used to preview the design without emailing real students.
  const body = (await request.json().catch(() => ({}))) as { test?: string };
  if (body?.test && body.test.trim()) {
    try {
      await sendInviteEmail(body.test.trim(), "Juan Dela Cruz", `${origin}/activate`);
      return NextResponse.json({ sent: 1, failed: 0, test: true });
    } catch (e) {
      return NextResponse.json(
        { error: "send_failed", detail: e instanceof Error ? e.message : "" },
        { status: 500 },
      );
    }
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("directory")
    .select("id, full_name, email, claimed_by, invited_at")
    .is("claimed_by", null)
    .not("email", "is", null);
  if (error) {
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const pending = (data ?? []) as DirRow[];
  let sent = 0;
  const failures: { email: string; reason: string }[] = [];

  for (const row of pending) {
    const email = (row.email ?? "").trim();
    if (!email) continue;
    try {
      // first invite creates the auth user; re-sends use a magic link
      const linkType = row.invited_at ? "magiclink" : "invite";
      // We build our own /auth/confirm link from the hashed token, so no
      // redirectTo is needed (and no redirect-allowlist entry is required).
      const { data: linkData, error: linkErr } =
        await admin.auth.admin.generateLink({ type: linkType, email });
      if (linkErr || !linkData?.properties?.hashed_token) {
        throw new Error(linkErr?.message || "link generation failed");
      }
      const confirmUrl = `${origin}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=${linkType}&next=/activate`;

      await sendInviteEmail(email, row.full_name, confirmUrl);

      await admin
        .from("directory")
        .update({ invited_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    } catch (e) {
      failures.push({
        email,
        reason: e instanceof Error ? e.message : "unknown error",
      });
    }
    // gentle pacing so Gmail doesn't flag a rapid burst
    await sleep(350);
  }

  return NextResponse.json({
    sent,
    failed: failures.length,
    failures: failures.slice(0, 20),
    stats: await loadStats(admin),
  });
}
