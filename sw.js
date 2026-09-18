// Tenere allineato ad APP_VERSION in app.js: cambiarlo forza
// il service worker a scartare la cache precedente e riscaricare l'app.
const CACHE_NAME = "fioxify-shell-v1.13.1";

const SHELL_ASSETS = [
  "index.html",
  "app.html",
  "css/style.css",
  "app.js",
  "manifest.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

/* Stale-while-revalidate solo per l'app shell (stesso dominio).
   Le chiamate a Supabase (auth/storage/DB) e ai CDN esterni passano
   sempre dritte in rete: qui non vanno né cache né intercettate.
   L'audio dei brani NON passa da qui: il tag <audio> genera le sue
   richieste di rete in modo poco affidabile attraverso il fetch handler
   del service worker (su Safari, in particolare, le salta del tutto).
   La cache dei brani è gestita direttamente in app.js con fetch() +
   Cache API, che passa sempre in modo affidabile in ogni browser. */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
