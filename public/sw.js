const CACHE = "dmdpnhs-portal-v5";
const OFFLINE_URLS = [
  "/",
  "/login",
  "/manifest.json",
  "/images/logo-pastraportal.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

function isLocalHost() {
  return (
    self.location.hostname === "localhost" ||
    self.location.hostname === "127.0.0.1"
  );
}

self.addEventListener("install", (event) => {
  if (isLocalHost()) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => isLocalHost() || key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept Next.js / Turbopack chunks — stale factories crash the app.
  if (url.pathname.startsWith("/_next/")) return;

  // Local development must always hit the live server.
  if (isLocalHost()) return;

  if (
    url.pathname.startsWith("/student") ||
    url.pathname.startsWith("/teacher") ||
    url.pathname.startsWith("/registrar") ||
    url.pathname === "/" ||
    url.pathname === "/login"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/login"))
        )
    );
    return;
  }

  if (url.pathname.startsWith("/icons") || url.pathname.endsWith(".css")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});
