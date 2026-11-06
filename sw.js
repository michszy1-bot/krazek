// Tryb offline: wszystkie pliki aplikacji są w pamięci telefonu.
// Przy każdej zmianie plików podnieś VERSION, żeby telefon pobrał nową wersję.

const VERSION = 'krazek-v26';

// Animacje mają osobną pamięć, która przetrwa aktualizacje aplikacji. Nazwa jak w js/media.js.
const MEDIA_CACHE = 'forma-media';
const MEDIA_HOST = 'static.exercisedb.dev';
// Animacje nie zajmują ostatnich 300 MB, bo to samo miejsce dzielą treningi. Tak samo w js/media.js.
const RESERVED_BYTES = 300 * 1024 * 1024;

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/animations.js',
  './js/app.js',
  './js/backup.js',
  './js/body.js',
  './js/chart.js',
  './js/csv.js',
  './js/db.js',
  './js/demo.js',
  './js/exercises.js',
  './js/format.js',
  './js/level.js',
  './js/level-views.js',
  './js/media.js',
  './js/muscle-map.js',
  './js/muscle-shapes.js',
  './js/picker.js',
  './js/profile.js',
  './js/routine-views.js',
  './js/routines.js',
  './js/sound.js',
  './js/stats.js',
  './js/store.js',
  './js/strength-norms.js',
  './js/ui.js',
  './js/views.js',
  './js/workout.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' pomija pamięć przeglądarki, żeby pod nowym numerem nie zapisać starych plików.
  const requests = FILES.map((file) => new Request(file, { cache: 'reload' }));
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(requests)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION && key !== MEDIA_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** Animacja z pamięci, a gdy jej nie ma, z sieci, z zapisem na następny raz. */
async function mediaResponse(event) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(event.request.url);
  if (cached) return cached;
  const response = await fetch(event.request);
  event.waitUntil(saveMedia(cache, event.request.url, response.clone()));
  return response;
}

async function saveMedia(cache, url, response) {
  try {
    const { quota, usage } = await self.navigator.storage.estimate();
    if (quota - usage > RESERVED_BYTES) await cache.put(url, response);
  } catch {
    // Brak zapisu nie może przeszkodzić w pokazaniu animacji.
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.hostname === MEDIA_HOST) {
    event.respondWith(mediaResponse(event));
    return;
  }
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => (request.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    }),
  );
});
