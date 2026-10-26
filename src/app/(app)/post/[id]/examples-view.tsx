import { splitFrenchMarks } from "@/lib/french-marks";

/**
 * The usage examples of one word (13.3, mockup 07): "5 WAYS TO USE IT", then
 * 5 rows, each the number and the English sentence with the studied word in the
 * yellow marker. In French (the view's own Translate) the heading changes and
 * each translation sits under its English sentence, same size, grey italic,
 * with the French words of the studied word in the marker too (same ⟦ ⟧ marks
 * as the French post text, E-08).
 */
export function ExamplesView({
  english,
  french,
  showFrench,
  generating,
  error,
  onRetry,
}: {
  english: string[] | null;
  french: string[] | null;
  showFrench: boolean;
  /** The examples of an older post are being written (first opening only). */
  generating: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const translations = showFrench ? french : null;

  return (
    <section className="mt-6 sm:mt-5.5">
      <h3
        lang={showFrench ? "fr" : "en"}
        className="mb-2.5 text-xs font-semibold tracking-[0.12em] text-muted uppercase sm:mb-[0.6875rem]"
      >
        {showFrench ? "5 façons de l'utiliser" : "5 ways to use it"}
      </h3>

      {english ? (
        <ol>
          {english.map((sentence, index) => (
            <li
              key={index}
              className="grid grid-cols-[2.125rem_1fr] gap-x-0 border-b border-line py-4 last:border-b-0 sm:grid-cols-[3rem_1fr] sm:py-[1.21875rem]"
            >
              <span
                aria-hidden="true"
                className="font-display text-2xl leading-[1.15] font-extrabold text-gold-soft"
              >
                {index + 1}
              </span>
              <div className="text-[1.0625rem] leading-snug sm:text-[1.125rem]">
                <p lang="en" className="text-fg">
                  <Marked text={sentence} />
                </p>
                {translations?.[index] ? (
                  <p lang="fr" className="mt-2 text-muted italic">
                    <Marked text={translations[index]} />
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : error ? (
        <div className="py-5">
          <p role="alert" className="text-sm font-medium text-red-400">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 h-10 rounded-full border border-line-strong px-5 text-sm font-bold transition hover:bg-surface-3"
          >
            Try again
          </button>
        </div>
      ) : (
        <p role="status" className="flex items-center gap-3 py-6 text-fg-soft">
          <span aria-hidden="true" className="spinner block size-4.5" />
          {generating ? "Writing 5 examples…" : "Loading examples…"}
        </p>
      )}
    </section>
  );
}

function Marked({ text }: { text: string }) {
  return splitFrenchMarks(text).map((segment, index) =>
    segment.marked ? (
      <mark key={index} className="marker">
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}
