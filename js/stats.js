// Obliczenia: objętość, 1RM, rekordy i agregaty do wykresów. Czysta logika, bez DOM.

import { musclesOf } from './exercises.js';
import { addDays, dayKey, startOfDay, startOfWeek } from './format.js';

export const isWorking = (set) => set.kind !== 'warmup';

/** Rodzaje serii. Wszystkie poza rozgrzewkową liczą się do objętości i rekordów. */
export const SET_KINDS = {
  normal: { label: 'Robocza', name: 'Seria' },
  warmup: { label: 'Rozgrzewkowa', mark: 'R', name: 'Seria rozgrzewkowa', hint: 'Nie liczy się do objętości ani rekordów' },
  failure: { label: 'Do upadku', mark: 'U', name: 'Seria do upadku' },
  drop: { label: 'Dropset', mark: 'D', name: 'Dropset' },
};

export const isSetKind = (kind) => Object.hasOwn(SET_KINDS, kind);

/** Oznaczenia serii: zwykłe numerowane po kolei, pozostałe literą, np. R, 1, 2, U, D. */
export function setLabels(sets) {
  let number = 0;
  return sets.map((set) => {
    const mark = SET_KINDS[set.kind]?.mark;
    if (mark) return mark;
    number += 1;
    return String(number);
  });
}

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

/** Zamienia oznaczenia serii na listę rekordów ćwiczenia; po jednym wpisie na rodzaj rekordu. */
function recordsFromFlags(exerciseId, type, sets, flags) {
  const found = [];
  for (const record of RECORD_TYPES[type]) {
    let best = null;
    flags.forEach((keys, i) => {
      if (keys.includes(record.key)) best = { set: sets[i], value: setRecordValues(sets[i])[record.key] };
    });
    if (best) found.push({ exerciseId, key: record.key, label: record.label, unit: record.unit, ...best });
  }
  return found;
}

const uniqueExerciseIds = (workout) => [...new Set(workout.exercises.map((i) => i.exerciseId))];
const setsOf = (workout, exerciseId) => workout.exercises.filter((i) => i.exerciseId === exerciseId).flatMap((i) => i.sets);

/** Rekordy pobite w całym treningu; po jednym wpisie na rodzaj rekordu i ćwiczenie. */
export function workoutRecords(workout, workouts, exerciseById) {
  const found = [];
  for (const exerciseId of uniqueExerciseIds(workout)) {
    const exercise = exerciseById(exerciseId);
    if (!exercise) continue;
    const sets = setsOf(workout, exerciseId);
    const baseline = recordsFor(workouts, exerciseId, { beforeTs: workout.startedAt, excludeId: workout.id });
    found.push(...recordsFromFlags(exerciseId, exercise.type, sets, flagRecords(sets, exercise.type, baseline)));
  }
  return found;
}

/**
 * Wszystkie pobite rekordy od najnowszego, po jednym wpisie na ćwiczenie w treningu.
 * Jeden przebieg po historii z narastającym stanem, bo to najcięższe liczenie na ekranie Postępy.
 */
export function recordTimeline(workouts, exerciseById) {
  const baselines = new Map();
  const timeline = [];
  for (const workout of [...workouts].sort(byDateAsc)) {
    for (const exerciseId of uniqueExerciseIds(workout)) {
      const exercise = exerciseById(exerciseId);
      if (!exercise) continue;
      const sets = setsOf(workout, exerciseId);
      const baseline = baselines.get(exerciseId) ?? { hasHistory: false, values: {} };
      const records = recordsFromFlags(exerciseId, exercise.type, sets, flagRecords(sets, exercise.type, baseline));
      if (records.length) timeline.push({ workoutId: workout.id, date: workout.startedAt, exerciseId, records });

      for (const set of sets) {
        if (!isWorking(set)) continue;
        baseline.hasHistory = true;
        for (const [key, value] of Object.entries(setRecordValues(set))) {
          if (value > 0 && value > (baseline.values[key]?.value ?? 0)) baseline.values[key] = { value };
        }
      }
      baselines.set(exerciseId, baseline);
    }
  }
  return timeline.reverse();
}

