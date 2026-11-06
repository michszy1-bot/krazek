// Stan aplikacji w pamięci, zapisywany na bieżąco do IndexedDB.

import { getAll, getValue, put, remove, removeValue, replaceAll, setValue, STORES } from './db.js';
import { SEED_EXERCISES } from './exercises.js';
import { buildBackup, parseBackup } from './backup.js';
import { EMPTY_PROFILE } from './body.js';

const DEFAULT_SETTINGS = { restSec: 120 };

export const state = {
  exercises: new Map(),
  workouts: [], // od najnowszego
  settings: { ...DEFAULT_SETTINGS },
  profile: { ...EMPTY_PROFILE },
  bodyWeights: [], // od najnowszego: { day: 'RRRR-MM-DD', kg }
  routines: [], // { id, name, exercises: [{ exerciseId, sets: ['normal' | 'warmup'] }] }
  active: null, // trening w toku
  lastBackupAt: null,
};

const listeners = new Set();
export const subscribe = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn());

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
export const exerciseById = (id) => state.exercises.get(id);

const sortWorkouts = () => state.workouts.sort((a, b) => b.startedAt - a.startedAt);

export async function load() {
  const stored = await getAll(STORES.exercises);
  state.exercises = new Map(stored.map((e) => [e.id, e]));
  // Nowe ćwiczenia z kolejnych wersji aplikacji dochodzą bez nadpisywania zmian użytkownika.
  for (const seed of SEED_EXERCISES) {
    if (!state.exercises.has(seed.id)) {
      state.exercises.set(seed.id, seed);
      await put(STORES.exercises, seed);
    }
  }
  state.workouts = await getAll(STORES.workouts);
  sortWorkouts();
  state.settings = { ...DEFAULT_SETTINGS, ...(await getValue('settings')) };
  state.profile = { ...EMPTY_PROFILE, ...(await getValue('profile')) };
  state.bodyWeights = (await getValue('bodyWeights')) ?? [];
  state.routines = (await getValue('routines')) ?? [];
  state.active = (await getValue('active')) ?? null;
  state.lastBackupAt = (await getValue('lastBackupAt')) ?? null;
}

// --- Trening w toku: każda zmiana trafia do bazy, więc zamknięcie aplikacji niczego nie gubi ---

let activeTimer = null;

export function saveActiveSoon() {
  clearTimeout(activeTimer);
  activeTimer = setTimeout(flushActive, 250);
}

export function flushActive() {
  clearTimeout(activeTimer);
  activeTimer = null;
  if (state.active) return setValue('active', structuredClone(state.active));
  return removeValue('active');
}

export async function setActive(draft) {
  state.active = draft;
  await flushActive();
  emit();
}

// --- Treningi ---

export async function saveWorkout(workout) {
  await put(STORES.workouts, structuredClone(workout));
  const index = state.workouts.findIndex((w) => w.id === workout.id);
  if (index >= 0) state.workouts[index] = workout;
  else state.workouts.push(workout);
  sortWorkouts();
  emit();
}

export async function deleteWorkout(id) {
  await remove(STORES.workouts, id);
  state.workouts = state.workouts.filter((w) => w.id !== id);
  emit();
}

// --- Ćwiczenia ---

export async function saveExercise(exercise) {
  await put(STORES.exercises, exercise);
  state.exercises.set(exercise.id, exercise);
  emit();
}

export const isExerciseUsed = (id) =>
  state.workouts.some((w) => w.exercises.some((i) => i.exerciseId === id))
  || state.routines.some((r) => r.exercises.some((i) => i.exerciseId === id))
  || Boolean(state.active?.exercises.some((i) => i.exerciseId === id));

/** Użyte ćwiczenie jest tylko ukrywane, żeby historia i rutyny zachowały jego nazwę. */
export async function deleteExercise(id) {
  const exercise = state.exercises.get(id);
  if (!exercise) return;
  if (isExerciseUsed(id)) {
    await saveExercise({ ...exercise, archived: true });
    return;
  }
  await remove(STORES.exercises, id);
  state.exercises.delete(id);
  emit();
}

/** Ćwiczenia widoczne przy wyborze, od A do Z. */
export function visibleExercises() {
  return [...state.exercises.values()]
    .filter((e) => !e.archived)
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

// --- Ustawienia ---

export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await setValue('settings', state.settings);
  emit();
}

// --- Rutyny ---

export async function saveRoutines(list) {
  state.routines = list;
  await setValue('routines', list);
  emit();
}

// --- Profil i dziennik wagi ---

export async function saveProfile(patch) {
  state.profile = { ...state.profile, ...patch };
  await setValue('profile', state.profile);
  emit();
}

export async function saveBodyWeights(list) {
  state.bodyWeights = list;
  await setValue('bodyWeights', list);
  emit();
}

// --- Kopia zapasowa ---

export function backupText() {
  return JSON.stringify(buildBackup({
    exercises: [...state.exercises.values()],
    workouts: state.workouts,
    settings: state.settings,
    profile: state.profile,
    bodyWeights: state.bodyWeights,
    routines: state.routines,
  }));
}

export async function markBackedUp() {
  state.lastBackupAt = Date.now();
  await setValue('lastBackupAt', state.lastBackupAt);
  emit();
}

export const previewBackup = (text) => parseBackup(text);

/** Zastępuje wszystkie dane zawartością kopii i przerywa trening w toku. */
export async function restoreBackup(parsed) {
  const settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
  const backedUpAt = Date.now();
  await replaceAll({
    exercises: parsed.exercises,
    workouts: parsed.workouts,
    kv: { settings, lastBackupAt: backedUpAt, profile: parsed.profile, bodyWeights: parsed.bodyWeights, routines: parsed.routines },
  });
  await load();
  emit();
}

export async function wipeAll() {
  await replaceAll({ exercises: [], workouts: [], kv: {} });
  await load();
  emit();
}
