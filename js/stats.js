// Obliczenia: objętość, 1RM, rekordy i agregaty do wykresów. Czysta logika, bez DOM.

import { addDays, dayKey, startOfWeek } from './format.js';

export const isWorking = (set) => set.kind !== 'warmup';

/** Szacowany ciężar maksymalny (wzór Epleya). */
export function estimate1RM(weight, reps) {
  if (!(weight > 0) || !(reps > 0)) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export const setVolume = (set) => (set.weight || 0) * (set.reps || 0);

/** Czy seria ma komplet danych potrzebnych do zaliczenia. */
export function isComplete(set, type) {
  if (type === 'time') return set.seconds > 0;
  if (type === 'bodyweight') return set.reps > 0;
  return set.weight != null && set.weight >= 0 && set.reps > 0;
}

export function workoutVolume(workout) {
  let total = 0;
  for (const item of workout.exercises) {
    for (const set of item.sets) if (isWorking(set)) total += setVolume(set);
  }
  return total;
}

export function workingSetCount(workout) {
  return workout.exercises.reduce((sum, item) => sum + item.sets.filter(isWorking).length, 0);
}

const byDateAsc = (a, b) => a.startedAt - b.startedAt;

/** Sesje danego ćwiczenia od najstarszej. Dwa wystąpienia w jednym treningu liczą się jako jedna sesja. */
export function exerciseSessions(workouts, exerciseId) {
  const sessions = [];
  for (const workout of [...workouts].sort(byDateAsc)) {
    const sets = workout.exercises.filter((i) => i.exerciseId === exerciseId).flatMap((i) => i.sets);
    if (sets.length) sessions.push({ workoutId: workout.id, date: workout.startedAt, sets });
  }
  return sessions;
}

/** Podsumowanie jednej sesji, bez serii rozgrzewkowych. */
export function summarizeSets(sets) {
  const out = { maxWeight: 0, est1RM: 0, volume: 0, maxReps: 0, totalReps: 0, maxSeconds: 0, totalSeconds: 0, setCount: 0 };
  for (const set of sets) {
    if (!isWorking(set)) continue;
    out.setCount += 1;
    out.maxWeight = Math.max(out.maxWeight, set.weight || 0);
    out.est1RM = Math.max(out.est1RM, estimate1RM(set.weight, set.reps));
    out.volume += setVolume(set);
    out.maxReps = Math.max(out.maxReps, set.reps || 0);
    out.totalReps += set.reps || 0;
    out.maxSeconds = Math.max(out.maxSeconds, set.seconds || 0);
    out.totalSeconds += set.seconds || 0;
  }
  return out;
}

/** Wskaźniki do wykresu, zależne od rodzaju ćwiczenia. */
export const METRICS = {
  weight: [
    { key: 'maxWeight', label: 'Ciężar', title: 'Największy ciężar', unit: 'kg' },
    { key: 'est1RM', label: '1RM', title: 'Szacowany 1RM', unit: 'kg' },
    { key: 'volume', label: 'Objętość', title: 'Objętość sesji', unit: 'volume' },
  ],
  bodyweight: [
    { key: 'maxReps', label: 'Powtórzenia', title: 'Najwięcej powtórzeń w serii', unit: 'reps' },
    { key: 'totalReps', label: 'Suma', title: 'Suma powtórzeń w sesji', unit: 'reps' },
    { key: 'maxWeight', label: 'Dociążenie', title: 'Największe dociążenie', unit: 'kg' },
  ],
  time: [
    { key: 'maxSeconds', label: 'Najdłużej', title: 'Najdłuższa seria', unit: 'seconds' },
    { key: 'totalSeconds', label: 'Suma', title: 'Suma czasu w sesji', unit: 'seconds' },
  ],
};

/** Rodzaje rekordów. Każdy jest liczony z pojedynczej serii. */
export const RECORD_TYPES = {
  weight: [
    { key: 'maxWeight', label: 'Największy ciężar', unit: 'kg' },
    { key: 'est1RM', label: 'Szacowany 1RM', unit: 'kg' },
    { key: 'setVolume', label: 'Największa objętość serii', unit: 'kg' },
  ],
  bodyweight: [
    { key: 'maxReps', label: 'Najwięcej powtórzeń', unit: 'reps' },
    { key: 'maxWeight', label: 'Największe dociążenie', unit: 'kg' },
  ],
  time: [{ key: 'maxSeconds', label: 'Najdłuższa seria', unit: 'seconds' }],
};

function setRecordValues(set) {
  return {
    maxWeight: set.weight || 0,
    est1RM: estimate1RM(set.weight, set.reps),
    setVolume: setVolume(set),
    maxReps: set.reps || 0,
    maxSeconds: set.seconds || 0,
  };
}

/**
 * Najlepsze wartości ćwiczenia z treningów rozpoczętych przed `beforeTs`.
 * Wynik: { hasHistory, values: { klucz: { value, date, set, workoutId } } }.
 */
export function recordsFor(workouts, exerciseId, { beforeTs = Infinity, excludeId = null } = {}) {
  const values = {};
  let hasHistory = false;
  for (const session of exerciseSessions(workouts, exerciseId)) {
    if (session.date >= beforeTs || session.workoutId === excludeId) continue;
    for (const set of session.sets) {
      if (!isWorking(set)) continue;
      hasHistory = true;
      for (const [key, value] of Object.entries(setRecordValues(set))) {
        if (value > 0 && (!values[key] || value > values[key].value)) {
          values[key] = { value, date: session.date, set, workoutId: session.workoutId };
        }
      }
    }
  }
  return { hasHistory, values };
}

/**
 * Które serie biją rekord. Zwraca tablicę równoległą do `sets`; każdy element to lista kluczy.
 * Pierwszy raz w historii nie jest rekordem, bo wtedy rekordem byłaby każda seria.
 */
export function flagRecords(sets, type, baseline) {
  const empty = sets.map(() => []);
  if (!baseline.hasHistory) return empty;
  const keys = RECORD_TYPES[type].map((r) => r.key);
  const best = Object.fromEntries(keys.map((k) => [k, baseline.values[k]?.value ?? 0]));
  sets.forEach((set, i) => {
    if (!isWorking(set) || set.done === false) return;
    const values = setRecordValues(set);
    for (const key of keys) {
      if (values[key] > best[key]) {
        best[key] = values[key];
        empty[i].push(key);
      }
    }
  });
  return empty;
}

/** Rekordy pobite w całym treningu; po jednym wpisie na rodzaj rekordu i ćwiczenie. */
export function workoutRecords(workout, workouts, exerciseById) {
  const found = [];
  const seen = new Set();
  for (const item of workout.exercises) {
    if (seen.has(item.exerciseId)) continue;
    seen.add(item.exerciseId);
    const exercise = exerciseById(item.exerciseId);
    if (!exercise) continue;
    const sets = workout.exercises.filter((i) => i.exerciseId === item.exerciseId).flatMap((i) => i.sets);
    const baseline = recordsFor(workouts, item.exerciseId, { beforeTs: workout.startedAt, excludeId: workout.id });
    const flags = flagRecords(sets, exercise.type, baseline);
    for (const record of RECORD_TYPES[exercise.type]) {
      let best = null;
      flags.forEach((keys, i) => {
        if (keys.includes(record.key)) best = { set: sets[i], value: setRecordValues(sets[i])[record.key] };
      });
      if (best) found.push({ exerciseId: item.exerciseId, key: record.key, label: record.label, unit: record.unit, ...best });
    }
  }
  return found;
}

/** Dane do paska tygodnia na ekranie głównym: siedem dni od poniedziałku. */
export function weekDays(workouts, now = new Date()) {
  const monday = startOfWeek(now);
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(monday, i);
    const key = dayKey(date);
    const list = workouts.filter((w) => dayKey(w.startedAt) === key);
    days.push({
      date,
      key,
      workouts: list,
      sets: list.reduce((sum, w) => sum + workingSetCount(w), 0),
      isToday: key === dayKey(now),
    });
  }
  return days;
}

