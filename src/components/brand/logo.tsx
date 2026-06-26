import { cn } from "@/lib/utils";

/**
 * Hardhatting mark — a QR-finder-pattern glyph (nods to the QR/seating system)
 * rendered on a dark "app-icon" tile so it reads on both cream and dark
 * surfaces. Derived from the original bundle's thumbnail logo.
 */
export function Logo({
  className,
  tile = true,
}: {
  className?: string;
  tile?: boolean;
}) {
  const mark = (
    <svg
      viewBox="0 0 220 220"
      className={cn(!tile && className, "block")}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {/* top-left finder — amber */}
      <g fill="#FFBF00">
        <path fillRule="evenodd" d="M0 0h70v70H0Z M14 14v42h42V14Z" />
        <rect x="28" y="28" width="28" height="28" />
      </g>
      {/* top-right finder — orange */}
      <g fill="#FD8602">
        <path fillRule="evenodd" d="M150 0h70v70h-70Z M164 14v42h42V14Z" />
        <rect x="178" y="28" width="28" height="28" />
        {/* bottom-left finder */}
        <path fillRule="evenodd" d="M0 150h70v70H0Z M14 164v42h42v-42Z" />
        <rect x="28" y="178" width="28" height="28" />
      </g>
      {/* data dots — cream */}
      <g fill="#F9EEDA">
        <rect x="120" y="120" width="24" height="24" />
        <rect x="160" y="120" width="24" height="24" />
        <rect x="196" y="156" width="24" height="24" />
        <rect x="120" y="192" width="24" height="24" />
        <rect x="160" y="192" width="24" height="24" />
      </g>
    </svg>
  );

  if (!tile) return mark;

  return (
    <span
      className={cn(
        "grid place-items-center rounded-xl bg-brand-ink p-2 shadow-sm",
        className,
      )}
    >
      <span className="block w-full">{mark}</span>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("leading-none", className)}>
      <div className="font-display text-lg leading-none tracking-wide">
        CPE HARDHATTING
        <span className="ml-1 text-brand-orange">2026</span>
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Attendance · Seating
      </div>
    </div>
  );
}
