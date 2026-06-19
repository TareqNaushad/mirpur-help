// Mirpur Help — service worker for offline / low-data use.
//
// Goal: after the first visit, the heavy files load from the phone instead of
// the network, so the app works on almost no data (and offline for the parts
// that don't need live AI).
//
// Strategy:
//   • Immutable build assets (/_next/static, icons, manifest) -> cache-first
//     (never re-downloaded → biggest data saving).
//   • Pages & data -> network-first, fall back to cache when offline.
//   • Cross-origin and non-GET (AI calls, form posts) -> always network.

const CACHE = "mirpur-help-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave cross-origin alone

  const immutable =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.json";

  if (immutable) {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Network-first for pages/data; fall back to cache offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match("/") : undefined))
      )
  );
});
