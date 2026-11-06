// Animacje dostępne bez internetu. Oglądane zapisuje sam service worker, a tutaj można pobrać wszystkie.
// Nazwa pamięci musi być taka sama jak MEDIA_CACHE w sw.js.

import { ANIMATION_BASE, ANIMATIONS } from './animations.js';

const MEDIA_CACHE = 'forma-media';
const PARALLEL = 4;
// Przeglądarka dolicza zapas do plików z innej domeny, więc 24 MB może liczyć się jak ponad 1 GB.
// Treningi dzielą to samo miejsce, dlatego animacje nigdy nie zajmują ostatnich 300 MB. Tak samo w sw.js.
const RESERVED_BYTES = 300 * 1024 * 1024;

async function hasRoom() {
  if (!navigator.storage?.estimate) return true;
  const { quota, usage } = await navigator.storage.estimate();
  return quota - usage > RESERVED_BYTES;
}

const mediaUrls = () => [...new Set(Object.values(ANIMATIONS))].map((file) => `${ANIMATION_BASE}${file}.gif`);

let running = null;
let progressListener = null;

/** Ile animacji jest już w pamięci telefonu. Zwraca null, gdy przeglądarka tego nie obsługuje. */
export async function mediaStatus() {
  if (!('caches' in window)) return null;
  const cache = await caches.open(MEDIA_CACHE);
  const saved = new Set((await cache.keys()).map((request) => request.url));
  const urls = mediaUrls();
  return { saved: urls.filter((url) => saved.has(url)).length, total: urls.length };
}

async function download() {
  const cache = await caches.open(MEDIA_CACHE);
  const saved = new Set((await cache.keys()).map((request) => request.url));
  const urls = mediaUrls();
  const queue = urls.filter((url) => !saved.has(url));
  let done = urls.length - queue.length;
  let failed = 0;
  let noRoom = false;

  const worker = async () => {
    for (let url = queue.shift(); url && !noRoom; url = queue.shift()) {
      if (!(await hasRoom())) {
        noRoom = true;
        break;
      }
      try {
        // Serwer nie zezwala na odczyt między domenami, więc odpowiedź jest nieprzezroczysta. Obrazkom to nie przeszkadza.
        const response = await fetch(url, { mode: 'no-cors', referrerPolicy: 'no-referrer' });
        await cache.put(url, response);
        done += 1;
      } catch {
        failed += 1;
      }
      progressListener?.({ done, total: urls.length });
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return { done, total: urls.length, failed, noRoom };
}

/** Usuwa zapisane animacje. Treningów to nie dotyczy, bo są w osobnej bazie. */
export const clearMedia = () => caches.delete(MEDIA_CACHE);

/** Pobiera brakujące animacje. Ponowne wywołanie w trakcie tylko podłącza nowy podgląd postępu. */
export function downloadMedia(onProgress) {
  progressListener = onProgress;
  running ??= download().finally(() => { running = null; });
  return running;
}

export const isDownloadingMedia = () => Boolean(running);
