// SightGuide PWA Service Worker v3.7
const CACHE_NAME = "sightguide-shell-v3.7";
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./assets/sightguide_brandmark.svg",
  "./assets/safety_art.svg",
  "./assets/meta_logo.svg",
  "./assets/hero_walking.jpg",
  "./assets/live_scene_pedestrian.jpg",
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
      return Promise.all(
        SHELL_ASSETS.map((url) => {
          return fetch(url, { cache: "reload" })
            .then((res) => {
              if (res && res.status === 200) {
                return cache.put(url, res);
              }
            })
            .catch(() => {});
        })
      );
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

  // Network-only for API endpoints and live cloud services
  if (url.pathname.startsWith("/api/") || url.searchParams.has("api")) {
    return;
  }

  // Network-first with cache fallback: guarantees users always receive the newest code
  evt.respondWith(
    fetch(evt.request).then((response) => {
      if (response && response.status === 200) {
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(evt.request, toCache);
        });
      }
      return response;
    }).catch(() => {
      return caches.match(evt.request).then((cached) => {
        if (cached) return cached;
        if (evt.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
