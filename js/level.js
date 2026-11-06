// Poziomy. Wszystko wynika z historii treningów, więc nic nie trzeba zapisywać, a zmiana zasad po prostu przelicza wynik.
// Poziom główny to punkty XP za regularność i postęp. Poziomy partii to siła względem masy ciała.

import { weightOn } from './body.js';
import { HELPER_MUSCLES, MUSCLES } from './exercises.js';
import { dayKey, startOfWeek } from './format.js';
import { estimate1RM, isWorking, muscleTopSets, recordTimeline, streakFrom, streakMultiplier, weekCounter } from './stats.js';
import { DEADLIFT_LIKE, LIFTS_BODY, ONE_DUMBBELL, STRENGTH_ALSO, STRENGTH_TOPS } from './strength-norms.js';

export const XP_WORKOUT = 50; // raz dziennie, żeby nie opłacało się dzielić treningu
export const XP_RECORD = 100; // na ćwiczenie w treningu
export const XP_GOAL = 150; // za tydzień z wykonanym celem
// Tyle partia może dać w tygodniu za serie. Dzięki temu nogi, zielone od 8 serii, liczą się tak samo jak reszta.
const XP_MUSCLE_WEEK = 80;

const MAIN_SCALE = 100;
export const MAX_MUSCLE_LEVEL = 20;
// Przy większej liczbie powtórzeń wzór na ciężar maksymalny staje się mało wiarygodny.
const MAX_COUNTED_REPS = 12;
// Siła rośnie wolniej niż masa ciała, więc sam procent masy ciała zaniżałby wynik cięższych. Wykładniki pochodzą
// z danych zawodników: około 0,65 w wyciskaniu i przysiadzie oraz około 0,5 w martwym ciągu.
// Dla 80 kg, czyli punktu odniesienia norm, nic się nie zmienia.
const BODY_EXPONENT = 0.65;
const DEADLIFT_EXPONENT = 0.5;
const REFERENCE_KG = 80;
const bodyFactor = (bodyKg, exerciseId) => (bodyKg / REFERENCE_KG) ** (1 - (DEADLIFT_LIKE.has(exerciseId) ? DEADLIFT_EXPONENT : BODY_EXPONENT));

/** Nazwa poziomu siły. Elita zaczyna się dopiero na poziomie najwyższym. */
export function strengthCategory(level) {
  if (level >= MAX_MUSCLE_LEVEL) return 'Elita';
  if (level >= 16) return 'Zaawansowany';
  if (level >= 11) return 'Średnio zaawansowany';
  return level >= 6 ? 'Nowicjusz' : 'Początkujący';
}

/** Kolory poziomów siły, te same co na mapie serii: od czerwonego do zielonego. */
export const STRENGTH_BANDS = [
  { colour: 1, label: '1–5' },
  { colour: 2, label: '6–10' },
  { colour: 3, label: '11–15' },
  { colour: 4, label: '16–20' },
];

/** Numer koloru poziomu siły. Partia bez wyniku, czyli 0, zostaje szara. */
export const strengthColour = (level) => (level ? Math.ceil(level / 5) : 0);

export const xpPerSet = (muscle) => XP_MUSCLE_WEEK / muscleTopSets(muscle);

/** Kolejne poziomy główne są coraz droższe: próg rośnie z kwadratem poziomu. */
function mainLevel(xp) {
  const level = Math.floor(Math.sqrt(xp / MAIN_SCALE)) + 1;
  const start = MAIN_SCALE * (level - 1) ** 2;
  const end = MAIN_SCALE * level ** 2;
  return { xp, level, toNext: end - xp, share: (xp - start) / (end - start) };
}

