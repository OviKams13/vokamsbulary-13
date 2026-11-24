import { COPY_FORMAT, type OfflineCopy } from "./copy";
import { askServiceWorker, unregisterServiceWorker } from "./service-worker";

/**
 * The offline copy on the device (14.2): one IndexedDB record, plus the same
 * copy in memory for the page that runs. Browser only.
 *
 * `syncOfflineCopy()` downloads it again (`GET /api/offline`, with the ETag
 * of the copy held, so an unchanged copy costs a 304), saves it and tells the
 * pages that read it. A 401 means this device no longer has the access code
 * (code or secret changed): the copy, the stored app files and the service
 * worker are all deleted.
 */

const DB_NAME = "vk13-offline";
const STORE = "copy";
const KEY = "current";
const ENDPOINT = "/api/offline";

type Record = { etag: string | null; savedAt: string; copy: OfflineCopy };

export type CopyState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; copy: OfflineCopy; savedAt: string };

let state: CopyState = { status: "loading" };
let loading: Promise<void> | null = null;
let syncing: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function setState(next: CopyState) {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribeCopy(listener: () => void) {
  listeners.add(listener);
  void loadCopy();
  return () => void listeners.delete(listener);
}

export function getCopyState(): CopyState {
  return state;
}

/** The copy, once read from the device (null while loading or without one). */
export async function readCopy(): Promise<OfflineCopy | null> {
  await loadCopy();
  return state.status === "ready" ? state.copy : null;
}

function loadCopy(): Promise<void> {
  loading ??= readRecord()
    .then((record) => {
      // A download may have finished first: keep the newer copy.
      if (state.status === "ready") return;
      setState(
        record
          ? { status: "ready", copy: record.copy, savedAt: record.savedAt }
          : { status: "empty" },
      );
    })
    .catch(() => {
      if (state.status === "loading") setState({ status: "empty" });
    });
  return loading;
}

/**
 * Downloads the copy again if it changed. One at a time; never throws.
 * Resolves to true when the server answered with the access granted
 * (a new copy or "unchanged"), false otherwise (offline, error, or 401).
 */
export function syncOfflineCopy(): Promise<boolean> {
  syncing ??= runSync().finally(() => {
    syncing = null;
  });
  return syncing;
}

async function runSync(): Promise<boolean> {
  const previous = await readRecord().catch(() => null);
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      cache: "no-store",
      credentials: "same-origin",
      headers: previous?.etag ? { "If-None-Match": previous.etag } : {},
    });
  } catch {
    return false; // Offline: keep the copy held.
  }

  if (response.status === 401) {
    await wipeOfflineData();
    return false;
  }
  if (response.status === 304) return true;
  if (!response.ok) return false;

  let copy: OfflineCopy;
  try {
    copy = (await response.json()) as OfflineCopy;
  } catch {
    return false;
  }
  if (copy.format !== COPY_FORMAT || !Array.isArray(copy.posts)) return false;

  const record: Record = {
    etag: response.headers.get("ETag"),
    savedAt: new Date().toISOString(),
    copy,
  };
  await writeRecord(record).catch(() => undefined);
  setState({ status: "ready", copy, savedAt: record.savedAt });
  return true;
}

/** Everything offline on this device: the copy, the stored app files, the worker. */
export async function wipeOfflineData() {
  setState({ status: "empty" });
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
  await askServiceWorker({ type: "wipe" });
  // The page can delete the worker's caches too (same origin): no wait on the worker.
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith("vk13-")).map((n) => caches.delete(n)),
    );
  }
  await unregisterServiceWorker();
}

// ---------------------------------------------------------------------------
// IndexedDB, without a library: one store, one record.
// ---------------------------------------------------------------------------

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readRecord(): Promise<Record | null> {
  const database = await openDatabase();
  try {
    const record = await new Promise<Record | undefined>((resolve, reject) => {
      const request = database.transaction(STORE).objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result as Record | undefined);
      request.onerror = () => reject(request.error);
    });
    return record && record.copy?.format === COPY_FORMAT ? record : null;
  } finally {
    database.close();
  }
}

async function writeRecord(record: Record) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(record, KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
