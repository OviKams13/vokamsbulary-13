import { isNewer, type ReviewChange, type ReviewResult, reviewKey } from "@/lib/review";

import type { CopyTerm, OfflineCopy } from "./copy";

/**
 * The review changes (Phase 15) made on this device that the server doesn't
 * have yet: one IndexedDB record per colour or definition, holding its last
 * change only. A change stays here until the server answered for it, so
 * closing the app, losing the network or a failed request loses nothing.
 * Browser only.
 *
 * Its own database (not a second store in `vk13-offline`): opening that one
 * with a new version would fail in a tab still running an older deployment.
 * It is kept when the device loses the access code (it holds only ids,
 * colours and word numbers, no text), so the changes are sent once the code
 * is entered again.
 */

const DB_NAME = "vk13-review";
const STORE = "pending";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      let result: T;
      work(transaction.objectStore(STORE), (value) => {
        result = value;
      });
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

/** Every change waiting for the server. */
export function readPending(): Promise<ReviewChange[]> {
  return run<ReviewChange[]>("readonly", (store, done) => {
    const request = store.getAll();
    request.onsuccess = () => done(request.result as ReviewChange[]);
  });
}

/** Saves a change, replacing an older one of the same colour or definition. */
export function putPending(change: ReviewChange): Promise<void> {
  return run<void>("readwrite", (store, done) => {
    store.put(change, reviewKey(change));
    done();
  });
}

/** Drops a change the server answered for, unless a newer one replaced it meanwhile. */
export function removePending(key: string, changedAt: number): Promise<void> {
  return run<void>("readwrite", (store, done) => {
    const request = store.get(key);
    request.onsuccess = () => {
      const current = request.result as ReviewChange | undefined;
      if (current && current.changedAt === changedAt) store.delete(key);
      done();
    };
  });
}

/**
 * Applies changes (waiting ones, or the server's answers) to a copy, each only
 * if it is newer than what the copy holds: the same "last change wins" rule
 * as the server. Changes the copy in place; true when something changed.
 */
export function applyReviewToCopy(
  copy: OfflineCopy,
  changes: readonly (ReviewChange | ReviewResult)[],
): boolean {
  let changed = false;
  const posts = new Map(copy.posts.map((post) => [post.id, post]));
  const terms = new Map<string, CopyTerm>();
  for (const post of copy.posts) for (const term of post.terms) terms.set(term.id, term);

  for (const change of changes) {
    if (change.kind === "color") {
      const post = posts.get(change.postId);
      if (!post || !isNewer(change.changedAt, post.reviewChangedAt)) continue;
      post.reviewColor = change.color;
      post.reviewChangedAt = change.changedAt;
      changed = true;
    } else if (change.kind === "marks") {
      const term = terms.get(change.termId);
      const explanation = change.language === "en" ? term?.explanation : term?.french;
      if (!explanation || !isNewer(change.changedAt, explanation.definitionMarksChangedAt)) {
        continue;
      }
      explanation.definitionMarks = change.marks;
      explanation.definitionMarksChangedAt = change.changedAt;
      changed = true;
    }
  }
  return changed;
}
