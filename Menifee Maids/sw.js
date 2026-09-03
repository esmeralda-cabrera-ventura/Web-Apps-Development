/**
 * Service worker — makes the dashboard open without a signal.
 *
 * Without this, an install is only a shortcut: no network, no page, and the
 * browser-storage fallback in js/db.js is unreachable because the page itself
 * never loads. Cleaning a house in a dead spot is exactly when you need the
 * schedule.
 *
 * Two rules that matter more than the caching strategy:
 *   - /api/ and /.auth/ are NEVER cached. Job data and identity must always be
 *     live; a stale answer to "is this person allowed in" would be a real bug.
 *   - Only GET is cached. A POST is something happening, not something to replay.
 */
const VERSION = "mcc-v2";
const SHELL = VERSION + "-shell";

/* The app shell: enough to render a dashboard from cache with no network. */
const PRECACHE = [
  "/dashboard.html",
  "/admin.html",
  "/helper.html",
  "/admin-es.html",
  "/offline.html",
  "/css/styles.css",
  "/js/store.js",
  "/js/db.js",
  "/js/i18n.js",
  "/js/auth.js",
  "/js/access.js",
  "/js/errlang.js",
  "/js/admin.js",
  "/js/bubbles.js",
  "/assets/logo.png",
  "/assets/logo-sm.png",
  "/assets/favicon.png",
  "/assets/icon-192.png",
  "/assets/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL)
      // addAll fails the whole install if one file 404s, so add individually
      // and let a missing optional asset be a warning rather than a failure.
      .then((cache) => Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => console.warn("[sw] skipped", url, err.message))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== SHELL).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

const isBypassed = (url) =>
  url.pathname.startsWith("/api/") ||
  url.pathname.startsWith("/.auth/") ||
  url.pathname.endsWith("/health");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // fonts, Stripe, etc.
  if (isBypassed(url)) return;                       // always live

  // Pages: try the network so a deploy is picked up straight away, fall back to
  // the cached shell, and only then to the offline notice.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Everything else: serve from cache immediately, refresh in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const live = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || live;
    })
  );
});
