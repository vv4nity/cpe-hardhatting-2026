import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PartnerLogos } from "@/components/brand/partner-logos";

/**
 * Split-screen auth layout: event cover on one side (portrait on desktop,
 * landscape banner on mobile), the form column on the other with a partner
 * footer. Shared by Sign-in and Activate so they stay consistent.
 */
export function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      {/* cover */}
      <div className="relative shrink-0 lg:h-dvh lg:w-[44%]">
        <div className="h-1.5 w-full hazard-stripe lg:hidden" />
        <Image
          src="/main cover landscape.jpg"
          alt="Hardhatting Ceremony 2026 — Coded for the Future"
          width={820}
          height={360}
          priority
          sizes="(max-width: 1024px) 100vw, 0px"
          className="block h-auto w-full object-cover lg:hidden"
        />
        <Image
          src="/main cover portrait.jpg"
          alt="Hardhatting Ceremony 2026 — Coded for the Future"
          fill
          priority
          sizes="(max-width: 1024px) 0px, 44vw"
          className="hidden object-cover lg:block"
        />
      </div>

      {/* form side */}
      <div className="flex flex-1 flex-col px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8 animate-fade-up">
          {children}
        </div>

        <div className="mx-auto w-full max-w-sm border-t border-border/70 pt-5">
          <PartnerLogos />
        </div>
      </div>
    </div>
  );
}
