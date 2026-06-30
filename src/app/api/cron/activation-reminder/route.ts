import { NextResponse } from "next/server";
import { createAdminClient, isAdminConfigured, isEmailConfigured } from "@/lib/supabase/admin";
import { buildActivationLink } from "@/lib/email/invite-one";
import { sendActivationReminderEmail } from "@/lib/email/activation-reminder";

export const runtime = "nodejs";
export const maxDuration = 60;

const TARGET_KEY = "activation_reminder_at";
const SENT_KEY = "activation_reminder_sent_at";

function isCronRequest(request: Request) {
  return request.headers.get("x-vercel-cron") === "1" || process.env.NODE_ENV !== "production";
}

function formatLogLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isAdminConfigured || !isEmailConfigured) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("app_settings")
    .select("key, value")
    .in("key", [TARGET_KEY, SENT_KEY]);
  const map = Object.fromEntries((settings ?? []).map((row) => [row.key, row.value]));
  const scheduledAt = map[TARGET_KEY] || null;
  const sentAt = map[SENT_KEY] || null;

  if (!scheduledAt) {
    return NextResponse.json({ ok: true, reason: "not_scheduled" });
  }
  if (sentAt) {
    return NextResponse.json({ ok: true, reason: "already_sent", sentAt });
  }

  const now = new Date();
  if (now < new Date(scheduledAt)) {
    return NextResponse.json({ ok: true, reason: "not_due", scheduledAt });
  }

  const { data: rows } = await admin
    .from("directory")
    .select("id, full_name, email")
    .not("email", "is", null)
    .is("claimed_by", null)
    .not("invited_at", "is", null)
    .order("full_name");

  const recipients = (rows ?? []) as { id: string; full_name: string; email: string | null }[];
  const origin = new URL(request.url).origin;
  let sent = 0;
  let failed = 0;

  for (const row of recipients) {
    const email = (row.email ?? "").trim();
    if (!email) {
      failed += 1;
      continue;
    }

    try {
      const link = await buildActivationLink(admin, email, origin);
      await sendActivationReminderEmail(email, row.full_name, link);
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  if (sent > 0) {
    await admin.from("app_settings").upsert({ key: SENT_KEY, value: now.toISOString() });
  }

  return NextResponse.json({
    ok: true,
    scheduledAt,
    scheduledLabel: formatLogLabel(scheduledAt),
    sent,
    failed,
    total: recipients.length,
  });
}
