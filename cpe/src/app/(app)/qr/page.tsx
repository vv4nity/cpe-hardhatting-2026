"use client";

import { useState } from "react";
import { Building2, Download, Hash, Loader2, MapPin, User } from "lucide-react";
import { useApp } from "@/lib/store";
import { STATUS } from "@/lib/status";
import type { SeatStatus } from "@/lib/types";
import { downloadPassPng } from "@/lib/pass-image";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
        <Card className="overflow-hidden">
          <div className="h-1.5 w-full hazard-stripe" />
          <CardContent className="p-7 text-center">
            <div className="flex items-center justify-center gap-4 text-left">
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-xl font-bold text-muted-foreground shadow-sm ring-4 ring-card">
                {user.initials || <User className="size-8" />}
              </span>
              <div className="min-w-0">
                <div className="truncate font-display text-2xl tracking-wide">
                  {user.name}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {user.email}
                </div>
              </div>
            </div>

            <div className="mx-auto my-6 w-60 rounded-3xl border border-border bg-white p-5 shadow-sm">
              <QrCode value={payload} />
            </div>

            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold uppercase tracking-wide"
              style={{ background: cfg.c, color: cfg.fg }}
            >
              <span
                className="size-2 rounded-full"
                style={{ background: cfg.fg }}
              />
              {cfg.label}
            </span>

            <div className="mt-6 grid grid-cols-3 gap-2.5 text-left">
              <Meta icon={Hash} label="ID" value={user.id || "—"} />
              <Meta icon={MapPin} label="Seat" value={user.seat || "—"} />
              <Meta icon={Building2} label="Block" value={blockId} />
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Pass code:{" "}
              <span className="font-mono">{payload}</span>
            </p>
          </CardContent>
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
