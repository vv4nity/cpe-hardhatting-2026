import { NextResponse } from "next/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { requireAdmin, adminError } from "@/lib/supabase/admin-guard";

export const runtime = "nodejs";

export interface Recipient {
  id: string;
  name: string;
  email: string;
  block: string;
  seat: string;
  registered: boolean;
  invited: boolean;
}

/** GET — every directory entry with its email + registration status. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return adminError(auth);
  if (!isAdminConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("directory")
    .select("id, full_name, email, block, seat, claimed_by, invited_at")
    .order("full_name");
  const recipients: Recipient[] = (data ?? []).map((d) => ({
    id: d.id as string,
    name: d.full_name as string,
    email: (d.email as string) ?? "",
    block: d.block as string,
    seat: (d.seat as string) ?? "",
    registered: !!d.claimed_by,
    invited: !!d.invited_at,
  }));
  return NextResponse.json({ recipients });
}
