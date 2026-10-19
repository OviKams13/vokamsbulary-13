import { TotwBadge } from "@/components/totw-badge";

export const POSTS_PER_TOTW = 15;

type TotwHeaderProps = {
  number: number;
  /** Published posts in this TOTW (0–15). */
  count: number;
  /** The current (last) TOTW gets the glow and the "Current" kicker. */
  current?: boolean;
};

/** Feed header for one TOTW: badge, title, 15-segment progress and count (mockup 01). */
export function TotwHeader({ number, count, current = false }: TotwHeaderProps) {
  const filled = Math.min(Math.max(count, 0), POSTS_PER_TOTW);
  const left = POSTS_PER_TOTW - filled;

  return (
    <header className="flex items-center gap-3 border-b border-line pb-6 sm:gap-5">
      <TotwBadge number={number} size="lg" glow={current} className="shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
          Team of the Week{current ? " · Current" : ""}
        </p>
        <h1 className="mt-1 font-display text-4xl leading-none font-extrabold tracking-wide sm:text-5xl">
          TOTW {number}
        </h1>
        <div
          className="mt-3 flex gap-1"
          role="progressbar"
          aria-label={`TOTW ${number} progress`}
          aria-valuemin={0}
          aria-valuemax={POSTS_PER_TOTW}
          aria-valuenow={filled}
        >
          {Array.from({ length: POSTS_PER_TOTW }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 max-w-5 min-w-0 flex-1 rounded-full ${index < filled ? "bg-gold" : "bg-line-strong"}`}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-display text-3xl leading-none font-extrabold sm:text-4xl">
          <span className="text-gold">{filled}</span>
          <span className="text-gold/70">/{POSTS_PER_TOTW}</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          {left === 0 ? "Complete" : `${left} post${left === 1 ? "" : "s"} to go`}
        </p>
      </div>
    </header>
  );
}
