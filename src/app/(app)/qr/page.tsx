"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2, Download, Hash, Loader2, MapPin, User } from "lucide-react";
import { useApp } from "@/lib/store";
import { STATUS } from "@/lib/status";
import type { SeatStatus } from "@/lib/types";
import { downloadPassPng } from "@/lib/pass-image";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, passPayload } from "@/components/qr-code";
import { AppleWalletIcon, GoogleWalletIcon } from "@/components/brand/wallet-icons";

export default function QrPage() {
  const user = useApp((s) => s.user)!;
  const showToast = useApp((s) => s.showToast);
  const myStatus = (user.status ?? "assigned") as SeatStatus;
  const cfg = STATUS[myStatus];
  const blockId = user.block || user.presidentBlock || "—";
  const payload = passPayload(user.id, user.seat);

  const [saving, setSaving] = useState(false);

  async function savePng() {
    setSaving(true);
    try {
      await downloadPassPng({
        name: user.name,
        seat: user.seat || "—",
        block: blockId,
        id: user.id || "—",
        statusLabel: cfg.label,
        payload,
      });
      showToast("Pass saved as PNG", "ok");
    } catch {
      showToast("Couldn't save the pass image", "err");
    } finally {
      setSaving(false);
    }
  }

  function addToWallet(provider: "Apple" | "Google") {
    // Real wallet passes require server-side signing (Apple PassKit cert /
    // Google Wallet service account). Stubbed until the backend is connected.
    showToast(`${provider} Wallet will be available once the backend is connected`, "warn");
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="MY QR PASS"
        subtitle="Present this code at any gate to check in. Keep your screen brightness up."
      />

      <div className="mx-auto max-w-md space-y-4">
        <Card className="overflow-hidden rounded-3xl p-0 shadow-md">
          {/* hero banner */}
          <div className="relative aspect-[41/18] w-full">
            <Image
              src="/main cover landscape.jpg"
              alt="Hardhatting Ceremony 2026"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 28rem"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-ink/70 to-transparent" />
            <span className="absolute right-4 top-3 inline-flex items-center gap-1.5 rounded-full bg-brand-amber px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-ink shadow-sm">
              Admission Pass
            </span>
          </div>

          {/* attendee row */}
          <div className="flex items-center gap-3.5 px-6 pb-4 pt-5">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-lg font-bold text-muted-foreground shadow-sm ring-4 ring-card">
              {user.initials || <User className="size-7" />}
            </span>
            <div className="min-w-0">
              <div className="truncate font-display text-xl tracking-wide">
                {user.name}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {user.email}
              </div>
            </div>
          </div>

          {/* details */}
          <div className="grid grid-cols-3 gap-2.5 px-6">
            <Meta icon={Hash} label="ID" value={user.id || "—"} />
            <Meta icon={MapPin} label="Seat" value={user.seat || "—"} />
            <Meta icon={Building2} label="Block" value={blockId} />
          </div>

          {/* perforation */}
          <div className="relative my-5 h-5">
            <span className="absolute left-0 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
            <span className="absolute right-0 top-1/2 size-5 -translate-y-1/2 translate-x-1/2 rounded-full bg-background" />
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-border" />
          </div>

          {/* QR stub */}
          <div className="px-6 pb-7 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Scan at the gate
            </p>
            <div className="mx-auto mt-3 w-56 max-w-full rounded-3xl border border-border bg-white p-5 shadow-sm">
              <QrCode value={payload} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Pass code: <span className="font-mono">{payload}</span>
            </p>
          </div>
        </Card>

        {/* save / wallet actions */}
        <div className="space-y-2.5">
          <Button
            className="w-full"
            size="lg"
            onClick={savePng}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Save as PNG
          </Button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => addToWallet("Apple")}
              className="flex items-center justify-center gap-2 rounded-xl bg-black px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:brightness-110 active:scale-[0.98]"
            >
              <AppleWalletIcon className="size-5" />
              Apple Wallet
            </button>
            <button
              onClick={() => addToWallet("Google")}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary/60 active:scale-[0.98]"
            >
              <GoogleWalletIcon className="size-5" />
              Google Wallet
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Add to Apple / Google Wallet activates once the event backend is
            connected.
          </p>
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
