import type { SeatStatus } from "./types";

export interface StatusConfig {
  /** background swatch */
  c: string;
  /** foreground (text on swatch) */
  fg: string;
  label: string;
  /** tailwind text color token for dots/labels */
  dot: string;
}

export const STATUS: Record<SeatStatus, StatusConfig> = {
  available: { c: "#ddd2ba", fg: "#6b6149", label: "Available", dot: "#c3b896" },
  assigned: { c: "#38342c", fg: "#faf6ee", label: "Assigned", dot: "#38342c" },
  present: { c: "#2e7d52", fg: "#ffffff", label: "Present", dot: "#2e7d52" },
  "no-show": { c: "#c2402f", fg: "#ffffff", label: "No-show", dot: "#c2402f" },
  flagged: { c: "#ffbf00", fg: "#1a1712", label: "Flagged", dot: "#ffbf00" },
};

export const STATUS_ORDER: SeatStatus[] = [
  "available",
  "assigned",
  "present",
  "no-show",
  "flagged",
];
