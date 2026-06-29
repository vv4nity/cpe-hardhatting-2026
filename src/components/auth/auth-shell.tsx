import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Centered card layout shared by the Register / Sign-in screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="h-1.5 w-full hazard-stripe" />
      <div className="flex flex-1 items-center justify-center px-5 py-8 sm:py-10">
        <div className="w-full max-w-sm animate-fade-up">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Link>

          <h1 className="mt-4 font-display text-4xl leading-none tracking-wide sm:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          )}

          <div className="mt-6">{children}</div>

          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
