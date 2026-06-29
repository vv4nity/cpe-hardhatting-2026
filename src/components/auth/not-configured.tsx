import { Construction } from "lucide-react";

/** Shown when the Supabase backend isn't connected yet (missing env vars). */
export function NotConfiguredNotice() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5">
      <div className="flex items-center gap-2 font-semibold">
        <Construction className="size-5 text-brand-orange" />
        Not live yet
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        The event database isn&apos;t connected yet, so registration and sign-in
        aren&apos;t active. Please check back soon.
      </p>
    </div>
  );
}
