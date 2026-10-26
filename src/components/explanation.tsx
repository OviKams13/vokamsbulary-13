import type { ReactNode } from "react";

import { HighlightedText } from "@/components/highlighted-text";
import type { Explanation as ExplanationRow } from "@/db/schema";
import { capitalize } from "@/lib/text";

type ExplanationProps = {
  /** The term as written in the post, highlighted in the quote. */
  surface: string;
  /** The English row, or the French one after Translate (8.2). Null: none yet. */
  explanation: ExplanationRow | null;
};

/**
 * The top of a word's panel (6.3, 13.3): headword + French flag + French
 * equivalents, and an optional action on the right (the examples toggle).
 * Shared by the explanation and the usage examples, which swap below it.
 */
export function ExplanationHeader({
  headword,
  explanation,
  action,
}: {
  headword: string;
  explanation: ExplanationRow | null;
  action?: ReactNode;
}) {
  const title = capitalize(headword);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <h2 className="flex items-center gap-3.5 text-[1.75rem] leading-tight font-extrabold tracking-tight sm:text-4xl">
          {title}
          {explanation ? <FrenchFlag /> : null}
        </h2>
        {explanation ? (
          <p lang="fr" className="text-[0.9375rem] text-fg-soft sm:pt-1.5 sm:text-[1.0625rem]">
            <span className="sr-only">In French: </span>
            {explanation.frEquivalents.join(" / ")}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Explanation of one term (6.3, 8.2, mockups 02-D / 02-M), under its header:
 * definition, analogy card, yellow example question, and "In your text" (the
 * quote with the term highlighted, then what it means there).
 *
 * The same layout shows the English or the French version. In French, the
 * example question and the quote stay in English (E-03), and the question's
 * French translation is shown under it. Section labels stay in English, like
 * the rest of the interface.
 */
export function Explanation({ surface, explanation }: ExplanationProps) {
  if (!explanation) {
    return <p className="mt-4 text-fg-soft">No explanation for this word yet.</p>;
  }

  const french = explanation.language === "fr";
  // Prose fields are in this language; the question and the quote are always English.
  const lang = french ? "fr" : "en";

  return (
    <>
      <Section label="Definition">
        <p lang={lang} className="leading-relaxed text-fg sm:text-[1.0625rem]">
          {explanation.definition}
        </p>
      </Section>

      <div className="mt-7 rounded-2xl bg-surface-2 p-4 sm:flex sm:gap-4 sm:p-5">
        <div className="flex items-center gap-3.5 sm:items-start">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-3 text-[1.375rem] sm:size-12"
          >
            {explanation.analogyEmoji ?? "💡"}
          </span>
          <h3 lang={lang} className="font-bold sm:hidden">
            {explanation.analogyTitle}
          </h3>
        </div>
        <div>
          <h3 lang={lang} className="hidden font-bold sm:block sm:text-[1.0625rem]">
            {explanation.analogyTitle}
          </h3>
          <p lang={lang} className="mt-3 leading-[1.65] text-fg-soft sm:mt-1 sm:text-fg">
            {explanation.analogyBody}
          </p>
        </div>
      </div>

      <Section label="Example">
        <p
          lang="en"
          className="flex items-center gap-4 rounded-2xl bg-gold-soft px-4 py-4 text-[1.0625rem] leading-snug font-bold text-[#17140b] sm:px-5.5 sm:py-5 sm:text-xl"
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-[#17140b] text-lg font-extrabold text-gold-soft sm:size-10 sm:text-xl"
          >
            ?
          </span>
          <span>“{explanation.exampleQuestion}”</span>
        </p>
        {french && explanation.exampleQuestionFr ? (
          <p lang="fr" className="mt-3 flex items-start gap-2.5 px-1 leading-snug text-fg-soft">
            <FrenchFlag className="mt-1" />
            <span>{explanation.exampleQuestionFr}</span>
          </p>
        ) : null}
      </Section>

      <Section label="In your text">
        <blockquote
          lang="en"
          className="rounded-[0.875rem] bg-paper-quote px-4 py-3 text-ink italic sm:px-5 sm:py-3.5"
        >
          “<HighlightedText text={explanation.inYourTextQuote} surfaces={[surface]} />”
        </blockquote>
        <p lang={lang} className="mt-3.5 leading-relaxed text-fg">
          {explanation.inYourTextExplanation}
        </p>
      </Section>
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="mb-2.5 text-xs font-semibold tracking-[0.12em] text-muted uppercase">
        {label}
      </h3>
      {children}
    </section>
  );
}

/** 🇫🇷 drawn in SVG: Windows shows the flag emoji as the letters "FR". */
export function FrenchFlag({ className = "" }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="French"
      width="24"
      height="16"
      viewBox="0 0 3 2"
      className={`shrink-0 rounded-[3px] ${className}`}
    >
      <rect width="1" height="2" fill="#0055a4" />
      <rect x="1" width="1" height="2" fill="#ffffff" />
      <rect x="2" width="1" height="2" fill="#ef4135" />
    </svg>
  );
}
