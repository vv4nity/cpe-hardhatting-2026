import type { Dataset } from "@/lib/types";
import { buildDataset } from "./dataset";

/**
 * Data-source seam.
 *
 * Today this returns an in-memory, deterministically-generated dataset. When a
 * real backend is wired up (Supabase / API), replace the body of `loadDataset`
 * with a fetch and keep the same shape — callers (the store) don't change.
 */

let cached: Dataset | null = null;

export function loadDataset(): Dataset {
  if (!cached) cached = buildDataset();
  return cached;
}

/** Async variant mirroring the future network API. */
export async function fetchDataset(): Promise<Dataset> {
  return loadDataset();
}
