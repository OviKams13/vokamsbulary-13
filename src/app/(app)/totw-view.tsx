import { EmptyTotw } from "@/components/empty-totw";
import { TotwHeader } from "@/components/totw-header";
import type { TotwSummary } from "@/lib/totw";

/**
 * Main area for one TOTW, used by `/` (current TOTW) and `/totw/[n]`.
 * An empty TOTW shows the empty state (4.4). The posts themselves are the
 * feed, built in Phase 5.
 */
export function TotwView({ totw }: { totw: TotwSummary }) {
  if (totw.count === 0) return <EmptyTotw number={totw.number} />;

  return (
    <main className="mx-auto w-full max-w-feed px-4 pt-5 pb-28 lg:pt-4 lg:pb-12">
      <TotwHeader number={totw.number} count={totw.count} current={totw.current} />
      <p className="mt-8 rounded-paper border border-dashed border-line-strong px-5 py-10 text-center text-sm text-muted">
        {totw.count} post{totw.count === 1 ? "" : "s"} in TOTW {totw.number}. The feed arrives in
        Phase 5.
      </p>
    </main>
  );
}
