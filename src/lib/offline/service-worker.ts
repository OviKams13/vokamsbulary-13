/**
 * The service worker from the page's side (14.1). Browser only.
 *
 * It is registered only by pages behind the access code (the `(app)` layout
 * and the offline app), so a device that never entered the code has none,
 * and only in production builds: in `next dev` a stored copy of the app would
 * hide code changes, so any worker left there is removed.
 *
 * The script address carries the deployment's version (`?v=`, set at build
 * time in next.config.ts). After a deployment, the first opening of the app
 * registers the new address: the browser installs a new worker, which stores
 * that deployment's offline app before it takes over (see public/sw.js).
 */

const SCRIPT = `/sw.js?v=${encodeURIComponent(process.env.NEXT_PUBLIC_SW_VERSION ?? "dev")}`;

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

export async function askServiceWorker(message: { type: "wipe" }) {
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
