import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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

async function readOpen() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "activation_open")
    .maybeSingle();
  return data ? data.value === "true" : true;
}

/** GET — current activation state. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === "forbidden" ? 403 : 401 },
    );
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  return NextResponse.json({ open: await readOpen() });
}

/** POST { open: boolean } — pause or reopen activation. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === "forbidden" ? 403 : 401 },
    );
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { open?: boolean };
  const open = !!body.open;
  const admin = createAdminClient();
  const { error } = await admin
    .from("app_settings")
    .upsert({ key: "activation_open", value: open ? "true" : "false" });
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ open });
}
