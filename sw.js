// Tenere allineato ad APP_VERSION in app.js: cambiarlo forza
// il service worker a scartare la cache precedente e riscaricare l'app.
const CACHE_NAME = "fioxify-shell-v1.13.5";

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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // "reload" scavalca la cache HTTP: con addAll() si rischia di
      // precaricare file già scaduti ma ancora considerati freschi
      Promise.all(
        SHELL_ASSETS.map((asset) =>
          fetch(asset, { cache: "reload" })
            .then((response) => (response.ok ? cache.put(asset, response) : null))
            // un singolo file irraggiungibile non deve far fallire l'installazione
            .catch(() => null)
        )
      )
    )
  );
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

/* Prima la rete, la cache come riserva, solo per l'app shell (stesso
   dominio). Prima era il contrario (stale-while-revalidate): si serviva
   la copia in cache e si aggiornava per la volta dopo, quindi ogni
   pubblicazione richiedeva DUE aperture dell'app per essere vista.
   Siccome l'APK è solo un guscio attorno al sito, la versione giusta
   deve arrivare subito; la cache resta per funzionare offline.

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

  // GitHub Pages serve con max-age=600: senza "no-cache" il browser
  // considera i file freschi per dieci minuti e una pubblicazione appena
  // fatta non arriva, per quanto si riavvii l'app. Così invece si
  // rivalida sempre col server (risposta 304 se nulla è cambiato).
  // Gli header vengono ricopiati perché Capacitor inietta il proprio
  // bridge nativo solo nelle risposte richieste con Accept: text/html.
  const revalidated = new Request(request.url, {
    headers: request.headers,
    credentials: "same-origin",
    cache: "no-cache",
  });

  event.respondWith(
    fetch(revalidated)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
