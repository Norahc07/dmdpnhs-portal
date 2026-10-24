const CACHE = "dmdpnhs-portal-v6";
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

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "PastraPortal";
  const options = {
    body: data.body || "You have a new announcement.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "pastraportal-announcement",
    renotify: true,
    data: { url: data.url || "/student/notifications" },
    vibrate: [120, 80, 120],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || "/student/notifications";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            if (client.navigate) client.navigate(target);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
        return undefined;
      })
  );
});
