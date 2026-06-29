"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

/**
 * The session store persists to localStorage with `skipHydration`, so it starts
 * empty on the server and on the first client paint (no mismatch). This hook
 * reports when rehydration has finished, letting route guards wait before they
 * decide whether to redirect an unauthenticated visitor.
 */
export function useHydrated(): boolean {
  // Always start false so server prerender and first client paint agree; the
  // persist API is only touched inside the effect (never during render/SSR).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = useApp.persist;
    if (!persist) {
      setHydrated(true);
      return;
    }
    const unsub = persist.onFinishHydration(() => setHydrated(true));
    persist.rehydrate();
    if (persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  return hydrated;
}
