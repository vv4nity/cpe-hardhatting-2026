import { useApp } from "@/lib/store";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/** Ends both the real Supabase session (if any) and the local/demo session. */
export async function signOutEverywhere() {
  if (isSupabaseConfigured) {
    try {
      await createClient().auth.signOut();
    } catch {
      /* ignore */
    }
  }
  useApp.getState().logout();
}
