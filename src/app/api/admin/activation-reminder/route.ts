import { NextResponse } from "next/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { requireAdmin, adminError } from "@/lib/supabase/admin-guard";

export const runtime = "nodejs";

const TARGET_KEY = "activation_reminder_at";
const SENT_KEY = "activation_reminder_sent_at";

function nextManila930(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day + 1, 1, 30, 0, 0));
}

function formatManila(date: string | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

async function readState(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from("app_settings")
    .select("key, value")
    .in("key", [TARGET_KEY, SENT_KEY]);
  const map = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
  return {
    scheduledAt: map[TARGET_KEY] || null,
    sentAt: map[SENT_KEY] || null,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const admin = createAdminClient();
  const state = await readState(admin);
  return NextResponse.json({
    ...state,
    scheduledLabel: formatManila(state.scheduledAt),
    sentLabel: formatManila(state.sentAt),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { action } = (await request.json().catch(() => ({}))) as {
    action?: "schedule_tomorrow";
  };
  if (action !== "schedule_tomorrow") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const admin = createAdminClient();
  const scheduledAt = nextManila930().toISOString();
  const { error } = await admin.from("app_settings").upsert([
    { key: TARGET_KEY, value: scheduledAt },
    { key: SENT_KEY, value: "" },
  ]);

  if (error) {
    return NextResponse.json({ error: "schedule_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    scheduledAt,
    scheduledLabel: formatManila(scheduledAt),
  });
}
