// SightGuide PWA Service Worker v1.0
const CACHE_NAME = "sightguide-shell-v1";
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./assets/sightguide_brandmark.svg",
  "./assets/safety_art.svg",
  "./assets/meta_logo.svg",
  "./assets/thumb_person.svg",
  "./assets/thumb_steps.svg",
  "./assets/thumb_side.svg",
  "./assets/thumb_vehicle.svg",
  "./assets/thumb_branch.svg",
  "./assets/thumb_drain.svg",
  "./modules/direction-lock.js",
  "./modules/mask-renderer.js",
  "./modules/risk-engine.js",
  "./modules/speech.js",
  "./modules/tracker.js",
  "./modules/validate-guidance.js",
  "./demo/scenarios.js"
];

self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evt) => {
  const url = new URL(evt.request.url);

  // Network-first for API endpoints and live cloud services
  if (url.pathname.startsWith("/api/") || url.searchParams.has("api")) {
    return;
  }

  // Cache-first, fallback to network for static UI shell assets
  evt.respondWith(
    caches.match(evt.request).then((cached) => {
      if (cached) return cached;
      return fetch(evt.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(evt.request, toCache);
        });
        return response;
      }).catch(() => {
        if (evt.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});

