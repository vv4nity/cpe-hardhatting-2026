"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useApp } from "@/lib/store";

/**
 * Attendee "you're checked in!" moment. Fires when the store's `checkinFlash`
 * counter is bumped (the provider does this the instant the attendee's row
 * flips to present via realtime): a confetti burst, a chime, a vibration, and a
 * brief celebratory overlay. The persistent "Checked in" state lives on the QR
 * and dashboard pages.
 */
export function CheckinCelebration() {
  const flash = useApp((s) => s.checkinFlash);
  const [show, setShow] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    // skip the initial mount (counter starts at 0)
    if (first.current) {
      first.current = false;
      return;
    }
    if (flash <= 0) return;
    setShow(true);
    burstConfetti();
    chime();
    try {
      navigator.vibrate?.([60, 40, 120]);
    } catch {
      /* no-op */
    }
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShow(false), 2800);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [flash]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center p-6">
      <div className="animate-fade-up rounded-3xl border border-brand-green/30 bg-card/95 px-8 py-7 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-green/12 text-brand-green">
          <CheckCircle2 className="size-9" />
        </div>
        <div className="mt-4 font-display text-3xl tracking-wide">
          YOU&apos;RE CHECKED IN!
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome to CPE Hardhatting 2026 🎉
        </p>
      </div>
    </div>
  );
}

function chime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    ([
      [880, 0],
      [1320, 0.12],
    ] as const).forEach(([f, t]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = f;
      const start = ctx.currentTime + t;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      o.start(start);
      o.stop(start + 0.26);
    });
    setTimeout(() => ctx.close(), 700);
  } catch {
    /* no-op */
  }
}

function burstConfetti() {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:65";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  const colors = ["#ffbf00", "#fd8602", "#2e7d52", "#f9eeda", "#ea580c"];
  const parts = Array.from({ length: 130 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 140,
    y: canvas.height / 3,
    vx: (Math.random() - 0.5) * 9,
    vy: Math.random() * -7 - 4,
    size: Math.random() * 7 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
  }));
  let frame = 0;
  const gravity = 0.22;
  function tick() {
    frame++;
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx!.restore();
    }
    if (frame < 170) requestAnimationFrame(tick);
    else canvas.remove();
  }
  requestAnimationFrame(tick);
}
