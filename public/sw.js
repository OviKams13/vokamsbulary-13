/*
 * Vokamsbulary 13 — service worker (Phase 14, offline reading).
 *
 * Hand-written on purpose (no build step, no dependency): it only does three
 * things.
 *
 * 1. Keeps a copy of the offline app: the `/offline` page (a static page that
 *    renders the feed, TOTWs, posts and search from the copy saved on the
 *    device, see src/app/offline) and every file it needs: JS, CSS, fonts,
 *    icons, the logo. That copy is fetched with the access cookie, so a
 *    visitor without the code gets nothing (the proxy answers with a redirect,
 *    which is never stored). The page asks for a refresh each time the app
 *    opens online: the copy follows every deployment.
 * 2. Navigations go to the network first. When the network fails (airplane
 *    mode, no signal, or no answer within NAVIGATION_TIMEOUT_MS), the offline
 *    app is served instead, at the same address; it reads the address and
 *    shows that page.
 * 3. Files of the offline app (`/_next/static/…`, fonts, icons) are served
 *    from the copy when it has them, from the network otherwise.
 *
 * Nothing else is intercepted: API calls, Server Actions and RSC requests go
 * to the network as before (and fail offline, which the app handles).
 */

const SHELL_URL = "/offline";
/** Cache names start with this; each refresh writes a new one, then drops the old. */
const CACHE_PREFIX = "vk13-shell-";
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
  // A first copy right away. No access (or no network) leaves no copy: the
  // worker still installs, and the next app opening tries again.
  event.waitUntil(refreshShell().catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "refresh-shell") {
    event.waitUntil(refreshShell().catch(() => undefined));
  } else if (type === "wipe") {
    event.waitUntil(deleteCopies());
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
    event.respondWith(fromCopyOrNetwork(request));
  }
});

/** Network first; the offline app when the network fails or is too slow. */
async function navigate(request) {
  if (self.navigator.onLine === false) {
    const shell = await shellResponse();
    if (shell) return shell;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } catch (error) {
    const shell = await shellResponse();
    if (shell) return shell;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function shellResponse() {
  return (await matchInCopies(SHELL_URL)) || null;
}

async function fromCopyOrNetwork(request) {
  const cached = await matchInCopies(request);
  return cached || fetch(request);
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

/** Newest copy first, so a refresh in progress never hides the complete one. */
async function matchInCopies(request) {
  const names = (await copyNames()).sort().reverse();
  for (const name of names) {
    const cache = await caches.open(name);
    // `ignoreVary`: the page varies on RSC headers that navigations don't send.
    const found = await cache.match(request, { ignoreVary: true });
    if (found) return found;
  }
  return undefined;
}

async function deleteCopies() {
  await Promise.all((await copyNames()).map((name) => caches.delete(name)));
}

let refreshing = null;

/** One refresh at a time; a second request joins the running one. */
function refreshShell() {
  if (!refreshing) {
    refreshing = buildCopy().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/**
 * Downloads the offline app into a new cache, then removes the older copies.
 * If anything is missing (no access, network error), the new cache is
 * dropped and the old copy stays as it was.
 */
async function buildCopy() {
  // `manual`: without the access cookie the proxy redirects to /access; that
  // answer must never be stored as the offline app.
  const page = await fetch(SHELL_URL, {
    cache: "no-store",
    credentials: "same-origin",
    redirect: "manual",
  });
  if (page.type === "opaqueredirect" || !page.ok) return false;

  const html = await page.clone().text();
  const name = `${CACHE_PREFIX}${Date.now()}`;
  const cache = await caches.open(name);

  try {
    await cache.put(SHELL_URL, page);
    const files = new Set([...STATIC_FILES, ...fileUrls(html)]);
    const stylesheets = [];

    await Promise.all(
      [...files].map(async (file) => {
        const response = await reuseOrFetch(file);
        if (file.endsWith(".css")) stylesheets.push(await response.clone().text());
        await cache.put(file, response);
      }),
    );

    // Fonts are linked from the stylesheets (next/font), not from the page.
    const fonts = new Set(stylesheets.flatMap(fileUrls).filter((file) => !files.has(file)));
    await Promise.all(
      [...fonts].map(async (file) => cache.put(file, await reuseOrFetch(file))),
    );
  } catch (error) {
    await caches.delete(name);
    throw error;
  }

  for (const old of await copyNames()) {
    if (old !== name) await caches.delete(old);
  }
  return true;
}

/** `/_next/static/` files never change (their name holds a hash): reuse the stored one. */
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
 * fonts, optimized images, icons. The page's inline router data lists the
 * script chunks too, sometimes without the `/_next/` prefix.
 */
function fileUrls(text) {
  const found = new Set();
  const patterns = [
    /(?:\/_next\/)?static\/(?:chunks|css|media)\/[^"'\s\\)?#]+/g,
    /\/_next\/image\?[^"'\s\\]+/g,
    /\/(?:favicon\.ico|apple-icon\.png)(?:\?[^"'\s\\]*)?/g,
    /\/icons\/[^"'\s\\)?#]+/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      let file = match[0].replace(/&amp;/g, "&");
      if (file.startsWith("static/")) file = `/_next/${file}`;
      found.add(file);
    }
  }
  return [...found];
}
