/**
 * Real event sections (a "block" in the UI === a class section here).
 * Order matters: it drives filter dropdowns, the block table and seat ranges.
 */
export const SECTIONS = [
  "BSCPE 2-1",
  "BSCPE 2-2",
  "BSCPE 2-3",
  "BSCPE 2-4",
  "BSCPE 2-5",
  "BSCPE 2-6",
  "BSCPE 2-7",
  "BSCPE 1-1P",
] as const;

export type Section = (typeof SECTIONS)[number];

/** Section used for the demo "Block President" login. */
export const PRESIDENT_SECTION: Section = "BSCPE 2-1";

/** Distinct color per section for the "Sections" view of the seat map. */
export const SECTION_COLORS: Record<Section, { c: string; fg: string }> = {
  "BSCPE 2-1": { c: "#FFBF00", fg: "#1a1712" },
  "BSCPE 2-2": { c: "#FD8602", fg: "#ffffff" },
  "BSCPE 2-3": { c: "#2E7D52", fg: "#ffffff" },
  "BSCPE 2-4": { c: "#2D8CB8", fg: "#ffffff" },
  "BSCPE 2-5": { c: "#7C5CD6", fg: "#ffffff" },
  "BSCPE 2-6": { c: "#C2402F", fg: "#ffffff" },
  "BSCPE 2-7": { c: "#D14D8F", fg: "#ffffff" },
  "BSCPE 1-1P": { c: "#3A3A3A", fg: "#faf6ee" },
};
