// Poziomy. Wszystko wynika z historii treningów, więc nic nie trzeba zapisywać, a zmiana zasad po prostu przelicza wynik.
// Poziom główny to punkty XP za regularność i postęp. Poziomy partii to siła względem masy ciała.

import { weightOn } from './body.js';
import { MUSCLES } from './exercises.js';
import { dayKey, startOfWeek } from './format.js';
import { estimate1RM, isWorking, muscleTopSets, recordTimeline } from './stats.js';
import { LIFTS_BODY, ONE_DUMBBELL, STRENGTH_ALSO, STRENGTH_TOPS } from './strength-norms.js';

export const XP_WORKOUT = 50; // raz dziennie, żeby nie opłacało się dzielić treningu
export const XP_RECORD = 100; // na ćwiczenie w treningu
export const XP_GOAL = 150; // za tydzień z wykonanym celem
// Tyle partia może dać w tygodniu za serie. Dzięki temu nogi, zielone od 8 serii, liczą się tak samo jak reszta.
const XP_MUSCLE_WEEK = 80;

const MAIN_SCALE = 100;
export const MAX_MUSCLE_LEVEL = 20;
// Przy większej liczbie powtórzeń wzór na ciężar maksymalny za bardzo zawyża wynik.
const MAX_COUNTED_REPS = 15;

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

function earnedXp(workouts, exerciseById, weeklyGoal) {
  let xp = 0;
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
        if (count < muscleTopSets(muscle)) xp += xpPerSet(muscle);
      }
    }
    const day = dayKey(workout.startedAt);
    if (hasWorkingSet && !days.has(day)) {
      days.add(day);
      xp += XP_WORKOUT;
    }
  }

  xp += recordTimeline(workouts, exerciseById).length * XP_RECORD;
  if (weeklyGoal != null) {
    for (const count of weekWorkouts.values()) if (count >= weeklyGoal) xp += XP_GOAL;
  }
  return xp;
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

/** Najlepszy wynik każdej partii w historii, z wagą z dnia treningu, więc późniejsza zmiana wagi go nie obniża. */
function bestStrength(workouts, exerciseById, bodyWeights) {
  const best = new Map();
  if (!bodyWeights.length) return best;
  for (const workout of workouts) {
    const bodyKg = weightOn(bodyWeights, dayKey(workout.startedAt))?.kg;
    for (const item of workout.exercises) {
      const exercise = exerciseById(item.exerciseId);
      const top = STRENGTH_TOPS[item.exerciseId];
      if (!exercise || !top) continue;
      const norms = [[exercise.muscle, top], ...Object.entries(STRENGTH_ALSO[item.exerciseId] ?? {})];
      for (const set of item.sets) {
        if (!isWorking(set)) continue;
        const ratio = strengthRatio(exercise, set, bodyKg);
        for (const [muscle, norm] of norms) {
          const score = ratio / norm;
          if (score > (best.get(muscle)?.score ?? 0)) {
            best.set(muscle, { score, ratio, top: norm, exercise: exercise.name });
          }
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
    nextRatio: atTop ? null : (best.top * level) / (MAX_MUSCLE_LEVEL - 1),
  };
}

/** Poziom główny i poziomy partii, od najsłabszej. Partie bez wyniku są na końcu. */
export function levelProgress(workouts, exerciseById, { weeklyGoal = null, bodyWeights = [] } = {}) {
  const best = bestStrength(workouts, exerciseById, bodyWeights);
  const muscles = MUSCLES
    .filter((muscle) => muscle !== 'Całe ciało')
    .map((muscle) => muscleRow(muscle, best.get(muscle)))
    .sort((a, b) => (a.level == null) - (b.level == null) || (a.level + a.share) - (b.level + b.share));
  return { ...mainLevel(earnedXp(workouts, exerciseById, weeklyGoal)), muscles };
}

/** Co dał zapisany trening: różnica między historią z nim i bez niego. */
export function workoutGain(workouts, workout, exerciseById, options = {}) {
  const before = levelProgress(workouts.filter((w) => w.id !== workout.id), exerciseById, options);
  const after = levelProgress(workouts, exerciseById, options);
  const levelBefore = new Map(before.muscles.map((row) => [row.muscle, row.level ?? 0]));
  return {
    xp: after.xp - before.xp,
    before,
    after,
    muscleUps: after.muscles.filter((row) => row.level > levelBefore.get(row.muscle)),
  };
}
