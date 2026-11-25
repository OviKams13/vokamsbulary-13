"use client";

import { Fragment, type KeyboardEvent, type ReactNode, useMemo } from "react";

import { PencilIcon } from "@/components/icons";
import {
  canMarkSpace,
  type DefinitionUnit,
  normalizeMarks,
  type ReviewLanguage,
  splitDefinition,
  toggleMark,
} from "@/lib/review";

import { useDefinitionMarks } from "./use-review";

type DefinitionTextProps = {
  termId: string;
  language: ReviewLanguage;
  definition: string;
  /** The highlights the page has (server or offline copy) and when they were set. */
  marks: number[];
  changedAt: number | null;
  /** Highlight mode: every word, and every space between two highlighted words, is tappable. */
  editing: boolean;
};

/**
 * A definition with the user's own highlights (15.1), in the yellow marker of
 * the post text. Outside highlight mode it is plain text with its marks.
 *
 * In highlight mode a tap on a word switches it; a tap on the space between
 * two highlighted words joins them into one mark (and a second tap splits
 * them again). Words are never joined by themselves: "something" and "else"
 * stay two marks until their space is tapped. Un-highlighting a word also
 * removes the spaces beside it. Each change is saved at once (offline too).
 */
export function DefinitionText({
  termId,
  language,
  definition,
  marks: pageMarks,
  changedAt,
  editing,
}: DefinitionTextProps) {
  const parts = useMemo(() => splitDefinition(definition), [definition]);
  const [current, setMarks] = useDefinitionMarks(termId, language, {
    marks: pageMarks,
    changedAt,
  });
  const marked = useMemo(
    () => new Set(normalizeMarks(current.marks, parts.wordCount)),
    [current.marks, parts.wordCount],
  );

  function toggle(unit: number) {
    const next = toggleMark([...marked], unit, parts.wordCount);
    if (next.length !== marked.size || next.some((value) => !marked.has(value))) setMarks(next);
  }

  function renderUnit(unit: DefinitionUnit): ReactNode {
    if (!editing) return unit.text;
    const on = marked.has(unit.unit);

    if (unit.kind === "word") {
      return (
        <span
          role="button"
          tabIndex={0}
          aria-pressed={on}
          data-unit={unit.unit}
          onClick={() => toggle(unit.unit)}
          onKeyDown={(event) => onKey(event, unit.unit)}
          className={`cursor-pointer rounded-[0.25rem] outline-offset-1 ${
            on
              ? ""
              : "underline decoration-muted/60 decoration-dotted underline-offset-4 hover:bg-surface-3"
          }`}
        >
          {unit.text}
        </span>
      );
    }

    const tappable = on || canMarkSpace(marked, unit.unit);
    const words = parts.units;
    const before = words[words.indexOf(unit) - 1]?.text ?? "";
    const after = words[words.indexOf(unit) + 1]?.text ?? "";
    return (
      <span
        role="button"
        tabIndex={tappable ? 0 : -1}
        aria-pressed={on}
        aria-disabled={!tappable}
        aria-label={`Space between “${before}” and “${after}”`}
        data-unit={unit.unit}
        data-tappable={tappable ? "" : undefined}
        onClick={() => {
          if (tappable) toggle(unit.unit);
        }}
        onKeyDown={(event) => {
          if (tappable) onKey(event, unit.unit);
        }}
        className={`definition-space ${tappable ? "cursor-pointer" : ""} ${
          tappable && !on ? "bg-marker/35" : ""
        }`}
      >
        {unit.text}
      </span>
    );
  }

  function onKey(event: KeyboardEvent, unit: number) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle(unit);
  }

  // Consecutive highlighted units form one mark: a word, or words joined by their spaces.
  const runs: ReactNode[] = [];
  let run: DefinitionUnit[] = [];
  const flush = () => {
    if (run.length === 0) return;
    runs.push(
      <mark key={`m${run[0]!.unit}`} className="definition-mark marker">
        {run.map((unit) => (
          <Fragment key={unit.unit}>{renderUnit(unit)}</Fragment>
        ))}
      </mark>,
    );
    run = [];
  };
  for (const unit of parts.units) {
    if (marked.has(unit.unit)) {
      run.push(unit);
      continue;
    }
    flush();
    runs.push(<Fragment key={unit.unit}>{renderUnit(unit)}</Fragment>);
  }
  flush();

  return (
    <p
      lang={language}
      data-definition-marks={[...marked].join(",")}
      className="leading-relaxed text-fg sm:text-[1.0625rem]"
    >
      {parts.before}
      {runs}
      {parts.after}
    </p>
  );
}

/**
 * The pencil next to "Definition" (15.1): switches highlight mode on and off.
 * Gold while on, like the examples toggle.
 */
export function HighlightToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const label = active ? "Done highlighting" : "Highlight words in the definition";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`-my-2 grid size-9 place-items-center rounded-lg transition ${
        active
          ? "bg-gold-soft text-[#17140b] hover:bg-gold"
          : "text-muted hover:bg-surface-3 hover:text-fg"
      }`}
    >
      <PencilIcon size={16} />
    </button>
  );
}
