"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ToastTone } from "@/lib/types";

const TONE: Record<ToastTone, { ring: string; icon: React.ReactNode }> = {
  ok: {
    ring: "before:bg-brand-green",
    icon: <Check className="size-4 text-brand-green" />,
  },
  warn: {
    ring: "before:bg-brand-amber",
    icon: <AlertTriangle className="size-4 text-brand-amber" />,
  },
  err: {
    ring: "before:bg-brand-red",
    icon: <X className="size-4 text-brand-red" />,
  },
};

export function Toaster() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-brand-ink py-3 pl-4 pr-5 text-sm font-medium text-brand-cream shadow-2xl animate-fade-up",
            "before:absolute before:inset-y-0 before:left-0 before:w-1.5",
            TONE[t.tone].ring,
          )}
        >
          <span className="grid size-7 place-items-center rounded-full bg-white/10">
            {TONE[t.tone].icon}
          </span>
          {t.msg}
        </button>
      ))}
    </div>
  );
}
