"use client";

import type { ReactNode } from "react";

import { FrenchFlag } from "@/components/explanation";
import { HighlightedText } from "@/components/highlighted-text";
import { PostTag } from "@/components/post-tag";
import { DefinitionText } from "@/components/review/definition-text";
import { ReviewCircle } from "@/components/review/review-circle";
import { ThemePill } from "@/components/theme-pill";
import { splitFrenchMarks, stripFrenchMarks } from "@/lib/french-marks";
import type { ReelWord, ReelWordData } from "@/lib/reels/data";
import {
  EXAMPLE_NUMBERS,
  INTRO_LINE,
  type ReelLanguage,
  type ReelScreen,
  meaningLine,
} from "@/lib/reels/script";
import { svgDataUrl } from "@/lib/reels/svg-check";
import { getTheme } from "@/themes";

/**
 * One step of a reel (16.2), drawn like the mockups (a.photo/reels): the
 * "VOKAMSBULARY 13" label, the screen's label, the drawing in its dark box,
 * then the text. Sizes follow the player's width (`cqw`) and height (`cqh`),
 * so the phone and the desktop 9:16 player look the same.
 *
 * In French, the definition, the analogy, the question and the examples keep
 * the English greyed above the French (mockup 3); the post card shows the
 * French text instead of the English. The drawing stays the same picture.
 *
 * The drawing is an `<img>` of a checked SVG (never inline).
 */