function earnedXp(workouts, exerciseById, weeklyGoal, shieldedWeeks) {
  const weekXp = new Map();
  const add = (time, amount) => {
    const week = dayKey(startOfWeek(time));
    const entry = weekXp.get(week) ?? { start: startOfWeek(time), xp: 0 };
    entry.xp += amount;
    weekXp.set(week, entry);
  };
  const days = new Set();
  const weekSets = new Map();
  const weekWorkouts = new Map();

  for (const workout of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    const week = dayKey(startOfWeek(workout.startedAt));
    weekWorkouts.set(week, (weekWorkouts.get(week) ?? 0) + 1);
    let hasWorkingSet = false;
    for (const item of workout.exercises) {
      const muscle = exerciseById(item.exerciseId)?.muscle;
      for (const set of item.sets) {
        if (!isWorking(set)) continue;
        hasWorkingSet = true;
        if (!muscle) continue;
        const key = `${week}|${muscle}`;
        const count = weekSets.get(key) ?? 0;
        weekSets.set(key, count + 1);
        if (count < muscleTopSets(muscle)) add(workout.startedAt, xpPerSet(muscle));
      }
    }
    const day = dayKey(workout.startedAt);
    if (hasWorkingSet && !days.has(day)) {
      days.add(day);
      add(workout.startedAt, XP_WORKOUT);
    }
    if (weeklyGoal != null && weekWorkouts.get(week) === weeklyGoal) add(workout.startedAt, XP_GOAL);
  }

  for (const { date } of recordTimeline(workouts, exerciseById)) add(date, XP_RECORD);

  // Bez celu nie ma serii, więc nie ma też mnożnika.
  const countIn = weekCounter(workouts);
  let xp = 0;
  for (const { start, xp: earned } of weekXp.values()) {
    xp += earned * (weeklyGoal == null ? 1 : streakMultiplier(streakFrom(countIn, weeklyGoal, start, shieldedWeeks)));
  }
  return Math.round(xp);
}

/**
 * Szacowany ciężar maksymalny serii jako ułamek masy ciała, np. 0,96 to 96%.
 * Przy parze hantli liczy się ich suma. Zwraca 0, gdy z serii nie da się odczytać siły.
 */
export function strengthRatio(exercise, set, bodyKg) {
  if (!(bodyKg > 0) || !(set.reps > 0)) return 0;
  const reps = Math.min(set.reps, MAX_COUNTED_REPS);
  if (exercise.type === 'bodyweight') {
    return LIFTS_BODY.has(exercise.id) ? estimate1RM(bodyKg + (set.weight || 0), reps) / bodyKg : 0;
  }
  if (exercise.type !== 'weight' || !(set.weight > 0)) return 0;
  const hands = exercise.equipment === 'Hantle' && !ONE_DUMBBELL.has(exercise.id) ? 2 : 1;
  return (estimate1RM(set.weight, reps) * hands) / bodyKg;
}

const usesMachine = (exercise) => exercise.equipment === 'Maszyna' || exercise.equipment === 'Wyciąg';

// Ćwiczenie złożone niewiele mówi o sile partii pomocniczej, więc liczy się dla niej tylko 10% wyniku.
const HELPER_SHARE = 0.1;
// Kolejność źródeł wyniku: wolny ciężar, maszyna, a na końcu ćwiczenie, w którym partia tylko pomaga.
const RANK_FREE = 3;
const RANK_MACHINE = 2;
const RANK_HELPER_FREE = 1;
const RANK_HELPER_MACHINE = 0;

/** Partie, którym ćwiczenie daje wynik siły, z normą i pierwszeństwem. */
function strengthNorms(exercise, top) {
  const machine = usesMachine(exercise);
  const also = STRENGTH_ALSO[exercise.id] ?? {};
  const main = [[exercise.muscle, top], ...Object.entries(also)]
    .map(([muscle, norm]) => ({ muscle, norm, rank: machine ? RANK_MACHINE : RANK_FREE }));
  const helpers = (HELPER_MUSCLES.get(exercise.id) ?? [])
    .filter((muscle) => !also[muscle])
    .map((muscle) => ({ muscle, norm: top / HELPER_SHARE, rank: machine ? RANK_HELPER_MACHINE : RANK_HELPER_FREE }));
  return [...main, ...helpers];
}

