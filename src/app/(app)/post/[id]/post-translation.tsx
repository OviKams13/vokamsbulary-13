"use client";

import { createContext, type ReactNode, use, useState } from "react";

import { hasFrenchMarks, splitFrenchMarks } from "@/lib/french-marks";

type PostTranslation = {
  /** The post text in French (8.3), once a first Translate made it. */
  textFr: string | null;
  /**
   * The French text came from before the marks (8.4) and Translate hasn't
   * regenerated it yet: the next Translate click asks the server, even on a
   * word that is already translated.
   */
  textNeedsRefresh: boolean;
  /** What the server answered for the French text; null keeps the one on screen. */
  receiveTextFr: (text: string | null) => void;
  /** Word tab on screen (1-based, `terms.position`). */
  selected: number;
  setSelected: (word: number) => void;
  /** Words currently shown in French. */
  isFrench: (word: number) => boolean;
  setFrench: (word: number, french: boolean) => void;
};

const PostTranslationContext = createContext<PostTranslation | null>(null);

/**
 * Translate state of one post detail page (8.2, 8.3), shared by the word tabs,
 * each word's Translate toggle and the French text in the post card: the card
 * shows the French text while the word on screen is in French.
 */
export function PostTranslationProvider({
  initialTextFr,
  initialSelected,
  children,
}: {
  initialTextFr: string | null;
  initialSelected: number;
  children: ReactNode;
}) {
  const [textFr, setTextFr] = useState(initialTextFr);
  // One try per page: a text that comes back without marks isn't asked again on every click.
  const [refreshTried, setRefreshTried] = useState(false);
  const [selected, setSelected] = useState(initialSelected);
  const [frenchWords, setFrenchWords] = useState<ReadonlySet<number>>(new Set());

  const value: PostTranslation = {
    textFr,
    textNeedsRefresh: textFr !== null && !hasFrenchMarks(textFr) && !refreshTried,
    receiveTextFr: (text) => {
      setRefreshTried(true);
      if (text) setTextFr(text);
    },
    selected,
    setSelected,
    isFrench: (word) => frenchWords.has(word),
    setFrench: (word, french) =>
      setFrenchWords((current) => {
        const next = new Set(current);
        if (french) next.add(word);
        else next.delete(word);
        return next;
      }),
  };
  return <PostTranslationContext value={value}>{children}</PostTranslationContext>;
}

/** Null outside a post detail page (the word tabs work without it). */
export function usePostTranslation(): PostTranslation | null {
  return use(PostTranslationContext);
}

/**
 * The post text in French, under the English text inside the post card (8.3,
 * D-18): shown while the word on screen is in French. The English text above
 * keeps its highlights, and the French words that translate the terms get the
 * same yellow marker (8.4, E-08).
 */
export function FrenchPostText() {
  const translation = usePostTranslation();
  if (!translation?.textFr || !translation.isFrench(translation.selected)) return null;

  return (
    <div
      lang="fr"
      className="mt-3 border-t border-ink/10 pt-3 text-[0.9375rem] leading-[1.65] whitespace-pre-line text-ink/75 sm:mt-3.5 sm:pt-3.5 sm:text-base"
    >
      <span className="sr-only">In French: </span>
      {splitFrenchMarks(translation.textFr).map((segment, index) =>
        segment.marked ? (
          <mark key={index} className="marker">
            {segment.text}
          </mark>
        ) : (
          segment.text
        ),
      )}
    </div>
  );
}
