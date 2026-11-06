// Cienka warstwa nad IndexedDB. Trzy magazyny: ćwiczenia, treningi i ustawienia (klucz-wartość).

const DB_NAME = 'krazek'; // Dawna nazwa aplikacji. Zmiana odcięłaby zapisane treningi.
const DB_VERSION = 1;
export const STORES = { exercises: 'exercises', workouts: 'workouts', kv: 'kv' };

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(STORES.exercises, { keyPath: 'id' });
      db.createObjectStore(STORES.workouts, { keyPath: 'id' });
      db.createObjectStore(STORES.kv);
    };
    request.onsuccess = () => {
      const db = request.result;
      // Safari potrafi zamknąć połączenie w tle. Następny zapis otworzy je od nowa.
      db.onclose = () => { dbPromise = null; };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

async function run(store, mode, action) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const getAll = (store) => run(store, 'readonly', (s) => s.getAll());
export const put = (store, value) => run(store, 'readwrite', (s) => s.put(value));
export const remove = (store, id) => run(store, 'readwrite', (s) => s.delete(id));
export const getValue = (key) => run(STORES.kv, 'readonly', (s) => s.get(key));
export const setValue = (key, value) => run(STORES.kv, 'readwrite', (s) => s.put(value, key));
export const removeValue = (key) => run(STORES.kv, 'readwrite', (s) => s.delete(key));

/** Podmienia całą zawartość bazy w jednej transakcji: albo wszystko, albo nic. */
export async function replaceAll({ exercises, workouts, kv }) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(Object.values(STORES), 'readwrite');
    const exerciseStore = tx.objectStore(STORES.exercises);
    const workoutStore = tx.objectStore(STORES.workouts);
    const kvStore = tx.objectStore(STORES.kv);
    exerciseStore.clear();
    workoutStore.clear();
    kvStore.clear();
    exercises.forEach((e) => exerciseStore.put(e));
    workouts.forEach((w) => workoutStore.put(w));
    Object.entries(kv).forEach(([key, value]) => kvStore.put(value, key));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
