// Format pliku kopii zapasowej. Plik pochodzi z zewnątrz, więc każde pole jest sprawdzane przed zapisem.

import { cleanProfile, cleanWeights } from './body.js';
import { cleanRoutines } from './routines.js';
import { cleanShop } from './shop.js';
import { L } from './i18n.js';
import { isRpe, isSetKind } from './stats.js';

const APP_ID = 'krazek'; // Dawna nazwa aplikacji. Zmiana unieważniłaby istniejące kopie.
const VERSION = 1;

export function buildBackup({ exercises, workouts, settings, profile, bodyWeights, routines, shop }, now = Date.now()) {
  return { app: APP_ID, version: VERSION, exportedAt: now, settings, exercises, workouts, profile, bodyWeights, routines, shop };
}

const isText = (v) => typeof v === 'string' && v.length > 0;
const isTime = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const TYPES = new Set(['weight', 'bodyweight', 'time']);

function cleanExercise(raw) {
  if (!raw || !isText(raw.id) || !isText(raw.name)) return null;
  const out = {
    id: raw.id,
    name: raw.name,
    muscle: isText(raw.muscle) ? raw.muscle : 'Całe ciało',
    equipment: isText(raw.equipment) ? raw.equipment : 'Inne',
    type: TYPES.has(raw.type) ? raw.type : 'weight',
  };
  if (raw.custom) out.custom = true;
  if (raw.archived) out.archived = true;
  if (numOrNull(raw.restSec) != null) out.restSec = raw.restSec;
  if (raw.favorite === true) out.favorite = true;
  if (isText(raw.stickyNote)) out.stickyNote = raw.stickyNote;
  return out;
}

function cleanSet(raw) {
  return {
    weight: numOrNull(raw?.weight),
    reps: numOrNull(raw?.reps),
    seconds: numOrNull(raw?.seconds),
    kind: isSetKind(raw?.kind) ? raw.kind : 'normal',
    ...(isRpe(raw?.rpe) ? { rpe: raw.rpe } : {}),
  };
}

function cleanWorkout(raw) {
  if (!raw || !isText(raw.id) || !isTime(raw.startedAt) || !Array.isArray(raw.exercises)) return null;
  return {
    id: raw.id,
    name: isText(raw.name) ? raw.name : 'Trening',
    startedAt: raw.startedAt,
    endedAt: isTime(raw.endedAt) ? raw.endedAt : raw.startedAt,
    note: typeof raw.note === 'string' ? raw.note : '',
    exercises: raw.exercises
      .filter((item) => item && isText(item.exerciseId) && Array.isArray(item.sets))
      .map((item) => ({
        exerciseId: item.exerciseId,
        note: typeof item.note === 'string' ? item.note : '',
        sets: item.sets.map(cleanSet),
      })),
  };
}

/** Zwraca oczyszczone dane albo rzuca błąd z komunikatem dla użytkownika. */
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(L('Ten plik nie jest kopią Formy: nie da się go odczytać.', 'This file isn’t a Forma backup: it can’t be read.'));
  }
  if (data?.app !== APP_ID || !Array.isArray(data.exercises) || !Array.isArray(data.workouts)) {
    throw new Error(L('Ten plik nie jest kopią Formy.', 'This file isn’t a Forma backup.'));
  }
  if (data.version > VERSION) {
    throw new Error(L('Ta kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.', 'This backup is from a newer version of the app. Update the app and try again.'));
  }
  const exercises = data.exercises.map(cleanExercise).filter(Boolean);
  const workouts = data.workouts.map(cleanWorkout).filter(Boolean);
  if (workouts.length !== data.workouts.length || exercises.length !== data.exercises.length) {
    throw new Error(L('Kopia jest uszkodzona: część wpisów ma niepoprawne dane. Nic nie zostało zmienione.', 'The backup is damaged: some entries have invalid data. Nothing was changed.'));
  }
  const known = new Set(exercises.map((e) => e.id));
  for (const workout of workouts) {
    for (const item of workout.exercises) {
      if (!known.has(item.exerciseId)) {
        throw new Error(L('Kopia jest uszkodzona: trening odwołuje się do nieznanego ćwiczenia. Nic nie zostało zmienione.', 'The backup is damaged: a workout refers to an unknown exercise. Nothing was changed.'));
      }
    }
  }
  const settings = {};
  const rest = numOrNull(data.settings?.restSec);
  if (rest != null) settings.restSec = rest;
  const goal = data.settings?.weeklyGoal;
  if (Number.isInteger(goal) && goal >= 1 && goal <= 7) settings.weeklyGoal = goal;
  if (typeof data.settings?.askRpe === 'boolean') settings.askRpe = data.settings.askRpe;
  // Starsze kopie nie mają tych pól. Wczytują się wtedy z pustym profilem, dziennikiem wagi i rutynami.
  const bodyWeights = cleanWeights(data.bodyWeights);
  if (!bodyWeights) {
    throw new Error(L('Kopia jest uszkodzona: dziennik wagi ma niepoprawne wpisy. Nic nie zostało zmienione.', 'The backup is damaged: the weight log has invalid entries. Nothing was changed.'));
  }
  const routines = cleanRoutines(data.routines, known);
  if (!routines) {
    throw new Error(L('Kopia jest uszkodzona: rutyny mają niepoprawne wpisy. Nic nie zostało zmienione.', 'The backup is damaged: routines have invalid entries. Nothing was changed.'));
  }
  return { exercises, workouts, settings, profile: cleanProfile(data.profile), bodyWeights, routines, shop: cleanShop(data.shop) };
}