export function ReelStage({
  data,
  word,
  screen,
  screenIndex,
  line,
  ended,
  isLastWord,
}: {
  data: ReelWordData;
  word: ReelWord;
  screen: ReelScreen;
  screenIndex: number;
  line: number;
  ended: boolean;
  isLastWord: boolean;
}) {
  const language: ReelLanguage = screen.lines[line]?.language ?? "en";
  const french = language === "fr";
  const stepKey = `${screenIndex}-${line}`;
  const svg = screen.kind in data.svgs ? data.svgs[screen.kind as keyof typeof data.svgs] : null;

  return (
    <div className="reel-stage flex h-full flex-col px-[6.7cqw] pt-[10.5cqh] pb-[5cqh]">
      <p className="text-center font-display text-[3.4cqw] font-extrabold tracking-[0.42em] text-gold">
        VOKAMSBULARY 13
      </p>

      <Label kind={screen.kind} french={french} screenIndex={screenIndex} stepKey={stepKey} />

      {screen.kind === "post" && data.post ? (
        <PostCard data={data} word={word} french={french} stepKey={stepKey} />
      ) : screen.kind === "intro" ? (
        <Intro />
      ) : (
        <>
          {/* Same picture for both languages: keyed by the screen, not the step. */}
          <div
            key={`box-${screenIndex}`}
            className="reel-in relative mt-[2.2cqh] aspect-[4/3] max-h-[36cqh] w-full shrink-0 self-center overflow-hidden rounded-[4cqw] border border-[#2a2930] bg-[#17161b]"
          >
            {svg ? (
              // A data URL of a checked SVG: next/image adds nothing here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={svgDataUrl(svg)}
                alt=""
                draggable={false}
                className="absolute inset-0 size-full object-contain select-none"
              />
            ) : null}
          </div>
          <div key={stepKey} className="mt-[3cqh] min-h-0 flex-1 overflow-hidden">
            <Text data={data} kind={screen.kind} french={french} />
            {screen.kind === "outro" ? (
              <Outro data={data} word={word} ended={ended} isLastWord={isLastWord} />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function Label({
  kind,
  french,
  screenIndex,
  stepKey,
}: {
  kind: ReelScreen["kind"];
  french: boolean;
  screenIndex: number;
  stepKey: string;
}) {
  const label =
    kind === "post"
      ? french
        ? null
        : "IN THE POST"
      : kind === "meaning"
        ? "THE WORD"
        : kind === "definition"
          ? "DEFINITION"
          : kind === "analogy"
            ? "ANALOGY"
            : kind === "question"
              ? "EXAMPLE"
              : kind === "in-text"
                ? "IN YOUR TEXT"
                : kind === "outro"
                  ? "REMEMBER"
                  : kind === "intro"
                    ? ""
                    : "5 WAYS TO USE IT";
  const example = kind.startsWith("example-") ? Number(kind.slice(-1)) : null;

  return (
    <div className="mt-[5.5cqh] flex h-[6cqh] shrink-0 items-end justify-between">
      {kind === "post" && french ? (
        <p key={stepKey} className="reel-in flex items-center gap-[2cqw]">
          <FrenchFlag className="h-auto w-[6cqw]" />
          <span className="font-display text-[3.3cqw] font-extrabold tracking-[0.3em] text-muted">
            EN FRANÇAIS
          </span>
        </p>
      ) : (
        <p className="font-display text-[3.3cqw] font-extrabold tracking-[0.3em] text-muted">
          {label}
        </p>
      )}
      {example ? (
        <p key={`n-${screenIndex}`} className="reel-pop flex items-baseline font-display">
          <span className="text-[11cqw] leading-[0.8] font-extrabold text-gold">{example}</span>
          <span className="text-[4cqw] font-bold text-muted">/5</span>
        </p>
      ) : null}
    </div>
  );
}

/** Texts sized to fit: shorter texts in larger type. */
function sizeFor(text: string, base: "lg" | "md" = "md"): string {
  const length = text.length;
  if (base === "lg") return length > 140 ? "text-[4.6cqw]" : "text-[5.2cqw]";
  if (length > 330) return "text-[3.6cqw]";
  if (length > 230) return "text-[3.95cqw]";
  if (length > 150) return "text-[4.3cqw]";
  return "text-[4.7cqw]";
}

/** English kept above the French, greyed and smaller (mockup 3). */
function Greyed({ children }: { children: ReactNode }) {
  return <p className="text-[3.7cqw] leading-[1.45] text-muted">{children}</p>;
}

/** The French line: flag, then the text. */
function FrenchLine({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="reel-in mt-[2.4cqh] flex items-start gap-[2.6cqw]">
      <FrenchFlag className="mt-[1.1cqw] h-auto w-[6cqw]" />
      <div className={`min-w-0 flex-1 ${className}`}>{children}</div>
    </div>
  );
}

/** A sentence whose ⟦ ⟧ words are in the marker. */
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

function Text({
  data,
  kind,
  french,
}: {
  data: ReelWordData;
  kind: ReelScreen["kind"];
  french: boolean;
}) {
  const { en, fr } = data;

  if (kind === "meaning") {
    const question = (
      <>
        What does <mark className="marker">{data.headword}</mark> mean?
      </>
    );
    return (
      <>
        <p
          className={`reel-in leading-[1.35] font-bold ${french ? "text-[4.7cqw] text-muted" : "text-[6cqw] text-fg"}`}
        >
          {french ? meaningLine(data.headword) : question}
        </p>
        {french ? (
          <FrenchLine className="text-[5.2cqw] leading-[1.4] font-bold">
            Et en français ?{" "}
            {en.frEquivalents.map((word, index) => (
              <span key={word}>
                {index > 0 ? ", " : ""}
                <mark className="marker">{word}</mark>
              </span>
            ))}
          </FrenchLine>
        ) : null}
      </>
    );
  }

  if (kind === "definition") {
    return french ? (
      <>
        <Greyed>{en.definition}</Greyed>
        <FrenchLine className={`${sizeFor(fr.definition)} leading-[1.42] font-semibold`}>
          <p>
            <DefinitionText
              termId={data.termId}
              language="fr"
              definition={fr.definition}
              marks={fr.definitionMarks ?? []}
              changedAt={fr.definitionMarksChangedAt ?? null}
              editing={false}
            />
          </p>
        </FrenchLine>
      </>
    ) : (
      <p className={`reel-in ${sizeFor(en.definition)} leading-[1.42] font-semibold`}>
        <DefinitionText
          termId={data.termId}
          language="en"
          definition={en.definition}
          marks={en.definitionMarks ?? []}
          changedAt={en.definitionMarksChangedAt ?? null}
          editing={false}
        />
      </p>
    );
  }

  if (kind === "analogy") {
    const english = (
      <div className="reel-in">
        <p className="text-[4.9cqw] leading-[1.3] font-bold text-gold-light">
          {en.analogyEmoji ? `${en.analogyEmoji} ` : ""}
          {en.analogyTitle}
        </p>
        <p className={`mt-[1.4cqh] ${sizeFor(en.analogyBody)} leading-[1.45] text-fg-soft`}>
          {en.analogyBody}
        </p>
      </div>
    );
    return french ? (
      <>
        <Greyed>
          <span className="font-semibold">{en.analogyTitle}.</span> {en.analogyBody}
        </Greyed>
        <FrenchLine>
          <p className="text-[4.5cqw] leading-[1.3] font-bold text-gold-light">{fr.analogyTitle}</p>
          <p className={`mt-[1cqh] ${sizeFor(fr.analogyBody)} leading-[1.42] text-fg-soft italic`}>
            {fr.analogyBody}
          </p>
        </FrenchLine>
      </>
    ) : (
      english
    );
  }

  if (kind === "question") {
    return french ? (
      <>
        <Greyed>“{en.exampleQuestion}”</Greyed>
        <FrenchLine className={`${sizeFor(fr.exampleQuestionFr ?? "", "lg")} leading-[1.4] italic`}>
          <p>{fr.exampleQuestionFr}</p>
        </FrenchLine>
      </>
    ) : (
      <p
        className={`reel-in ${sizeFor(en.exampleQuestion, "lg")} leading-[1.4] font-semibold text-gold-soft`}
      >
        “{en.exampleQuestion}”
      </p>
    );
  }

  if (kind === "in-text") {
    const quote = (
      <p className="text-[4.3cqw] leading-[1.45] italic">
        “<HighlightedText text={en.inYourTextQuote} surfaces={[data.surface]} />”
      </p>
    );
    return (
      <div className="reel-in">
        {quote}
        {french ? (
          <FrenchLine className={`${sizeFor(fr.inYourTextExplanation)} leading-[1.45]`}>
            <p>{fr.inYourTextExplanation}</p>
          </FrenchLine>
        ) : (
          <p
            className={`mt-[2cqh] ${sizeFor(en.inYourTextExplanation)} leading-[1.45] text-fg-soft`}
          >
            {en.inYourTextExplanation}
          </p>
        )}
      </div>
    );
  }

  if (kind.startsWith("example-")) {
    const index = Number(kind.slice(-1)) - 1;
    const sentence = data.examples[index] ?? "";
    const sentenceFr = data.examplesFr[index] ?? "";
    return french ? (
      <>
        <Greyed>{stripFrenchMarks(sentence)}</Greyed>
        <FrenchLine className="text-[5.4cqw] leading-[1.4] font-medium italic">
          <p>
            <Marked text={sentenceFr} />
          </p>
        </FrenchLine>
      </>
    ) : (
      <p className="reel-in text-[5.6cqw] leading-[1.38] font-semibold">
        <span className="sr-only">{EXAMPLE_NUMBERS[index]}. </span>
        <Marked text={sentence} />
      </p>
    );
  }

  if (kind === "outro") {
    return (
      <div className="reel-in text-center">
        <p className="font-display text-[11cqw] leading-none font-extrabold text-gold">
          {data.headword}
        </p>
        <p className="mt-[1.6cqh] text-[4.7cqw] leading-[1.4] text-fg-soft">{data.gist}</p>
      </div>
    );
  }
  return null;
}

function PostCard({
  data,
  word,
  french,
  stepKey,
}: {
  data: ReelWordData;
  word: ReelWord;
  french: boolean;
  stepKey: string;
}) {
  const post = data.post!;
  const theme = getTheme(post.themeKey);
  return (
    <div
      className="reel-in mt-[2.2cqh] shrink-0 rounded-[4.4cqw] p-[3.7cqw]"
      style={{
        backgroundColor: theme.background,
        boxShadow: theme.border ? `inset 0 0 0 1px ${theme.border}` : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <PostTag totwNumber={word.totwNumber} position={word.position} />
        <ThemePill themeKey={theme.key} />
      </div>
      <p
        key={stepKey}
        className={`reel-in mt-[3cqw] rounded-[3.7cqw] px-[4.3cqw] py-[3.7cqw] ${sizeFor(
          french ? post.textFr : post.text,
        )} leading-[1.6] text-ink`}
        style={{ backgroundColor: theme.paper }}
      >
        {french ? (
          <Marked text={post.textFr} />
        ) : (
          <HighlightedText text={post.text} surfaces={post.surfaces} />
        )}
      </p>
    </div>
  );
}

function Intro() {
  return (
    <div className="reel-in flex flex-1 flex-col items-center justify-center text-center">
      <p className="font-display text-[34cqw] leading-none font-extrabold text-gold">5</p>
      <p className="mt-[3cqh] text-[6.4cqw] leading-[1.3] font-bold">{INTRO_LINE}</p>
    </div>
  );
}

/** End of the reel: the post's review circle (15.2) and where to go next. */
function Outro({
  data,
  word,
  ended,
  isLastWord,
}: {
  data: ReelWordData;
  word: ReelWord;
  ended: boolean;
  isLastWord: boolean;
}) {
  return (
    <div
      className={`reel-in-late mt-[3.2cqh] flex flex-col items-center gap-[1.6cqh] ${ended ? "reel-ended" : ""}`}
    >
      <div
        data-reel-control=""
        className="flex items-center gap-2 rounded-full border border-line-strong bg-surface-2/90 py-1 pr-4 pl-1"
      >
        <ReviewCircle
          postId={word.postId}
          color={data.reviewColor}
          changedAt={data.reviewChangedAt}
          label={`TOTW ${word.totwNumber} · #${word.position}`}
        />
        <span className="text-sm font-semibold text-fg-soft">
          How well do you know TOTW {word.totwNumber} · #{word.position}?
        </span>
      </div>
      <p className="text-[3.6cqw] font-semibold text-muted">
        {isLastWord ? "That was the last word." : "Swipe up for the next word"}
      </p>
    </div>
  );
}
