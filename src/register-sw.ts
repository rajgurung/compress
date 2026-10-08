/** Registers the offline service worker in production builds. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // Offline support is a bonus; the app works without it.
  });
}
