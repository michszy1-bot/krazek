// Osiągnięcia. Wynikają z historii tak jak reszta XP, więc nic nie trzeba zapisywać, a wcześniejsze treningi też się liczą.
// Nagroda jest stała i nie ma mnożnika za serię, żeby nie zależała od tygodnia, w którym wpadła.

import { weightOn } from './body.js';
import { MUSCLES, musclesOf } from './exercises.js';
import { dayKey, startOfDay, startOfWeek } from './format.js';
import { bestStreak, isWorking, muscleLevel, plateTier, workingSetCount, workoutVolume } from './stats.js';

const EARLY_BEFORE_HOUR = 7;
const LATE_FROM_HOUR = 22;
const COMEBACK_DAYS = 30;
const RED_PLATE_SETS = 20;
// Najwyższy poziom koloru na mapie mięśni, czyli zielony.
const GREEN_LEVEL = 4;
const HOUR_MS = 3600000;
const LIFT_OF = new Map([['squat', 'squat'], ['bench-press', 'bench'], ['deadlift', 'deadlift'], ['sumo-deadlift', 'deadlift']]);
const TRAINED_MUSCLES = MUSCLES.filter((muscle) => muscle !== 'Całe ciało');

const achievement = (id, group, name, stat, target, xp, extra = {}) => ({ id, group, name, stat, target, xp, ...extra });
const tons = { unit: ' ton', scale: 1000 };
const kilos = { unit: ' kg' };
const parts = { unit: ' partii' };
const bigLift = { detail: 'W przysiadzie ze sztangą lub martwym ciągu', ...kilos };
const benchLift = { detail: 'Sztanga na ławce płaskiej', ...kilos };
const dumbbell = { detail: 'Na rękę, w dowolnym ćwiczeniu z hantlami', ...kilos };
const threeLifts = { detail: 'Najlepsze ciężary z przysiadu, ławki i martwego ciągu', ...kilos };
const ofBody = { unit: '% masy ciała', needs: 'weight' };

export const ACHIEVEMENT_GROUPS = ['Treningi', 'Seria tygodni', 'Łączny tonaż', 'Rekordy', 'Siła', 'Siła względem wagi', 'Trzy boje', 'Krążki i mapa', 'Jeden trening', 'Wytrwałość', 'Okazje'];

