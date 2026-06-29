import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for trusted server code only (route handlers).
 * Uses the SECRET key, which bypasses RLS — NEVER import this into client code.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** True once the server-side secret key is configured. */
export const isAdminConfigured = !!process.env.SUPABASE_SECRET_KEY;

/** True once email sending (Gmail SMTP) is configured. */
export const isEmailConfigured =
  !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
