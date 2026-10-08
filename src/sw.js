// Service worker: makes Compress work offline. vite.config.ts fills in VERSION and
// PRECACHE at build time. Files never pass through here: only the app's own code.
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const SHELL = `shell-${VERSION}`;
// Ghostscript is large, so it is cached the first time a PDF needs it.
const RUNTIME = "runtime-gs";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;

  if (request.mode === "navigate") {
    // Fresh pages when online, the cached copy when not.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (response.ok && !response.redirected) caches.open(SHELL).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? caches.match("/"))),
    );
    return;
  }

  // Built files have hashed names and Ghostscript is versioned, so cached copies never go stale.
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok && url.pathname.startsWith("/gs/")) {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
