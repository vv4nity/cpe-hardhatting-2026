"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CameraOff,
  LogOut,
  ScanLine,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { signOutEverywhere } from "@/lib/auth-actions";
import {
  checkInSeat,
  flushQueue,
  queueCount,
  seatFromScan,
} from "@/lib/checkin";
import { refreshStaffData } from "@/lib/supabase/refresh";
import { initialsOf } from "@/lib/format";
import { STATUS } from "@/lib/status";
import type { Attendee, ScanResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanResultDialog } from "./scan-result-dialog";

const CAMERA_ID = "hhc-camera";

const GREEN = STATUS.present.c;
const RED = STATUS["no-show"].c;
const AMBER = "#d99514";

export function ScannerScreen() {
  const data = useApp((s) => s.data);
  const router = useRouter();

  const soundOn = useApp((s) => s.soundOn);
  const toggleSound = useApp((s) => s.toggleSound);
  const manualVal = useApp((s) => s.manualVal);
  const setManualVal = useApp((s) => s.setManualVal);
  const scanResult = useApp((s) => s.scanResult);
  const applyScanResult = useApp((s) => s.applyScanResult);
  const markPresentLocal = useApp((s) => s.markPresentLocal);
  const online = useApp((s) => s.online);
  const setOnline = useApp((s) => s.setOnline);
  const pending = useApp((s) => s.pendingCount);
  const setPendingCount = useApp((s) => s.setPendingCount);
  const showToast = useApp((s) => s.showToast);
  const stats = useApp((s) => s.scanStats);

  const [scanning, setScanning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5Ref = useRef<any>(null);
  const dataRef = useRef(data);
  const resultRef = useRef(scanResult);
  const busyRef = useRef(false);
  const soundRef = useRef(soundOn);
  const syncingRef = useRef(false);
  // keep the refs (read inside camera callbacks) in sync after each render
  useEffect(() => {
    dataRef.current = data;
    resultRef.current = scanResult;
    soundRef.current = soundOn;
  });

  // push any queued (offline) check-ins to the server; safe to call anytime
  async function syncQueue(announce = false) {
    if (syncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (queueCount() === 0) return;
    syncingRef.current = true;
    try {
      const n = await flushQueue();
      setPendingCount(queueCount());
      if (n > 0) {
        setOnline(true);
        refreshStaffData();
        if (announce) {
          showToast(
            `Synced ${n} offline check-in${n === 1 ? "" : "s"}`,
            "ok",
          );
        }
      }
    } finally {
      syncingRef.current = false;
    }
  }
  const syncRef = useRef(syncQueue);
  useEffect(() => {
    syncRef.current = syncQueue;
  });

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

  function details(att: Attendee) {
    return {
      id: att.id,
      email: att.email,
      initials: initialsOf(att.name),
    };
  }

  function successResult(att: Attendee, queued: boolean): ScanResult {
    return {
      tone: GREEN,
      icon: "check",
      title: queued ? "CHECKED IN · OFFLINE" : "CHECKED IN",
      name: att.name,
      seat: att.seat,
      block: att.block,
      ...details(att),
      status: "present",
      checkIn: null,
      sub: queued
        ? "No connection — saved and will sync automatically."
        : "Welcome! Attendance recorded.",
      outcome: "success",
    };
  }
  function dupResult(att: Attendee): ScanResult {
    return {
      tone: AMBER,
      icon: "alert",
      title: "ALREADY IN",
      name: att.name,
      seat: att.seat,
      block: att.block,
      ...details(att),
      status: "present",
      checkIn: att.checkIn,
      sub: "This attendee has already been checked in.",
      outcome: "duplicate",
    };
  }
  function invalidResult(sub: string): ScanResult {
    return {
      tone: RED,
      icon: "x",
      title: "INVALID CODE",
      name: "Unrecognized pass",
      seat: "—",
      block: "—",
      sub,
      outcome: "invalid",
    };
  }

  async function handleScan(raw: string) {
    if (resultRef.current || busyRef.current) return;
    const seat = seatFromScan(raw);
    const att = seat
      ? dataRef.current.attendees.find(
          (a) => a.seat.toUpperCase() === seat || a.id.toUpperCase() === seat,
        )
      : null;
    if (!att) {
      beep(false);
      applyScanResult(invalidResult("This code isn't a valid attendee pass."));
      return;
    }
    if (att.status === "present") {
      beep(false);
      applyScanResult(dupResult(att));
      return;
    }
    busyRef.current = true;
    try {
      const res = await checkInSeat(att.seat);
      if (res.outcome === "success" || res.outcome === "queued") {
        beep(true);
        markPresentLocal(att.seat); // optimistic; admin updates via realtime
        applyScanResult(successResult(att, res.outcome === "queued"));
      } else if (res.outcome === "duplicate") {
        beep(false);
        markPresentLocal(att.seat);
        applyScanResult(dupResult(att));
      } else {
        beep(false);
        applyScanResult(
          invalidResult(
            res.outcome === "forbidden"
              ? "This account isn't allowed to scan."
              : "This pass isn't valid.",
          ),
        );
      }
      setPendingCount(queueCount());
      // a successful online scan proves connectivity — drain any backlog now
      if (res.outcome !== "queued") syncRef.current(true);
    } finally {
      busyRef.current = false;
    }
  }

  // connectivity + offline queue sync
  useEffect(() => {
    setOnline(navigator.onLine);
    setPendingCount(queueCount());
    const goOnline = () => {
      setOnline(true);
      syncRef.current(true);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    // periodic safety net: retry queued scans even on flaky signal where the
    // browser never fires a clean offline→online transition
    const timer = setInterval(() => syncRef.current(true), 20_000);
    // try once on mount in case scans were queued in a previous session
    syncRef.current(true);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!document.getElementById(CAMERA_ID)) return;
      const instance = new Html5Qrcode(CAMERA_ID);
      html5Ref.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10 },
        (txt) => handleScan(txt),
        () => {},
      );
      setScanning(true);
    } catch {
      html5Ref.current = null;
      showToast("Camera unavailable — use manual entry", "warn");
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
  }, []);

  async function signOut() {
    stopCamera();
    await signOutEverywhere();
    router.replace("/");
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-ink text-brand-cream">
      {/* header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <div className="leading-tight">
            <div className="font-display text-base tracking-wide">SCANNER</div>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide",
                online ? "text-brand-green" : "text-brand-amber",
              )}
            >
              {online ? (
                <Wifi className="size-3" />
              ) : (
                <WifiOff className="size-3" />
              )}
              {online ? "Online" : "Offline"}
              {pending > 0 && ` · ${pending} queued`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSound}
            aria-label="Toggle scan sound"
            className="grid size-9 place-items-center rounded-xl text-brand-cream/80 hover:bg-white/10"
          >
            {soundOn ? (
              <Volume2 className="size-5" />
            ) : (
              <VolumeX className="size-5" />
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-brand-cream hover:bg-white/10"
          >
            <LogOut /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
        {/* viewport — fills the available space */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black">
          <div
            id={CAMERA_ID}
            className="absolute inset-0 [&_video]:size-full [&_video]:object-cover"
          />

          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 text-center backdrop-blur-[1px]">
              <span className="grid size-14 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <ScanLine className="size-7 text-brand-amber" />
              </span>
              <p className="max-w-[16rem] px-6 text-sm text-brand-cream/70">
                Start the camera and point it at an attendee&apos;s QR pass.
              </p>
            </div>
          )}

          {/* reticle */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative aspect-square w-1/2 max-w-[13rem] overflow-hidden rounded-xl">
              {[
                "left-0 top-0 rounded-tl-xl border-l-[3px] border-t-[3px]",
                "right-0 top-0 rounded-tr-xl border-r-[3px] border-t-[3px]",
                "left-0 bottom-0 rounded-bl-xl border-b-[3px] border-l-[3px]",
                "right-0 bottom-0 rounded-br-xl border-b-[3px] border-r-[3px]",
              ].map((pos) => (
                <span
                  key={pos}
                  className={cn(
                    "absolute size-7 transition-colors",
                    pos,
                    scanning
                      ? "animate-reticle border-brand-amber"
                      : "border-white/35",
                  )}
                />
              ))}
              {scanning && (
                <>
                  <div className="absolute inset-x-2 h-10 -translate-y-1/2 animate-scan rounded-full bg-brand-amber/15 blur-md" />
                  <div className="absolute inset-x-2 h-0.5 -translate-y-1/2 animate-scan rounded-full bg-brand-amber/90 shadow-[0_0_8px_1px] shadow-brand-amber/50" />
                </>
              )}
            </div>
          </div>

          {/* offline banner */}
          {!online && (
            <div className="absolute inset-x-0 top-0 bg-brand-amber px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-brand-ink">
              Offline — scans are saved and sync automatically
            </div>
          )}
        </div>

        {/* controls */}
        <div className="shrink-0 space-y-2.5">
          <Button
            size="lg"
            variant={scanning ? "destructive" : "success"}
            className="w-full"
            onClick={() => (scanning ? stopCamera() : startCamera())}
          >
            {scanning ? <CameraOff /> : <Camera />}
            {scanning ? "Stop camera" : "Start camera"}
          </Button>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = manualVal.trim();
              if (!v) return;
              setManualVal("");
              handleScan(v);
            }}
          >
            <Input
              value={manualVal}
              onChange={(e) => setManualVal(e.target.value)}
              placeholder="Manual seat (e.g. C12)"
              className="border-white/15 bg-white/5 text-brand-cream placeholder:text-brand-cream/40"
            />
            <Button
              type="submit"
              variant="outline"
              className="shrink-0 border-white/15 bg-white/5 text-brand-cream hover:bg-white/10"
            >
              Check in
            </Button>
          </form>

          {/* stats */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-center">
            <Stat value={stats.total} label="Scanned" />
            <Stat value={stats.success} label="Checked in" tone="text-brand-amber" />
            <Stat value={stats.dup} label="Duplicates" tone="text-brand-orange" />
          </div>
        </div>
      </main>

      <ScanResultDialog />
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
      <div className={cn("font-display text-2xl leading-none", tone)}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-cream/60">
        {label}
      </div>
    </div>
  );
}
