/* Perene service worker — PWA app shell + Today's Suggestions offline cache.
 *
 * Hand-rolled (no next-pwa / Workbox) on purpose: Next 16 builds with Turbopack
 * and next-pwa is a webpack-only, unmaintained plugin, so it can't hook into the
 * build. A plain SW also gives us exact control over the caching rules below.
 *
 * Caching strategy (see the fetch handler):
 *   - Supabase (*.supabase.co)        → network only. User data stays fresh.
 *   - GET /api/daily-outfits           → network-first + cache. Today's
 *                                        Suggestions remain viewable offline.
 *   - other /api/*                     → network only (don't cache user data).
 *   - /_next/static, /icons, fonts…    → stale-while-revalidate (app shell).
 *   - navigations (HTML documents)     → network-first, fall back to cache then
 *                                        the /offline page.
 *
 * Bump VERSION to roll all caches on the next activation.
 */

const VERSION = "v1";
const SHELL_CACHE = `perene-shell-${VERSION}`;
const RUNTIME_CACHE = `perene-runtime-${VERSION}`;
const DATA_CACHE = `perene-data-${VERSION}`;
const CACHES = [SHELL_CACHE, RUNTIME_CACHE, DATA_CACHE];

// The /offline page is the only thing we must have on hand before the network
// fails, so it's the only precache. Hashed /_next/static assets change per build
// and can't be listed here — they're cached at runtime instead.
const PRECACHE_URLS = ["/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !CACHES.includes(k)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Caching strategies ────────────────────────────────────────────────────────

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

async function navigationHandler(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline");
    if (offline) return offline;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch non-GET (mutations must always hit the network).
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. Supabase — always network, never cached. Keeps auth / wardrobe / profile
  //    data fresh and avoids caching authenticated, user-specific responses.
  if (url.hostname.endsWith("supabase.co")) return;

  // Only handle our own origin past this point.
  if (url.origin !== self.location.origin) return;

  // 2. Today's Suggestions — network-first so it's fresh online, cached so it
  //    degrades gracefully offline.
  if (url.pathname === "/api/daily-outfits") {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // 3. All other API routes — network only (don't cache user-specific data).
  if (url.pathname.startsWith("/api/")) return;

  // 4. Build assets, icons, manifest, fonts, images — stale-while-revalidate.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:js|css|woff2?|png|jpe?g|svg|ico|webp|gif)$/.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // 5. Page navigations — network-first, fall back to cache then /offline.
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }
});

// ── Push notifications (foundation only — nothing is sent yet) ─────────────────
// These handlers are in place so that once a server starts sending Web Push
// messages, notifications render and clicks focus the app. No behaviour today.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Perene";
  const options = {
    body: payload.body || "",
    icon: "/icons/192",
    badge: "/icons/192",
    data: { url: payload.url || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            if ("navigate" in client) client.navigate(target);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      })
  );
});
