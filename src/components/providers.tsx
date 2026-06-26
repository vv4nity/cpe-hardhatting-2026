"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { Toaster } from "./toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  // Rehydrate the persisted session once on the client (store uses skipHydration).
  useEffect(() => {
    useApp.persist.rehydrate();
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
