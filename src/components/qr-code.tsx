"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/**
 * Renders `value` as a branded QR on a white tile. Draws at the module's own
 * resolution (scale) and lets CSS size it square, so it stays crisp at any
 * width and always keeps a scannable quiet zone + light/dark contrast.
 */
export function QrCode({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, value, {
      margin: 2,
      scale: 8,
      color: { dark: "#1a1712ff", light: "#ffffffff" },
      errorCorrectionLevel: "M",
    }).catch(() => {});
  }, [value]);

  return (
    <canvas
      ref={ref}
      aria-label="Attendance QR pass"
      className={cn("block aspect-square w-full max-w-full", className)}
    />
  );
}

/** Stable QR payload for an attendee pass. */
export function passPayload(id?: string, seat?: string) {
  return `HHC2026:${id || "GUEST"}:${seat || "NA"}`;
}
