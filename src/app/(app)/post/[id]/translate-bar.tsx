import { TranslateIcon } from "@/components/icons";

/**
 * The Translate / Translating… / Show English pill under a word's explanation
 * or usage examples (8.2, 13.3, mockups 02-D / 02-M / 07): outline pill, then
 * a spinner on the first click only, then the gold "Show English".
 */
export function TranslateBar({
  showFrench,
  translating,
  error,
  onToggle,
  compact = false,
}: {
  showFrench: boolean;
  translating: boolean;
  error: string | null;
  onToggle: () => void;
  /** Tighter spacing above the divider, as in the examples mockup (07). */
  compact?: boolean;
}) {
  return (
    <div
      className={`border-t border-line pt-6 ${compact ? "mt-5 sm:pt-[1.4375rem]" : "mt-8 sm:pt-7"}`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={translating}
        aria-pressed={showFrench}
        className={`flex h-12 w-full items-center justify-center gap-2.5 rounded-full border px-6 font-bold transition disabled:opacity-75 sm:h-11 sm:w-auto ${
          showFrench
            ? "border-gold/45 bg-gold/12 text-gold hover:bg-gold/18"
            : "border-line-strong text-fg hover:bg-surface-3"
        }`}
      >
        {translating ? (
          <span aria-hidden="true" className="spinner block size-4.5" />
        ) : (
          <TranslateIcon size={18} />
        )}
        {translating ? "Translating…" : showFrench ? "Show English" : "Translate"}
      </button>
      <p role="alert" className="mt-3 text-sm font-medium text-red-400 empty:hidden">
        {error}
      </p>
    </div>
  );
}
