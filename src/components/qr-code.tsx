"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/**
 * Renders `value` as a QR code as a square <img> (from a data URL). Using an
 * <img> instead of a <canvas> keeps sizing reliable — it always fills its
 * square box without stretching or overflowing.
 */
export function QrCode({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL(value, {
      margin: 2,
      scale: 8,
      color: { dark: "#1a1712ff", light: "#ffffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setUrl)
      .catch(() => {});
  }, [value]);

  return (
    <div
      className={cn(
        "aspect-square w-full max-w-full overflow-hidden",
        className,
      )}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Attendance QR pass"
          className="block size-full"
        />
      )}
    </div>
  );
}

/** Stable QR payload for an attendee pass. */
export function passPayload(id?: string, seat?: string) {
  return `HHC2026:${id || "GUEST"}:${seat || "NA"}`;
}
