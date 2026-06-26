/** Full-screen on-brand loading screen with shimmering wordmark. */
export function BrandLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6">
      <div className="animate-fade-up text-center">
        <p className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
          <span className="h-px w-6 bg-brand-orange/50" />
          Coded for the Future
          <span className="h-px w-6 bg-brand-orange/50" />
        </p>

        <h1 className="text-shimmer mt-4 font-display text-5xl leading-[0.92] tracking-wide sm:text-7xl">
          HARDHATTING
          <br />
          CEREMONY 2026
        </h1>

        <div className="mx-auto mt-8 h-1 w-44 overflow-hidden rounded-full bg-secondary">
          <div className="animate-loadbar h-full w-1/3 rounded-full bg-brand-amber" />
        </div>
      </div>
    </div>
  );
}
