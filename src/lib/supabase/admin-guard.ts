import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "./server";

export type AdminCheck = { ok: true } | { error: "unauthenticated" | "forbidden" };

/** Verify the caller is a signed-in admin (via their session cookie). */
export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "forbidden" };
  return { ok: true };
}

/** Verify the caller is signed-in staff (admin OR scanner). */
export async function requireStaff(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "scanner") {
    return { error: "forbidden" };
  }
  return { ok: true };
}

/** Standard JSON error response for a failed admin check. */
export function adminError(check: { error: "unauthenticated" | "forbidden" }) {
  return NextResponse.json(
    { error: check.error },
    { status: check.error === "forbidden" ? 403 : 401 },
  );
}
