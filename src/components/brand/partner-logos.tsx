import Image from "next/image";
import { cn } from "@/lib/utils";

/** ACCESS · PUP CpE Dept · ICPEP.SE partner logos, centered. */
export function PartnerLogos({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-6 sm:gap-8",
        className,
      )}
    >
      <Image
        src="/access.png"
        alt="ACCESS"
        width={200}
        height={200}
        className="h-10 w-auto object-contain sm:h-12"
      />
      <Image
        src="/cpe dept logo.png"
        alt="PUP CpE Department"
        width={265}
        height={264}
        className="h-10 w-auto object-contain sm:h-12"
      />
      <Image
        src="/icpep.png"
        alt="ICPEP SE - PUP"
        width={2000}
        height={2000}
        className="h-14 w-auto object-contain sm:h-16"
      />
    </div>
  );
}
