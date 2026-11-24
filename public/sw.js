/*
 * Vokamsbulary 13 — service worker (Phase 14, offline reading).
 *
 * Hand-written on purpose (no build step, no dependency). It does three
 * things.
 *
 * 1. At install, it stores the offline app: the `/offline` page (a static
 *    page that renders the feed, TOTWs, posts and search from the copy saved
 *    on the device, see src/app/offline) and every file it needs: JS, CSS,
 *    fonts, icons, the logo. Each deployment registers this script with its
 *    own `?v=` (src/lib/offline/service-worker.ts), so each deployment
 *    installs a new worker with a new, complete copy. If any file can't be
 *    stored, the install fails and the previous worker (with its own complete
 *    copy) stays in charge; the next app opening tries again. The copy is
 *    downloaded with the access cookie: without it, the proxy answers with a
 *    redirect, which fails the install, so nothing is stored.
 * 2. Navigations go to the network first. When the network fails (airplane
 *    mode, no signal, or no answer within NAVIGATION_TIMEOUT_MS), the offline
 *    app is served instead, at the same address; it reads the address and
 *    shows that page.
 * 3. Build files (`/_next/static/…`) and icons are served from the copy when
 *    it has them, from the network otherwise.
 *
 * Next's page data requests (RSC: prefetches, client navigations) go to the
 * network as before; a network failure gets an empty answer (see
 * `pageData()`). Nothing else is intercepted: API calls and Server Actions go
 * to the network as before (and fail offline, which the app handles).
 */

const SHELL_URL = "/offline";
/** Cache names start with this, followed by the deployment's version. */
const CACHE_PREFIX = "vk13-shell-";
const VERSION = new URL(self.location.href).searchParams.get("v") || "unversioned";
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const NAVIGATION_TIMEOUT_MS = 7000;

/** Always part of the copy, whatever the page links to. */
const STATIC_FILES = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  // The worker activates only once the whole copy is stored. A failure here
  // rejects the install: the previous worker and its copy stay as they are.
  event.waitUntil(buildCopy().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  // This copy is complete (the install succeeded): older ones can go.
  event.waitUntil(deleteCopies((name) => name !== CACHE_NAME).then(() => self.clients.claim()));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "wipe") {
    event.waitUntil(deleteCopies(() => true));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
    return;
  }

  if (isShellFile(url)) {
    event.respondWith(fromCopyOrNetwork(request, url));
    return;
  }

  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(pageData(request));
  }
});

/**
 * Next's page data (link prefetches, client navigations): network as
 * before. When the network fails, an empty answer instead of a network
 * error: Next drops a prefetch without data, and turns a navigation without
 * data into a normal page load, which `navigate()` serves from the copy.
 * Offline, the offline app's links would otherwise fill the console with
 * failed prefetches.
 */
async function pageData(request) {
  if (self.navigator.onLine === false) return noData();
  try {
    return await fetch(request);
  } catch {
    return noData();
  }
}

function noData() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

