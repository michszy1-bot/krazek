// Format pliku kopii zapasowej. Plik pochodzi z zewnątrz, więc każde pole jest sprawdzane przed zapisem.

const APP_ID = 'krazek';
const VERSION = 1;

export function buildBackup({ exercises, workouts, settings }, now = Date.now()) {
  return { app: APP_ID, version: VERSION, exportedAt: now, settings, exercises, workouts };
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
  return out;
}

function cleanSet(raw) {
  return {
    weight: numOrNull(raw?.weight),
    reps: numOrNull(raw?.reps),
    seconds: numOrNull(raw?.seconds),
    kind: raw?.kind === 'warmup' ? 'warmup' : 'normal',
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
    throw new Error('Ten plik nie jest kopią Krążka: nie da się go odczytać.');
  }
  if (data?.app !== APP_ID || !Array.isArray(data.exercises) || !Array.isArray(data.workouts)) {
    throw new Error('Ten plik nie jest kopią Krążka.');
  }
  if (data.version > VERSION) {
    throw new Error('Ta kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.');
  }
  const exercises = data.exercises.map(cleanExercise).filter(Boolean);
  const workouts = data.workouts.map(cleanWorkout).filter(Boolean);
  if (workouts.length !== data.workouts.length || exercises.length !== data.exercises.length) {
    throw new Error('Kopia jest uszkodzona: część wpisów ma niepoprawne dane. Nic nie zostało zmienione.');
  }
  const known = new Set(exercises.map((e) => e.id));
  for (const workout of workouts) {
    for (const item of workout.exercises) {
      if (!known.has(item.exerciseId)) {
        throw new Error('Kopia jest uszkodzona: trening odwołuje się do nieznanego ćwiczenia. Nic nie zostało zmienione.');
      }
    }
  }
  const settings = {};
  const rest = numOrNull(data.settings?.restSec);
  if (rest != null) settings.restSec = rest;
  if (typeof data.settings?.lockedAudio === 'boolean') settings.lockedAudio = data.settings.lockedAudio;
  return { exercises, workouts, settings };
}