/** Objętość i liczba treningów tydzień po tygodniu, od najstarszego. */
export function weeklyTotals(workouts, weeks, now = new Date()) {
  const thisWeek = startOfWeek(now);
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    buckets.push({ weekStart: addDays(thisWeek, -7 * i), volume: 0, workouts: 0, sets: 0 });
  }
  const index = new Map(buckets.map((b) => [dayKey(b.weekStart), b]));
  for (const workout of workouts) {
    const bucket = index.get(dayKey(startOfWeek(workout.startedAt)));
    if (!bucket) continue;
    bucket.volume += workoutVolume(workout);
    bucket.workouts += 1;
    bucket.sets += workingSetCount(workout);
  }
  return buckets;
}

/** Liczba serii roboczych na partię mięśniową od `fromTs`, od największej. */
export function muscleSets(workouts, exerciseById, fromTs) {
  const totals = new Map();
  for (const workout of workouts) {
    if (workout.startedAt < fromTs) continue;
    for (const item of workout.exercises) {
      const muscle = exerciseById(item.exerciseId)?.muscle;
      if (!muscle) continue;
      totals.set(muscle, (totals.get(muscle) || 0) + item.sets.filter(isWorking).length);
    }
  }
  return [...totals.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .filter((row) => row.sets > 0)
    .sort((a, b) => b.sets - a.sets);
}

/** Równe podziałki osi Y: 1, 2, 2,5 lub 5 razy potęga dziesięciu. */
export function niceTicks(min, max, count = 4, minStep = 0) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  const nonNegative = min >= 0;
  if (min === max) {
    const pad = Math.max(Math.abs(max) * 0.1, minStep, max === 0 ? 1 : 0);
    min -= pad;
    max += pad;
  }
  const rawStep = (max - min) / Math.max(1, count - 1);
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const step = Math.max(minStep, [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rawStep));
  let start = Math.floor(min / step) * step;
  if (nonNegative) start = Math.max(0, start);
  const ticks = [];
  for (let v = start; v < max + step * 0.999; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}