/**
 * Najlepszy wynik każdej partii w historii, z wagą z dnia treningu, więc późniejsza zmiana wagi go nie obniża.
 * Wolne ciężary mają pierwszeństwo: maszyny i wyciągi liczą się tylko, gdy partia nie ma wyniku z wolnych ciężarów.
 * Ćwiczenie, w którym partia tylko pomaga, liczy się dopiero wtedy, gdy nie ma żadnego ćwiczenia wprost na nią.
 */
function bestStrength(workouts, exerciseById, bodyWeights) {
  const best = new Map();
  if (!bodyWeights.length) return best;
  for (const workout of workouts) {
    const bodyKg = weightOn(bodyWeights, dayKey(workout.startedAt))?.kg;
    for (const item of workout.exercises) {
      const exercise = exerciseById(item.exerciseId);
      const top = STRENGTH_TOPS[item.exerciseId];
      if (!exercise || !top) continue;
      const norms = strengthNorms(exercise, top);
      const factor = bodyFactor(bodyKg, exercise.id);
      for (const set of item.sets) {
        if (!isWorking(set)) continue;
        const ratio = strengthRatio(exercise, set, bodyKg);
        if (!(ratio > 0)) continue;
        for (const { muscle, norm, rank } of norms) {
          const score = (ratio * factor) / norm;
          const current = best.get(muscle);
          const wins = !current || rank > current.rank || (rank === current.rank && score > current.score);
          if (wins) best.set(muscle, { score, ratio, top: norm, factor, exercise: exercise.name, rank });
        }
      }
    }
  }
  return best;
}

function muscleRow(muscle, best) {
  if (!best) return { muscle, level: null, share: 0 };
  const steps = (MAX_MUSCLE_LEVEL - 1) * Math.min(1, best.score);
  const level = Math.floor(steps) + 1;
  const atTop = level === MAX_MUSCLE_LEVEL;
  return {
    muscle,
    level,
    share: atTop ? 1 : steps - Math.floor(steps),
    ratio: best.ratio,
    exercise: best.exercise,
    // Wynik w tym samym ćwiczeniu, który da następny poziom.
    nextRatio: atTop ? null : (best.top * level) / (MAX_MUSCLE_LEVEL - 1) / best.factor,
  };
}

/** Poziom główny i poziomy partii, od najsłabszej. Partie bez wyniku są na końcu. */
export function levelProgress(workouts, exerciseById, { weeklyGoal = null, bodyWeights = [], shieldedWeeks = [] } = {}) {
  const best = bestStrength(workouts, exerciseById, bodyWeights);
  const muscles = MUSCLES
    .filter((muscle) => muscle !== 'Całe ciało')
    .map((muscle) => muscleRow(muscle, best.get(muscle)))
    .sort((a, b) => (a.level == null) - (b.level == null) || (a.level + a.share) - (b.level + b.share));
  return { ...mainLevel(earnedXp(workouts, exerciseById, weeklyGoal, shieldedWeeks)), muscles };
}

/** Co dał zapisany trening: różnica między historią z nim i bez niego. */
export function workoutGain(workouts, workout, exerciseById, options = {}) {
  const before = levelProgress(workouts.filter((w) => w.id !== workout.id), exerciseById, options);
  const after = levelProgress(workouts, exerciseById, options);
  const levelBefore = new Map(before.muscles.map((row) => [row.muscle, row.level ?? 0]));
  const multiplier = options.weeklyGoal == null
    ? 1
    : streakMultiplier(streakFrom(weekCounter(workouts), options.weeklyGoal, startOfWeek(workout.startedAt), options.shieldedWeeks ?? []));
  return {
    xp: after.xp - before.xp,
    multiplier,
    before,
    after,
    muscleUps: after.muscles.filter((row) => row.level > levelBefore.get(row.muscle)),
  };
}
