import {
  isNewer,
  type ReviewChange,
  type ReviewColor,
  type ReviewLanguage,
  type ReviewResult,
  reviewKey,
  type StampedColor,
  type StampedMarks,
} from "@/lib/review";

import { putPending, readPending, removePending } from "./review-queue";
import { applyReviewToSavedCopy } from "./store";

/**
 * Review colours (15.2) and definition highlights (15.1) on the device side,
 * for the live pages and the offline app alike. Browser only.
 *
 * A change is shown at once, saved in the device's queue, applied to the
 * offline copy, then sent to `POST /api/review` when there is a connection:
 * right away, or when the connection comes back, the app opens again or
 * comes back to the screen (`flushReviewChanges()`, called by the
 * connection provider). The server keeps the newest change (last change
 * wins) and answers with what it holds; the device then shows that.
 *
 * The pages get their values from the server or from the copy; this module
 * holds the newer values this device knows of (its own changes, the server's
 * answers) and the hooks show whichever is newest.
 */

const ENDPOINT = "/api/review";

const colors = new Map<string, StampedColor>();
const marks = new Map<string, StampedMarks>();
const listeners = new Set<() => void>();
let version = 0;
let queueRead: Promise<void> | null = null;

function notify() {
  version += 1;
  for (const listener of listeners) listener();
}

export function subscribeReview(listener: () => void) {
  listeners.add(listener);
  // The first page that shows a colour or a definition reads the queue: changes
  // made offline in an earlier visit show at once, before they are sent.
  queueRead ??= readPending()
    .then((pending) => {
      if (pending.some(remember)) notify();
    })
    .catch(() => undefined);
  return () => void listeners.delete(listener);
}

/** Changes on every update, for `useSyncExternalStore`. */
export function getReviewVersion(): number {
  return version;
}

export function marksKey(termId: string, language: ReviewLanguage): string {
  return reviewKey({ kind: "marks", termId, language });
}

/** The newest colour of a post: the page's, or a newer one known on this device. */
export function newestColor(postId: string, page: StampedColor): StampedColor {
  const known = colors.get(postId);
  return known && isNewer(known.changedAt, page.changedAt) ? known : page;
}

/** The newest highlights of a definition: the page's, or newer ones known on this device. */
export function newestMarks(key: string, page: StampedMarks): StampedMarks {
  const known = marks.get(key);
  return known && isNewer(known.changedAt, page.changedAt) ? known : page;
}

/** Keeps a value if it is newer than the one held; true when it was. */
function remember(change: ReviewChange | ReviewResult): boolean {
  if (change.kind === "color") {
    if (!isNewer(change.changedAt, colors.get(change.postId)?.changedAt)) return false;
    colors.set(change.postId, { color: change.color, changedAt: change.changedAt });
    return true;
  }
  if (change.kind === "marks") {
    const key = marksKey(change.termId, change.language);
    if (!isNewer(change.changedAt, marks.get(key)?.changedAt)) return false;
    marks.set(key, { marks: change.marks, changedAt: change.changedAt });
    return true;
  }
  return false;
}

/**
 * A time for a new change: now, but always after the value it replaces
 * (two taps in the same millisecond, or a value from a clock running ahead).
 */
function nextTime(previous: number | null): number {
  return Math.max(Date.now(), (previous ?? 0) + 1);
}

export function changeReviewColor(
  postId: string,
  current: StampedColor,
  color: ReviewColor | null,
) {
  return record({ kind: "color", postId, color, changedAt: nextTime(current.changedAt) });
}

export function changeDefinitionMarks(
  termId: string,
  language: ReviewLanguage,
  current: StampedMarks,
  next: number[],
) {
  return record({
    kind: "marks",
    termId,
    language,
    marks: next,
    changedAt: nextTime(current.changedAt),
  });
}

async function record(change: ReviewChange) {
  remember(change);
  notify();
  try {
    await putPending(change);
  } catch {
    // No IndexedDB (private window…): the change is still sent if online.
    await send([change]);
    return;
  }
  await applyReviewToSavedCopy([change]);
  void flushReviewChanges();
}

let flushing: Promise<void> | null = null;
let again = false;

/**
 * Sends the queue to the server, if there is a connection. One at a time; a
 * call during a send runs once more after it. Never throws.
 */
export function flushReviewChanges(): Promise<void> {
  if (flushing) {
    again = true;
    return flushing;
  }
  flushing = (async () => {
    do {
      again = false;
      const pending = await readPending().catch(() => []);
      if (pending.length > 0) await send(pending);
    } while (again);
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function send(changes: ReviewChange[]) {
  if (!navigator.onLine) return;

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return; // No network after all: the queue stays for the next try.
  }

  // 400: the server will never take these (no such change can be made in the
  // app); dropping them keeps the queue from being stuck. Any other error
  // (401, 5xx…): kept for the next try.
  if (response.status === 400) {
    await Promise.all(changes.map((c) => removePending(reviewKey(c), c.changedAt))).catch(
      () => undefined,
    );
    return;
  }
  if (!response.ok) return;

  let results: ReviewResult[];
  try {
    ({ results } = (await response.json()) as { results: ReviewResult[] });
  } catch {
    return;
  }

  // What the server holds now replaces what this device knew, unless a newer
  // change was made here while the request ran (it is still in the queue).
  let changed = false;
  results.forEach((result, index) => {
    const sent = changes[index];
    if (!sent || result.kind === "missing") return;
    if (result.kind === "color") {
      const known = colors.get(result.postId);
      if (known && isNewer(known.changedAt, sent.changedAt)) return;
      colors.set(result.postId, { color: result.color, changedAt: result.changedAt });
    } else {
      const key = marksKey(result.termId, result.language);
      const known = marks.get(key);
      if (known && isNewer(known.changedAt, sent.changedAt)) return;
      marks.set(key, { marks: result.marks, changedAt: result.changedAt });
    }
    changed = true;
  });
  if (changed) notify();

  await Promise.all(changes.map((c) => removePending(reviewKey(c), c.changedAt))).catch(
    () => undefined,
  );
  await applyReviewToSavedCopy(results);
}
