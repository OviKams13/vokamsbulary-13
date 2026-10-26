"use client";

import { useState, useTransition } from "react";

import { examplesAction, translateExamplesAction } from "./actions";

/**
 * State of one word's usage examples view (13.2, 13.3): the 5 English
 * sentences, their French translation, and which of the two is shown.
 *
 * `open()` is called when the view is opened: a word that already has its
 * examples (every post made since 13.2) does nothing; an older post's word
 * asks the server once, which writes and stores them. `toggleFrench()` is the
 * view's own Translate / Show English: the first click asks the server, which
 * translates and stores them once; later clicks only switch what is shown,
 * with no request (D-09). Neither is asked again after a reload: both are in
 * the page data.
 */
export function useExamples(
  termId: string,
  initialEnglish: string[] | null,
  initialFrench: string[] | null,
) {
  const [english, setEnglish] = useState(initialEnglish);
  const [french, setFrench] = useState(initialFrench);
  const [showFrench, setShowFrench] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();
  const [translating, startTranslating] = useTransition();

  function open() {
    if (english || generating) return;
    setError(null);
    startGenerating(async () => {
      const result = await examplesAction(termId).catch(
        () =>
          ({
            ok: false,
            error: "The examples couldn't be written. Check your connection.",
          }) as const,
      );
      if (result.ok) setEnglish(result.sentences);
      else setError(result.error);
    });
  }

  function toggleFrench() {
    setError(null);
    if (showFrench) return setShowFrench(false);
    if (french) return setShowFrench(true);
    if (!english) return;

    startTranslating(async () => {
      const result = await translateExamplesAction(termId).catch(
        () => ({ ok: false, error: "The translation failed. Check your connection." }) as const,
      );
      if (result.ok) {
        setFrench(result.sentences);
        setShowFrench(true);
      } else {
        setError(result.error);
      }
    });
  }

  return {
    english,
    french,
    showFrench,
    error,
    generating,
    translating,
    open,
    toggleFrench,
  };
}