export const ACHIEVEMENTS = [
  achievement('workouts-1', 'Treningi', 'Pierwszy trening', 'workouts', 1, 50),
  achievement('workouts-10', 'Treningi', '10 treningów', 'workouts', 10, 150),
  achievement('workouts-50', 'Treningi', '50 treningów', 'workouts', 50, 500),
  achievement('workouts-100', 'Treningi', '100 treningów', 'workouts', 100, 1000),
  achievement('workouts-250', 'Treningi', '250 treningów', 'workouts', 250, 2000),

  achievement('streak-4', 'Seria tygodni', '4 tygodnie z rzędu', 'streak', 4, 300, { needs: 'goal' }),
  achievement('streak-12', 'Seria tygodni', '12 tygodni z rzędu', 'streak', 12, 800, { needs: 'goal' }),
  achievement('streak-26', 'Seria tygodni', '26 tygodni z rzędu', 'streak', 26, 2000, { needs: 'goal' }),
  achievement('streak-52', 'Seria tygodni', '52 tygodnie z rzędu', 'streak', 52, 5000, { needs: 'goal' }),

  achievement('tonnage-100', 'Łączny tonaż', '100 ton', 'tonnage', 100000, 300, tons),
  achievement('tonnage-500', 'Łączny tonaż', '500 ton', 'tonnage', 500000, 1000, tons),
  achievement('tonnage-1000', 'Łączny tonaż', '1000 ton', 'tonnage', 1000000, 2500, tons),

  achievement('records-10', 'Rekordy', '10 rekordów', 'records', 10, 200),
  achievement('records-50', 'Rekordy', '50 rekordów', 'records', 50, 800),
  achievement('records-100', 'Rekordy', '100 rekordów', 'records', 100, 1500),

  achievement('lift-100', 'Siła', 'Pierwsza setka', 'bigLift', 100, 500, bigLift),
  achievement('lift-150', 'Siła', 'Półtorej setki', 'bigLift', 150, 1000, bigLift),
  achievement('lift-200', 'Siła', 'Dwie setki', 'bigLift', 200, 2500, bigLift),
  achievement('bench-100', 'Siła', 'Setka na ławce', 'bench', 100, 1000, benchLift),
  achievement('bench-120', 'Siła', 'Ławka 120 kg', 'bench', 120, 2000, benchLift),
  achievement('dumbbell-30', 'Siła', 'Hantel 30 kg', 'dumbbell', 30, 500, dumbbell),
  achievement('dumbbell-40', 'Siła', 'Hantel 40 kg', 'dumbbell', 40, 1000, dumbbell),

  achievement('body-bench', 'Siła względem wagi', 'Ławka równa masie ciała', 'benchShare', 100, 500, { detail: 'Sztanga na ławce płaskiej', ...ofBody }),
  achievement('body-squat', 'Siła względem wagi', 'Przysiad 1,5× masa ciała', 'squatShare', 150, 1000, { detail: 'Przysiad ze sztangą', ...ofBody }),
  achievement('body-deadlift', 'Siła względem wagi', 'Martwy ciąg 2× masa ciała', 'deadliftShare', 200, 1500, { detail: 'Klasyczny lub sumo', ...ofBody }),

  achievement('total-300', 'Trzy boje', 'Suma 300 kg', 'threeLifts', 300, 500, threeLifts),
  achievement('total-400', 'Trzy boje', 'Suma 400 kg', 'threeLifts', 400, 1000, threeLifts),
  achievement('total-500', 'Trzy boje', 'Suma 500 kg', 'threeLifts', 500, 2500, threeLifts),

  achievement('red-plate', 'Krążki i mapa', 'Czerwony krążek', 'mostSets', RED_PLATE_SETS, 200, { detail: 'Trening z co najmniej 20 seriami', unit: ' serii' }),
  achievement('red-bar', 'Krążki i mapa', 'Czerwona sztanga', 'redBar', 1, 1000, { detail: 'Cel tygodnia wykonany i same czerwone krążki', needs: 'goal' }),
  achievement('all-muscles', 'Krążki i mapa', 'Cała mapa', 'muscles', TRAINED_MUSCLES.length, 300, { detail: 'Seria na każdą partię w jednym tygodniu', ...parts }),
  achievement('green-map', 'Krążki i mapa', 'Zielona mapa', 'greenMuscles', TRAINED_MUSCLES.length, 1000, { detail: 'Wszystkie partie zielone w jednym tygodniu', ...parts }),

  achievement('workout-10t', 'Jeden trening', '10 ton w treningu', 'heaviestWorkout', 10000, 300, tons),
  achievement('workout-records', 'Jeden trening', '5 rekordów w treningu', 'recordsInWorkout', 5, 500, { detail: 'Rekord w 5 ćwiczeniach jednego treningu' }),

  achievement('hours-100', 'Wytrwałość', '100 godzin treningu', 'hours', 100 * HOUR_MS, 1000, { unit: ' godzin', scale: HOUR_MS }),
  achievement('sets-1000', 'Wytrwałość', '1000 serii', 'sets', 1000, 500),
  achievement('sets-5000', 'Wytrwałość', '5000 serii', 'sets', 5000, 1500),
  achievement('exercises-25', 'Wytrwałość', '25 różnych ćwiczeń', 'exercises', 25, 200),

  achievement('early', 'Okazje', 'Ranny ptak', 'early', 1, 100, { detail: `Trening rozpoczęty przed ${EARLY_BEFORE_HOUR}:00` }),
  achievement('late', 'Okazje', 'Nocna zmiana', 'late', 1, 100, { detail: `Trening rozpoczęty od ${LATE_FROM_HOUR}:00` }),
  achievement('comeback', 'Okazje', 'Powrót', 'comeback', 1, 200, { detail: `Trening po co najmniej ${COMEBACK_DAYS} dniach przerwy` }),
  achievement('new-year', 'Okazje', 'Nowy Rok', 'newYear', 1, 200, { detail: 'Trening 1 stycznia' }),
];

/** Kolor krążka jak na sztandze: im większa nagroda, tym cięższy krążek. */
export function rewardTier(xp) {
  if (xp > 2000) return 'red';
  if (xp >= 1000) return 'blue';
  if (xp >= 300) return 'yellow';
  return 'green';
}

const hasWorkingSet = (workout) => workout.exercises.some((item) => item.sets.some(isWorking));

/** Najlepsze prawdziwe ciężary w seriach roboczych, także jako procent wagi z dnia treningu. */
function liftBests(workouts, exerciseById, bodyWeights) {
  const best = { squat: 0, bench: 0, deadlift: 0, squatShare: 0, benchShare: 0, deadliftShare: 0, dumbbell: 0 };
  for (const workout of workouts) {
    const bodyKg = weightOn(bodyWeights, dayKey(workout.startedAt))?.kg;
    for (const item of workout.exercises) {
      const lift = LIFT_OF.get(item.exerciseId);
      const isDumbbell = exerciseById(item.exerciseId)?.equipment === 'Hantle';
      for (const set of item.sets) {
        if (!isWorking(set) || !(set.reps > 0) || !(set.weight > 0)) continue;
        if (isDumbbell) best.dumbbell = Math.max(best.dumbbell, set.weight);
        if (!lift) continue;
        best[lift] = Math.max(best[lift], set.weight);
        if (bodyKg) best[`${lift}Share`] = Math.max(best[`${lift}Share`], (set.weight * 100) / bodyKg);
      }
    }
  }
  return {
    ...best,
    bigLift: Math.max(best.squat, best.deadlift),
    threeLifts: best.squat + best.bench + best.deadlift,
  };
}

