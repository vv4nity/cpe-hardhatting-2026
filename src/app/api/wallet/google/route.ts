import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildGoogleWalletSaveUrl,
  isGoogleWalletConfigured,
} from "@/lib/wallet/google";

// jsonwebtoken (RS256 signing) needs the Node.js runtime.
export const runtime = "nodejs";

/** Returns an "Add to Google Wallet" save URL for the signed-in attendee. */
export async function GET(request: Request) {
  if (!isGoogleWalletConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, seat, block")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "no_profile" }, { status: 404 });
  }

  const payload = `HHC2026:${user.id}:${profile.seat || "NA"}`;
  const origin = new URL(request.url).origin;

  try {
    const url = buildGoogleWalletSaveUrl(
      {
        id: user.id,
        name: profile.full_name,
        seat: profile.seat,
        block: profile.block,
      },
      payload,
      origin,
    );
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: "build_failed", detail: e instanceof Error ? e.message : "" },
      { status: 500 },
    );
  }
}
