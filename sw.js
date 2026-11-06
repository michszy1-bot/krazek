// Tryb offline: wszystkie pliki aplikacji są w pamięci telefonu.
// Przy każdej zmianie plików podnieś VERSION, żeby telefon pobrał nową wersję.

const VERSION = 'krazek-v13';

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
  './js/db.js',
  './js/demo.js',
  './js/exercises.js',
  './js/format.js',
  './js/picker.js',
  './js/profile.js',
  './js/routine-views.js',
  './js/routines.js',
  './js/sound.js',
  './js/stats.js',
  './js/store.js',
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
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => (request.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    }),
  );
});
