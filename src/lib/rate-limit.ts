import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateRule {
  windowSec: number;
  max: number;
}

/** 1 request / 2 min AND max 5 / hour. */
export const STANDARD_LIMIT: RateRule[] = [
  { windowSec: 120, max: 1 },
  { windowSec: 3600, max: 5 },
];

/** Best-effort client IP from proxy headers. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * DB-backed rate limit. Returns true if allowed (and records the event),
 * false if any rule is exceeded. Uses the service-key client.
 */
export async function rateLimit(
  admin: SupabaseClient,
  key: string,
  rules: RateRule[] = STANDARD_LIMIT,
): Promise<boolean> {
  const now = Date.now();
  for (const rule of rules) {
    const since = new Date(now - rule.windowSec * 1000).toISOString();
    const { count } = await admin
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("bucket", key)
      .gte("created_at", since);
    if ((count ?? 0) >= rule.max) return false;
  }
  await admin.from("rate_limits").insert({ bucket: key });
  // opportunistic cleanup of stale rows for this bucket
  const oldest = new Date(now - 3600 * 1000 * 2).toISOString();
  await admin.from("rate_limits").delete().eq("bucket", key).lt("created_at", oldest);
  return true;
}
