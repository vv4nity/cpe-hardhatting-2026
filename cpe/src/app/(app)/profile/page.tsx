"use client";

import { Check, Pencil } from "lucide-react";
import { useApp } from "@/lib/store";
import { roleLabel } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const user = useApp((s) => s.user)!;
  const profileEdit = useApp((s) => s.profileEdit);
  const editName = useApp((s) => s.editName);
  const editEmail = useApp((s) => s.editEmail);
  const setEditName = useApp((s) => s.setEditName);
  const setEditEmail = useApp((s) => s.setEditEmail);
  const startEdit = useApp((s) => s.startEdit);
  const saveProfile = useApp((s) => s.saveProfile);

  const blockId = user.block || user.presidentBlock || "—";

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="MY PROFILE"
        subtitle="Manage your account details and event assignment."
      />

      <div className="mx-auto max-w-2xl space-y-5">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <span className="grid size-16 place-items-center rounded-2xl bg-brand-ink text-xl font-bold text-brand-cream">
              {user.initials}
            </span>
            <div className="min-w-0">
              <div className="font-display text-2xl tracking-wide">
                {user.name}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-brand-amber px-2.5 py-0.5 font-bold uppercase tracking-wide text-brand-ink">
                  {roleLabel(user.role)}
                </span>
                <span className="text-muted-foreground">
                  {user.id ? `ID ${user.id}` : "Console account"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Account details
              </h2>
              {profileEdit ? (
                <Button variant="success" size="sm" onClick={saveProfile}>
                  <Check /> Save changes
                </Button>
              ) : (
                <Button size="sm" onClick={startEdit}>
                  <Pencil /> Edit profile
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={editName}
                  disabled={!profileEdit}
                  onChange={(e) => setEditName(e.target.value)}
                  className={
                    profileEdit ? "border-brand-orange" : "bg-secondary/40"
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pemail">Email</Label>
                <Input
                  id="pemail"
                  type="email"
                  value={editEmail}
                  disabled={!profileEdit}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={
                    profileEdit ? "border-brand-orange" : "bg-secondary/40"
                  }
                />
              </div>

              <ReadOnly label="Block" value={blockId} />
              <ReadOnly label="Seat" value={user.seat || "—"} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex h-11 items-center rounded-xl border border-border bg-secondary/40 px-3.5 text-[15px] font-semibold">
        {value}
      </div>
    </div>
  );
}