/** Najlepsze tygodnie: partie z własnym ćwiczeniem, partie zielone jak na mapie i sztanga z samych czerwonych krążków. */
function weekBests(workouts, exerciseById, weeklyGoal) {
  const weeks = new Map();
  for (const workout of workouts) {
    const key = dayKey(startOfWeek(workout.startedAt));
    const week = weeks.get(key) ?? { trained: new Set(), sets: new Map(), plates: [] };
    weeks.set(key, week);
    week.plates.push(workingSetCount(workout));
    for (const item of workout.exercises) {
      const exercise = exerciseById(item.exerciseId);
      const count = item.sets.filter(isWorking).length;
      if (count && TRAINED_MUSCLES.includes(exercise?.muscle)) week.trained.add(exercise.muscle);
      for (const [muscle, share] of musclesOf(exercise)) week.sets.set(muscle, (week.sets.get(muscle) ?? 0) + count * share);
    }
  }
  const list = [...weeks.values()];
  const greens = ({ sets }) => TRAINED_MUSCLES.filter((muscle) => muscleLevel(sets.get(muscle) ?? 0, muscle) === GREEN_LEVEL).length;
  const allRed = ({ plates }) => plates.length >= weeklyGoal && plates.every((sets) => plateTier(sets) === 'red');
  return {
    muscles: Math.max(0, ...list.map(({ trained }) => trained.size)),
    greenMuscles: Math.max(0, ...list.map(greens)),
    redBar: weeklyGoal != null && list.some(allRed) ? 1 : 0,
  };
}

/** Liczniki z całej historii. Trening bez serii roboczej się nie liczy, tak jak przy XP. */
function habitStats(workouts) {
  const stats = { workouts: 0, tonnage: 0, heaviestWorkout: 0, mostSets: 0, sets: 0, hours: 0, early: 0, late: 0, comeback: 0, newYear: 0 };
  const exercises = new Set();
  let previousDay = null;
  for (const workout of [...workouts].filter(hasWorkingSet).sort((a, b) => a.startedAt - b.startedAt)) {
    const volume = workoutVolume(workout);
    const sets = workingSetCount(workout);
    const started = new Date(workout.startedAt);
    const day = startOfDay(started);
    stats.workouts += 1;
    stats.tonnage += volume;
    stats.heaviestWorkout = Math.max(stats.heaviestWorkout, volume);
    stats.mostSets = Math.max(stats.mostSets, sets);
    stats.sets += sets;
    stats.hours += Math.max(0, (workout.endedAt ?? workout.startedAt) - workout.startedAt);
    if (started.getHours() < EARLY_BEFORE_HOUR) stats.early = 1;
    if (started.getHours() >= LATE_FROM_HOUR) stats.late = 1;
    if (started.getMonth() === 0 && started.getDate() === 1) stats.newYear = 1;
    if (previousDay && Math.round((day - previousDay) / 86400000) >= COMEBACK_DAYS) stats.comeback = 1;
    previousDay = day;
    for (const item of workout.exercises) if (item.sets.some(isWorking)) exercises.add(item.exerciseId);
  }
  return { ...stats, exercises: exercises.size };
}

function recordStats(records) {
  const inWorkout = new Map();
  for (const { workoutId } of records) inWorkout.set(workoutId, (inWorkout.get(workoutId) ?? 0) + 1);
  return { records: records.length, recordsInWorkout: Math.max(0, ...inWorkout.values()) };
}

/**
 * Każde osiągnięcie ze stanem: ile już jest i czy zdobyte.
 * Rekordy przychodzą z zewnątrz, bo ich liczenie jest najcięższe.
 */
export function achievementProgress(workouts, exerciseById, { weeklyGoal = null, shieldedWeeks = [], bodyWeights = [], records = [] } = {}) {
  const stats = {
    ...habitStats(workouts),
    ...liftBests(workouts, exerciseById, bodyWeights),
    ...weekBests(workouts, exerciseById, weeklyGoal),
    ...recordStats(records),
    streak: bestStreak(workouts, weeklyGoal, shieldedWeeks),
  };
  return ACHIEVEMENTS.map((item) => ({ ...item, value: stats[item.stat], done: stats[item.stat] >= item.target }));
}

export const achievementXp = (progress) => progress.reduce((sum, item) => sum + (item.done ? item.xp : 0), 0);