/** Network first; the offline app when the network fails or is too slow. */
async function navigate(request) {
  if (self.navigator.onLine === false) {
    const shell = await matchInCopies(SHELL_URL);
    if (shell) return shell;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } catch {
    return (await matchInCopies(SHELL_URL)) || unavailable();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The stored file, or the network. Never rejects: a file that is neither
 * stored nor reachable gets a plain 503 (an uncaught rejection here would
 * end as a "Failed to fetch" error in the console).
 */
async function fromCopyOrNetwork(request, url) {
  try {
    const cached = await matchInCopies(request);
    if (cached) return cached;
    const response = await fetch(request);
    // A build file this copy doesn't list yet (loaded later by the app):
    // keep it too, so it is there the next time the app is offline.
    if (response.ok && url.pathname.startsWith("/_next/static/")) {
      const copy = response.clone();
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.put(request, copy))
        .catch(() => undefined);
    }
    return response;
  } catch {
    return unavailable();
  }
}

function unavailable() {
  return new Response("Offline", {
    status: 503,
    statusText: "Offline",
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function isShellFile(url) {
  const path = url.pathname;
  return (
    path.startsWith("/_next/static/") ||
    path === "/_next/image" ||
    path.startsWith("/icons/") ||
    path === "/favicon.ico" ||
    path === "/apple-icon.png" ||
    path === "/manifest.webmanifest"
  );
}

async function copyNames() {
  return (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX));
}

/** This version's copy first, then any older one still there. */
async function matchInCopies(request) {
  const names = (await copyNames()).sort((a, b) =>
    a === CACHE_NAME ? -1 : b === CACHE_NAME ? 1 : 0,
  );
  const path = new URL(typeof request === "string" ? request : request.url, self.location.href)
    .pathname;
  for (const name of names) {
    const cache = await caches.open(name);
    // `ignoreVary`: the page varies on RSC headers that navigations don't send.
    const found = await cache.match(request, { ignoreVary: true });
    if (found) return found;
    // Build files have a hash in their name: a different query (a deployment
    // token) is still the same file.
    if (path.startsWith("/_next/static/")) {
      const same = await cache.match(request, { ignoreVary: true, ignoreSearch: true });
      if (same) return same;
    }
  }
  return undefined;
}

async function deleteCopies(shouldDelete) {
  const names = (await copyNames()).filter(shouldDelete);
  await Promise.all(names.map((name) => caches.delete(name)));
}

/**
 * Downloads the offline app into this version's cache. Throws if anything is
 * missing (no access, network error, a file that doesn't answer 200): the
 * install then fails and the half-filled cache is removed.
 */
async function buildCopy() {
  // `manual`: without the access cookie the proxy redirects to /access; that
  // answer must never be stored as the offline app.
  const page = await fetch(SHELL_URL, {
    cache: "no-store",
    credentials: "same-origin",
    redirect: "manual",
  });
  if (page.type === "opaqueredirect" || !page.ok) {
    throw new Error(`${SHELL_URL}: no access or HTTP ${page.status}`);
  }

  const html = await page.clone().text();
  // The same version installed again (a retry) rewrites the same files.
  const existed = await caches.has(CACHE_NAME);
  const cache = await caches.open(CACHE_NAME);

  try {
    const files = new Set([...STATIC_FILES, ...fileUrls(html)]);
    const stylesheets = [];

    await Promise.all(
      [...files].map(async (file) => {
        const response = await reuseOrFetch(file);
        if (new URL(file, self.location.href).pathname.endsWith(".css")) {
          stylesheets.push(await response.clone().text());
        }
        await cache.put(file, response);
      }),
    );

    // Fonts are linked from the stylesheets (next/font), not from the page.
    const fonts = new Set(stylesheets.flatMap(fileUrls).filter((file) => !files.has(file)));
    await Promise.all([...fonts].map(async (file) => cache.put(file, await reuseOrFetch(file))));

    // The page last: a cache that holds it is a complete copy.
    await cache.put(SHELL_URL, page);
  } catch (error) {
    // A half-filled new cache goes; a complete one from an earlier install stays.
    if (!existed) await caches.delete(CACHE_NAME);
    throw error;
  }
}

/** `/_next/static/` files never change (their name holds a hash): reuse a stored one. */
async function reuseOrFetch(file) {
  if (file.startsWith("/_next/static/")) {
    const stored = await matchInCopies(file);
    if (stored) return stored;
  }
  const response = await fetch(file, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return response;
}

/**
 * Same-site files referenced by the page or a stylesheet: scripts, styles,
 * fonts, images, icons. Build files can sit in any folder under
 * `/_next/static/` (on Vercel: `/_next/static/immutable/chunks/…`), may carry
 * a query (a deployment token), and the page's inline router data lists
 * script chunks without the `/_next/` prefix.
 */
function fileUrls(text) {
  const found = new Set();
  const patterns = [
    // No lookbehind (older iPhones can't parse it): group 1 is the character
    // before a bare `static/`, dropped below.
    /(?:\/_next\/|(^|[^\w/-]))static\/[^"'\s\\)?#]+\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|webp|avif|svg|ico)(?:\?[^"'\s\\)#]*)?/g,
    /\/_next\/image\?[^"'\s\\]+/g,
    /\/(?:favicon\.ico|apple-icon\.png)(?:\?[^"'\s\\]*)?/g,
    /\/icons\/[^"'\s\\)?#]+/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      let file = match[0].slice(match[1] ? match[1].length : 0).replace(/&amp;/g, "&");
      if (file.startsWith("static/")) file = `/_next/${file}`;
      found.add(file);
    }
  }
  return [...found];
}
