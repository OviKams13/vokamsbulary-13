"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { useNetworkAction } from "@/components/offline/connection";

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
 *
 * Offline (14.3), what needs the server is not asked: `openBlocked` and
 * `translateBlocked` hold the message to show instead. Examples asked for
 * while offline are written as soon as the connection is back.
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
  const writeNetwork = useNetworkAction("Writing the examples");
  const translateNetwork = useNetworkAction("Translate");
  // The view was opened while the examples couldn't be written.
  const waiting = useRef(false);

  function write() {
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

  function open() {
    if (english || generating) return;
    setError(null);
    waiting.current = !writeNetwork.available;
    if (writeNetwork.available) write();
  }

  // Back online: write the examples the view is waiting for.
  const canWrite = writeNetwork.available;
  useEffect(() => {
    if (!waiting.current || !canWrite) return;
    waiting.current = false;
    write();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the connection comes back
  }, [canWrite]);

  function toggleFrench() {
    setError(null);
    if (showFrench) return setShowFrench(false);
    if (french) return setShowFrench(true);
    if (!english || !translateNetwork.available) return;

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
    openBlocked: english ? null : writeNetwork.reason,
    translateBlocked: english && !french ? translateNetwork.reason : null,
    generating,
    translating,
    open,
    toggleFrench,
  };
}
