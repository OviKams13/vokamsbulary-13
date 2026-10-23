"use client";

import { createContext, type ReactNode, use, useState } from "react";

type PostTranslation = {
  /** The post text in French (8.3), once a first Translate made it. */
  textFr: string | null;
  setTextFr: (text: string | null) => void;
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
  const [selected, setSelected] = useState(initialSelected);
  const [frenchWords, setFrenchWords] = useState<ReadonlySet<number>>(new Set());

  const value: PostTranslation = {
    textFr,
    setTextFr,
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
 * keeps its highlights.
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
      {translation.textFr}
    </div>
  );
}
