import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendInviteEmail } from "./invite";

export interface InviteRow {
  id: string;
  full_name: string;
  email: string | null;
}

export interface InviteResult {
  id: string;
  name: string;
  email: string;
  status: "sent" | "failed";
  reason?: string;
  account?: "primary" | "backup";
}

/** Build an /activate link for an email, preferring invite links. */
export async function buildActivationLink(
  admin: SupabaseClient,
  email: string,
  origin: string,
) {
  let type: "invite" | "magiclink" = "invite";
  let res = await admin.auth.admin.generateLink({ type, email });
  if (res.error && /registered|already|exists/i.test(res.error.message || "")) {
    type = "magiclink";
    res = await admin.auth.admin.generateLink({ type, email });
  }
  if (res.error || !res.data?.properties?.hashed_token) {
    throw new Error(res.error?.message || "link generation failed");
  }
  // Land on /activate (which renders a click-gated button) rather than hitting
  // /auth/confirm directly — so email security scanners that pre-fetch the link
  // can't consume the one-time token before the student clicks.
  return `${origin}/activate?token_hash=${res.data.properties.hashed_token}&type=${type}`;
}

/** Invite a single directory row: generate link, send email, mark invited. */
export async function inviteOne(
  admin: SupabaseClient,
  row: InviteRow,
  origin: string,
): Promise<InviteResult> {
  const email = (row.email ?? "").trim();
  const base = { id: row.id, name: row.full_name, email };
  if (!email) return { ...base, status: "failed", reason: "no email on file" };
  try {
    const link = await buildActivationLink(admin, email, origin);
    const { account } = await sendInviteEmail(email, row.full_name, link);
    await admin
      .from("directory")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ...base, status: "sent", account };
  } catch (e) {
    return {
      ...base,
      status: "failed",
      reason: e instanceof Error ? e.message : "send error",
    };
  }
}
