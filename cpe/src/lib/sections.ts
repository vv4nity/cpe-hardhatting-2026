/**
 * Real event sections (a "block" in the UI === a class section here).
 * Order matters: it drives filter dropdowns, the block table and seat ranges.
 *
 * NOTE: the seat-to-section mapping in `lib/data/dataset.ts` is still
 * provisional (even row-based split) until the official seat plan is wired in.
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
