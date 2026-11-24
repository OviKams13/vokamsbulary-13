/**
 * The service worker from the page's side (14.1). Browser only.
 *
 * It is registered only by pages behind the access code (the `(app)` layout
 * and the offline app), so a device that never entered the code has none,
 * and only in production builds: in `next dev` a stored copy of the app would
 * hide code changes, so any worker left there is removed.
 */

const SCRIPT = "/sw.js";

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") {
    await unregisterServiceWorker();
    return;
  }
  try {
    await navigator.serviceWorker.register(SCRIPT, { scope: "/", updateViaCache: "none" });
  } catch {
    // No worker (private window, blocked storage…): the app works online as before.
  }
}

/** Asks the worker to download the offline app again (each opening online). */
export function refreshOfflineShell() {
  return askServiceWorker({ type: "refresh-shell" });
}

export async function askServiceWorker(message: { type: "refresh-shell" | "wipe" }) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const worker = registration?.active ?? registration?.waiting ?? registration?.installing;
  worker?.postMessage(message);
}

export async function unregisterServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}
