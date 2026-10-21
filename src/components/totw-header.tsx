import { TotwBadge } from "@/components/totw-badge";
import { TOTW_SIZE as POSTS_PER_TOTW } from "@/lib/totw";

type TotwHeaderProps = {
  number: number;
  /** Published posts in this TOTW (0–15). */
  count: number;
  /** The current (last) TOTW gets the glow and the "Current" kicker. */
  current?: boolean;
};

/**
 * Feed header for one TOTW (5.3): badge, title, 15-segment bar and count.
 * Desktop (01-D): count + "N posts to go" on the right, line underneath.
 * Mobile (01-M): compact — "Current team", count in the top-right corner,
 * the bar under the whole text block.
 */
export function TotwHeader({ number, count, current = false }: TotwHeaderProps) {
  const filled = Math.min(Math.max(count, 0), POSTS_PER_TOTW);
  const left = POSTS_PER_TOTW - filled;
  const total = <Count filled={filled} />;

  return (
    <header className="flex items-end gap-3.5 sm:items-center sm:gap-5 sm:border-b sm:border-line sm:pb-7">
      <TotwBadge
        number={number}
        size="lg"
        glow={current}
        className="h-auto w-13 shrink-0 sm:w-17"
      />

      <div className="min-w-0 flex-1 sm:self-end sm:pb-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-muted uppercase sm:text-xs">
              {current ? (
                <>
                  <span className="sm:hidden">Current team</span>
                  <span className="hidden sm:inline">Team of the Week · Current</span>
                </>
              ) : (
                "Team of the Week"
              )}
            </p>
            <h1 className="mt-0.5 font-display text-[1.75rem] leading-none font-extrabold tracking-wide sm:mt-1.5 sm:text-5xl">
              TOTW {number}
            </h1>
          </div>
          <p className="-mt-3 font-display text-[1.75rem] leading-none font-extrabold sm:hidden">
            {total}
          </p>
        </div>

        <div
          className="mt-2.5 flex gap-1 sm:mt-3.5"
          role="progressbar"
          aria-label={`TOTW ${number} progress`}
          aria-valuemin={0}
          aria-valuemax={POSTS_PER_TOTW}
          aria-valuenow={filled}
        >
          {Array.from({ length: POSTS_PER_TOTW }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 min-w-0 flex-1 rounded-full sm:max-w-5 ${index < filled ? "bg-gold" : "bg-line-strong"}`}
            />
          ))}
        </div>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="font-display text-4xl leading-none font-extrabold">{total}</p>
        <p className="mt-1.5 text-sm text-muted">
          {left === 0 ? "Complete" : `${left} post${left === 1 ? "" : "s"} to go`}
        </p>
      </div>
    </header>
  );
}

function Count({ filled }: { filled: number }) {
  return (
    <>
      <span className="text-gold">{filled}</span>
      <span className="text-gold/60">/{POSTS_PER_TOTW}</span>
    </>
  );
}
