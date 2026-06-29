"use client";

import { useApp } from "@/lib/store";
import { roleLabel } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const user = useApp((s) => s.user)!;
  const blockId = user.block || user.presidentBlock || "—";

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="MY PROFILE"
        subtitle="Your account details and event assignment."
      />

      <div className="mx-auto max-w-2xl space-y-5">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-ink text-xl font-bold text-brand-cream">
              {user.initials}
            </span>
            <div className="min-w-0">
              <div className="truncate font-display text-2xl tracking-wide">
                {user.name}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-brand-amber px-2.5 py-0.5 font-bold uppercase tracking-wide text-brand-ink">
                  {roleLabel(user.role)}
                </span>
                {user.seat && (
                  <span className="text-muted-foreground">Seat {user.seat}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Account details
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnly label="Full name" value={user.name} full />
              <ReadOnly label="Email" value={user.email || "—"} full />
              <ReadOnly label="Block" value={blockId} />
              <ReadOnly label="Seat" value={user.seat || "—"} />
            </div>

            <p className="text-xs text-muted-foreground">
              These details come from the official class directory and can&apos;t
              be edited here. If something looks wrong, contact an organizer.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReadOnly({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={"space-y-2" + (full ? " sm:col-span-2" : "")}>
      <Label>{label}</Label>
      <div className="flex h-11 items-center overflow-hidden rounded-xl border border-border bg-secondary/40 px-3.5">
        <span className="truncate text-[15px] font-semibold">{value}</span>
      </div>
    </div>
  );
}