/**
 * Stan celu tygodniowego. Seria to kolejne tygodnie z wykonanym celem:
 * trwający tydzień dolicza się dopiero po wykonaniu, ale wcześniej jej nie przerywa.
 */
export function goalProgress(workouts, goal, now = new Date()) {
  const counts = new Map();
  for (const workout of workouts) {
    const key = dayKey(startOfWeek(workout.startedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const countIn = (date) => counts.get(dayKey(date)) ?? 0;
  const thisWeek = startOfWeek(now);
  const done = countIn(thisWeek);
  const met = done >= goal;
  let streak = met ? 1 : 0;
  for (let week = addDays(thisWeek, -7); countIn(week) >= goal; week = addDays(week, -7)) streak += 1;
  return { done, goal, met, streak };
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
      const sets = item.sets.filter(isWorking).length;
      for (const [muscle, share] of musclesOf(exerciseById(item.exerciseId))) {
        totals.set(muscle, (totals.get(muscle) || 0) + sets * share);
      }
    }
  }
  return [...totals.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .filter((row) => row.sets > 0)
    .sort((a, b) => b.sets - a.sets);
}

/**
 * Partie nietrenowane od `afterDays` dni, najpierw te najdłużej odkładane, a na końcu jeszcze nieruszone.
 * Wynik: [{ muscle, days }], gdzie days to null przy partii bez żadnej serii.
 */
export function neglectedMuscles(workouts, exerciseById, muscles, now = new Date(), afterDays = 7) {
  const last = new Map();
  for (const workout of workouts) {
    for (const item of workout.exercises) {
      if (!item.sets.some(isWorking)) continue;
      for (const [muscle] of musclesOf(exerciseById(item.exerciseId))) {
        last.set(muscle, Math.max(last.get(muscle) ?? 0, workout.startedAt));
      }
    }
  }
  const today = startOfDay(now).getTime();
  return muscles
    .map((muscle) => ({
      muscle,
      days: last.has(muscle) ? Math.round((today - startOfDay(last.get(muscle)).getTime()) / 86400000) : null,
    }))
    .filter(({ days }) => days === null || days >= afterDays)
    .sort((a, b) => (b.days ?? -1) - (a.days ?? -1));
}

const LEG_MUSCLES = new Set(['Czworogłowe', 'Dwugłowe uda', 'Pośladki', 'Łydki']);
// Górne granice trzech niższych poziomów. Powyżej ostatniej partia jest na najwyższym poziomie.
const UPPER_TOPS = [5, 10, 15];
const LEG_TOPS = [2, 5, 7];

function levelLabels(tops) {
  const labels = tops.map((top, i) => {
    const from = i === 0 ? 1 : tops[i - 1] + 1;
    return from === top ? String(top) : `${from}–${top}`;
  });
  return [...labels, `${tops.at(-1) + 1}+`].map((label, i) => ({ level: i + 1, label }));
}

/** Skale kolorów do legendy mapy mięśni. Nogom wystarcza mniej serii niż reszcie ciała. */
export const MUSCLE_SCALES = [
  { name: 'Góra', levels: levelLabels(UPPER_TOPS) },
  { name: 'Nogi', levels: levelLabels(LEG_TOPS) },
];

/** Liczba serii w tygodniu, od której partia jest na mapie zielona. */
export const muscleTopSets = (muscle) => (LEG_MUSCLES.has(muscle) ? LEG_TOPS : UPPER_TOPS).at(-1) + 1;

/** Poziom koloru na mapie mięśni. Stałe progi, bo 10 serii tygodniowo znaczy to samo w każdym tygodniu. */
export function muscleLevel(sets, muscle) {
  if (!(sets > 0)) return 0;
  const tops = LEG_MUSCLES.has(muscle) ? LEG_TOPS : UPPER_TOPS;
  const below = tops.findIndex((top) => sets <= top);
  return below === -1 ? tops.length + 1 : below + 1;
}

/** Skok ciężaru: 2,5 kg, a przy hantlach 2 kg, bo zwykle rosną co 1 kg na stronę. */
export const weightStep = (equipment) => (equipment === 'Hantle' ? 2 : 2.5);

/**
 * Ciężar, od którego liczy szybka zmiana: wpisany w serii, a gdy go nie ma, ostatni wcześniejszy
 * z tego ćwiczenia, a na końcu podpowiedź. Rozgrzewka nie jest punktem wyjścia dla serii roboczej.
 */
export function stepBaseWeight(sets, index, hintWeight) {
  const set = sets[index];
  if (set.weight != null) return set.weight;
  const earlier = sets.slice(0, index).reverse().find((s) => s.weight != null && isWorking(s) === isWorking(set));
  return earlier?.weight ?? hintWeight ?? 0;
}

/** Ciężar po zmianie, bez wartości ujemnych i błędów zaokrągleń. */
export const steppedWeight = (base, delta) => Math.max(0, Math.round((base + delta) * 100) / 100);

export const emptySet = (kind = 'normal') => ({ weight: null, reps: null, seconds: null, kind, done: false });

const WARMUP_REST_SEC = 45;

/** Przerwa po odhaczonej serii. Rozgrzewka nie męczy, więc nie czeka się po niej pełnego czasu. */
export const restAfterSet = (set, restSec) => (set.kind === 'warmup' ? Math.min(WARMUP_REST_SEC, restSec) : restSec);

const BACKUP_REMINDER_DAYS = 7;

/**
 * Stan kopii zapasowej: ile treningów nie jest w kopii i czy czas o niej przypomnieć.
 * Przypomnienie wraca co tydzień, ale tylko gdy od ostatniej kopii przybył co najmniej jeden trening.
 */
export function backupStatus(workouts, lastBackupAt, now = Date.now()) {
  const unsaved = lastBackupAt == null ? workouts.length : workouts.filter((w) => w.endedAt > lastBackupAt).length;
  const due = unsaved > 0 && (lastBackupAt == null || now - lastBackupAt >= BACKUP_REMINDER_DAYS * 86400000);
  return { unsaved, due };
}

const BAR_KG = 20;

/**
 * Serie rozgrzewkowe przed ciężarem roboczym: przy sztandze sam gryf, potem 50% i 75%.
 * Ciężar jest zaokrąglany do skoku sprzętu, a serie, które wypadłyby tak samo, są pomijane.
 */
export function warmupSets(weight, equipment) {
  if (!(weight > 0)) return [];
  const step = weightStep(equipment);
  const share = (part) => Math.round((weight * part) / step) * step;
  const isBar = equipment === 'Sztanga';
  const plan = [...(isBar ? [[BAR_KG, 10]] : []), [share(0.5), 8], [share(0.75), 4]];
  const sets = [];
  for (const [kg, reps] of plan) {
    const heavierThanLast = kg > (sets.at(-1)?.weight ?? (isBar ? BAR_KG - 1 : 0));
    if (heavierThanLast && kg < weight) sets.push({ ...emptySet('warmup'), weight: kg, reps });
  }
  return sets;
}

/**
 * Zamiana ćwiczenia w trwającym treningu. Odhaczone serie zostają przy starym ćwiczeniu,
 * bo tak było naprawdę, a pozostałe przechodzą na nowe jako puste, z tym samym rodzajem.
 */
export function swapExercise(item, exerciseId) {
  const done = item.sets.filter((set) => set.done);
  const fresh = {
    exerciseId,
    note: done.length ? '' : (item.note ?? ''),
    sets: item.sets.filter((set) => !set.done).map((set) => emptySet(set.kind ?? 'normal')),
    ...(item.repRange ? { repRange: item.repRange } : {}),
  };
  return { kept: done.length ? { ...item, sets: done } : null, fresh };
}

/**
 * Proponowany ciężar po sesji, w której wszystkie serie sięgnęły górnej granicy zakresu.
 * Dropset i rozgrzewka się nie liczą, bo z założenia mają inny ciężar.
 */
export function suggestNextWeight(sets, repRange, equipment) {
  if (!repRange) return null;
  const counted = sets.filter((set) => set.kind !== 'warmup' && set.kind !== 'drop');
  if (!counted.length || !counted.every((set) => set.reps >= repRange.max)) return null;
  const top = Math.max(...counted.map((set) => set.weight || 0));
  if (!(top > 0)) return null;
  return top + weightStep(equipment);
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
