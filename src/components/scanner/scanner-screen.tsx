"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CameraOff,
  LogOut,
  ScanLine,
  Sparkles,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { signOutEverywhere } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScanResultDialog } from "./scan-result-dialog";

const CAMERA_ID = "hhc-camera";

export function ScannerScreen() {
  const user = useApp((s) => s.user)!;
  const data = useApp((s) => s.data);
  const router = useRouter();

  const soundOn = useApp((s) => s.soundOn);
  const offlineOn = useApp((s) => s.offlineOn);
  const toggleSound = useApp((s) => s.toggleSound);
  const toggleOffline = useApp((s) => s.toggleOffline);
  const manualVal = useApp((s) => s.manualVal);
  const setManualVal = useApp((s) => s.setManualVal);
  const manualScan = useApp((s) => s.manualScan);
  const simulateScan = useApp((s) => s.simulateScan);
  const processScan = useApp((s) => s.processScan);
  const scanResult = useApp((s) => s.scanResult);
  const showToast = useApp((s) => s.showToast);
  const stats = useApp((s) => s.scanStats);

  const [scanning, setScanning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5Ref = useRef<any>(null);
  const scanResultRef = useRef(scanResult);
  scanResultRef.current = scanResult;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  function beep(ok: boolean) {
    if (!soundRef.current) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = ok ? 880 : 240;
      gain.gain.value = 0.06;
      osc.start();
      setTimeout(
        () => {
          osc.stop();
          ctx.close();
        },
        ok ? 120 : 200,
      );
    } catch {
      /* no-op */
    }
  }

  function onDecode(text: string) {
    if (scanResultRef.current) return; // wait until current result dismissed
    let att = null;
    if (typeof text === "string" && text.startsWith("HHC2026:")) {
      const id = text.split(":")[1];
      att = data.attMap[id] || null;
    }
    beep(!!att);
    processScan(att);
  }

  async function startCamera() {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!document.getElementById(CAMERA_ID)) return;
      const instance = new Html5Qrcode(CAMERA_ID);
      html5Ref.current = instance;
      await instance.start(
        { facingMode: "environment" },
        // no qrbox: scan the full frame and skip the library's own overlay,
        // so only our custom amber reticle is shown
        { fps: 10 },
        (txt) => onDecode(txt),
        () => {},
      );
      setScanning(true);
    } catch {
      html5Ref.current = null;
      showToast("Camera unavailable — use Simulate Scan", "warn");
    }
  }

  async function stopCamera() {
    const inst = html5Ref.current;
    if (inst) {
      try {
        await inst.stop();
        inst.clear();
      } catch {
        /* no-op */
      }
      html5Ref.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    stopCamera();
    await signOutEverywhere();
    router.replace("/");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-brand-ink text-brand-cream">
      {/* header */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="size-9" />
          <div className="leading-tight">
            <div className="font-display text-lg tracking-wide">SCANNER STATION</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-brand-cream/60">
              {user.scanner || "Gate A · Reyes"}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="text-brand-cream hover:bg-white/10"
        >
          <LogOut /> Sign out
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
        {/* viewport */}
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-black">
          <div
            id={CAMERA_ID}
            className="absolute inset-0 [&_video]:size-full [&_video]:object-cover"
          />

          {/* idle overlay */}
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 text-center backdrop-blur-[1px]">
              <span className="grid size-14 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <ScanLine className="size-7 text-brand-amber" />
              </span>
              <p className="max-w-[16rem] px-6 text-sm text-brand-cream/70">
                Camera is off. Start the camera or simulate a scan to record
                attendance.
              </p>
            </div>
          )}

          {/* reticle */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative aspect-square w-2/3 max-w-[15rem] overflow-hidden rounded-xl">
              {[
                "left-0 top-0 rounded-tl-xl border-l-[3px] border-t-[3px]",
                "right-0 top-0 rounded-tr-xl border-r-[3px] border-t-[3px]",
                "left-0 bottom-0 rounded-bl-xl border-b-[3px] border-l-[3px]",
                "right-0 bottom-0 rounded-br-xl border-b-[3px] border-r-[3px]",
              ].map((pos) => (
                <span
                  key={pos}
                  className={cn(
                    "absolute size-8 transition-colors",
                    pos,
                    scanning
                      ? "animate-reticle border-brand-amber"
                      : "border-white/35",
                  )}
                />
              ))}

              {/* laser sweep */}
              {scanning && (
                <>
                  <div className="absolute inset-x-2 h-10 -translate-y-1/2 animate-scan rounded-full bg-brand-amber/15 blur-md" />
                  <div className="absolute inset-x-2 h-0.5 -translate-y-1/2 animate-scan rounded-full bg-brand-amber/90 shadow-[0_0_8px_1px] shadow-brand-amber/50" />
                </>
              )}
            </div>
          </div>
        </div>

        <Button
          size="lg"
          variant={scanning ? "destructive" : "success"}
          onClick={() => (scanning ? stopCamera() : startCamera())}
        >
          {scanning ? <CameraOff /> : <Camera />}
          {scanning ? "Stop camera" : "Start camera"}
        </Button>

        <Button
          variant="accent"
          size="lg"
          onClick={simulateScan}
          className="-mt-2"
        >
          <Sparkles />
          Simulate scan
        </Button>

        {/* manual */}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            manualScan();
          }}
        >
          <Input
            value={manualVal}
            onChange={(e) => setManualVal(e.target.value)}
            placeholder="Manual: seat or ID (e.g. C12)"
            className="border-white/15 bg-white/5 text-brand-cream placeholder:text-brand-cream/40"
          />
          <Button type="submit" variant="outline" className="shrink-0 border-white/15 bg-white/5 text-brand-cream hover:bg-white/10">
            Check in
          </Button>
        </form>

        {/* toggles */}
        <div className="grid grid-cols-2 gap-3">
          <Toggle
            on={offlineOn}
            onToggle={toggleOffline}
            icon={<WifiOff className="size-4" />}
            label="Offline mode"
          />
          <Toggle
            on={soundOn}
            onToggle={toggleSound}
            icon={
              soundOn ? (
                <Volume2 className="size-4" />
              ) : (
                <VolumeX className="size-4" />
              )
            }
            label="Scan sound"
          />
        </div>

        {/* stats */}
        <div className="mt-auto grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <Stat value={stats.total} label="Scanned" />
          <Stat value={stats.success} label="Checked in" tone="text-brand-amber" />
          <Stat value={stats.dup} label="Duplicates" tone="text-brand-orange" />
        </div>
      </main>

      <ScanResultDialog />
    </div>
  );
}

function Toggle({
  on,
  onToggle,
  icon,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </span>
      <Switch checked={on} onCheckedChange={onToggle} />
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: string;
}) {
  return (
    <div>
      <div className={cn("font-display text-3xl leading-none", tone)}>
        {value}
      </div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-brand-cream/60">
        {label}
      </div>
    </div>
  );
}
