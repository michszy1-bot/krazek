// Osiągnięcia. Wynikają z historii tak jak reszta XP, więc nic nie trzeba zapisywać, a wcześniejsze treningi też się liczą.
// Nagroda jest stała i nie ma mnożnika za serię, żeby nie zależała od tygodnia, w którym wpadła.

import { weightOn } from './body.js';
import { isEnglish, L } from './i18n.js';
import { MUSCLES, musclesOf } from './exercises.js';
import { dayKey, startOfDay, startOfWeek } from './format.js';
import { bestStreak, isWorking, muscleLevel, plateTier, recordTimeline, workingSetCount, workoutVolume } from './stats.js';

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
const tons = { unit: L(' ton', ' t'), scale: 1000 };
const kilos = { unit: ' kg' };
const parts = { unit: L(' partii', ' muscles') };
const bigLift = { detail: L('W przysiadzie ze sztangą lub martwym ciągu', 'In the barbell squat or deadlift'), ...kilos };
const benchLift = { detail: L('Sztanga na ławce płaskiej', 'Flat barbell bench press'), ...kilos };
const dumbbell = { detail: L('Na rękę, w dowolnym ćwiczeniu z hantlami', 'Per hand, in any dumbbell exercise'), ...kilos };
const threeLifts = { detail: L('Najlepsze ciężary z przysiadu, ławki i martwego ciągu', 'Best squat, bench and deadlift added together'), ...kilos };
const ofBody = { unit: L('% masy ciała', '% of body weight'), needs: 'weight' };

const GROUP_NAMES_EN = {
  Treningi: 'Workouts',
  'Seria tygodni': 'Week streak',
  'Łączny tonaż': 'Total tonnage',
  Rekordy: 'Records',
  Siła: 'Strength',
  'Siła względem wagi': 'Strength for your weight',
  'Trzy boje': 'Big three',
  'Krążki i mapa': 'Plates and map',
  'Jeden trening': 'Single workout',
  Wytrwałość: 'Persistence',
  Okazje: 'Occasions',
};

/** Nazwa grupy na ekranie. Polskie nazwy zostają kluczami, bo od nich zależy kształt medalu. */
export const groupName = (group) => (isEnglish() ? GROUP_NAMES_EN[group] ?? group : group);

export const ACHIEVEMENT_GROUPS = ['Treningi', 'Seria tygodni', 'Łączny tonaż', 'Rekordy', 'Siła', 'Siła względem wagi', 'Trzy boje', 'Krążki i mapa', 'Jeden trening', 'Wytrwałość', 'Okazje'];

export const ACHIEVEMENTS = [
  achievement('workouts-1', 'Treningi', L("Pierwszy trening", "First workout"), 'workouts', 1, 50),
  achievement('workouts-10', 'Treningi', L("10 treningów", "10 workouts"), 'workouts', 10, 150),
  achievement('workouts-50', 'Treningi', L("50 treningów", "50 workouts"), 'workouts', 50, 500),
  achievement('workouts-100', 'Treningi', L("100 treningów", "100 workouts"), 'workouts', 100, 1000),
  achievement('workouts-250', 'Treningi', L("250 treningów", "250 workouts"), 'workouts', 250, 2000),

  achievement('streak-4', 'Seria tygodni', L("4 tygodnie z rzędu", "4 weeks in a row"), 'streak', 4, 300, { needs: 'goal' }),
  achievement('streak-12', 'Seria tygodni', L("12 tygodni z rzędu", "12 weeks in a row"), 'streak', 12, 800, { needs: 'goal' }),
  achievement('streak-26', 'Seria tygodni', L("26 tygodni z rzędu", "26 weeks in a row"), 'streak', 26, 2000, { needs: 'goal' }),
  achievement('streak-52', 'Seria tygodni', L("52 tygodnie z rzędu", "52 weeks in a row"), 'streak', 52, 5000, { needs: 'goal' }),

  achievement('tonnage-100', 'Łączny tonaż', L("100 ton", "100 tonnes"), 'tonnage', 100000, 300, tons),
  achievement('tonnage-500', 'Łączny tonaż', L("500 ton", "500 tonnes"), 'tonnage', 500000, 1000, tons),
  achievement('tonnage-1000', 'Łączny tonaż', L("1000 ton", "1000 tonnes"), 'tonnage', 1000000, 2500, tons),

  achievement('records-10', 'Rekordy', L("10 rekordów", "10 records"), 'records', 10, 200),
  achievement('records-50', 'Rekordy', L("50 rekordów", "50 records"), 'records', 50, 800),
  achievement('records-100', 'Rekordy', L("100 rekordów", "100 records"), 'records', 100, 1500),

  achievement('lift-100', 'Siła', L("Pierwsza setka", "First 100 kg"), 'bigLift', 100, 500, bigLift),
  achievement('lift-150', 'Siła', L("Półtorej setki", "150 kg lift"), 'bigLift', 150, 1000, bigLift),
  achievement('lift-200', 'Siła', L("Dwie setki", "200 kg lift"), 'bigLift', 200, 2500, bigLift),
  achievement('bench-100', 'Siła', L("Setka na ławce", "100 kg bench"), 'bench', 100, 1000, benchLift),
  achievement('bench-120', 'Siła', L("Ławka 120 kg", "120 kg bench"), 'bench', 120, 2000, benchLift),
  achievement('dumbbell-30', 'Siła', L("Hantel 30 kg", "30 kg dumbbell"), 'dumbbell', 30, 500, dumbbell),
  achievement('dumbbell-40', 'Siła', L("Hantel 40 kg", "40 kg dumbbell"), 'dumbbell', 40, 1000, dumbbell),

  achievement('body-bench', 'Siła względem wagi', L("Ławka równa masie ciała", "Bodyweight bench"), 'benchShare', 100, 500, { detail: L('Sztanga na ławce płaskiej', 'Flat barbell bench press'), ...ofBody }),
  achievement('body-squat', 'Siła względem wagi', L("Przysiad 1,5× masa ciała", "1.5× bodyweight squat"), 'squatShare', 150, 1000, { detail: L("Przysiad ze sztangą", "Barbell squat"), ...ofBody }),
  achievement('body-deadlift', 'Siła względem wagi', L("Martwy ciąg 2× masa ciała", "2× bodyweight deadlift"), 'deadliftShare', 200, 1500, { detail: L("Klasyczny lub sumo", "Conventional or sumo"), ...ofBody }),

  achievement('total-300', 'Trzy boje', L("Suma 300 kg", "300 kg total"), 'threeLifts', 300, 500, threeLifts),
  achievement('total-400', 'Trzy boje', L("Suma 400 kg", "400 kg total"), 'threeLifts', 400, 1000, threeLifts),
  achievement('total-500', 'Trzy boje', L("Suma 500 kg", "500 kg total"), 'threeLifts', 500, 2500, threeLifts),

  achievement('red-plate', 'Krążki i mapa', L("Czerwony krążek", "Red plate"), 'mostSets', RED_PLATE_SETS, 200, { detail: L("Trening z co najmniej 20 seriami", "A workout with 20 or more sets"), unit: L(' serii', ' sets') }),
  achievement('red-bar', 'Krążki i mapa', L("Czerwona sztanga", "Red bar"), 'redBar', 1, 1000, { detail: L("Cel tygodnia wykonany i same czerwone krążki", "Weekly goal met with only red plates"), needs: 'goal' }),
  achievement('all-muscles', 'Krążki i mapa', L("Cała mapa", "Full map"), 'muscles', TRAINED_MUSCLES.length, 300, { detail: L("Seria na każdą partię w jednym tygodniu", "A set for every muscle in one week"), ...parts }),
  achievement('green-map', 'Krążki i mapa', L("Zielona mapa", "Green map"), 'greenMuscles', TRAINED_MUSCLES.length, 1000, { detail: L("Wszystkie partie zielone w jednym tygodniu", "Every muscle green in one week"), ...parts }),

  achievement('workout-10t', 'Jeden trening', L("10 ton w treningu", "10 tonnes in a workout"), 'heaviestWorkout', 10000, 300, tons),
  achievement('workout-records', 'Jeden trening', L("5 rekordów w treningu", "5 records in a workout"), 'recordsInWorkout', 5, 500, { detail: L("Rekord w 5 ćwiczeniach jednego treningu", "Records in 5 exercises in one workout") }),

  achievement('hours-100', 'Wytrwałość', L("100 godzin treningu", "100 hours of training"), 'hours', 100 * HOUR_MS, 1000, { unit: L(' godzin', ' hours'), scale: HOUR_MS }),
  achievement('sets-1000', 'Wytrwałość', L("1000 serii", "1000 sets"), 'sets', 1000, 500),
  achievement('sets-5000', 'Wytrwałość', L("5000 serii", "5000 sets"), 'sets', 5000, 1500),
  achievement('exercises-25', 'Wytrwałość', L("25 różnych ćwiczeń", "25 different exercises"), 'exercises', 25, 200),

  achievement('early', 'Okazje', L("Ranny ptak", "Early bird"), 'early', 1, 100, { detail: L(`Trening rozpoczęty przed ${EARLY_BEFORE_HOUR}:00`, `A workout started before ${EARLY_BEFORE_HOUR}:00`) }),
  achievement('late', 'Okazje', L("Nocna zmiana", "Night shift"), 'late', 1, 100, { detail: L(`Trening rozpoczęty od ${LATE_FROM_HOUR}:00`, `A workout started at ${LATE_FROM_HOUR}:00 or later`) }),
  achievement('comeback', 'Okazje', L("Powrót", "Comeback"), 'comeback', 1, 200, { detail: L(`Trening po co najmniej ${COMEBACK_DAYS} dniach przerwy`, `A workout after a break of ${COMEBACK_DAYS} days or more`) }),
  achievement('new-year', 'Okazje', L("Nowy Rok", "New Year"), 'newYear', 1, 200, { detail: L("Trening 1 stycznia", "A workout on 1 January") }),
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

/**
 * Początek treningu, który dał osiągnięcie, albo null. Liczone tylko po stuknięciu w odznakę:
 * nowe treningi nie zabierają osiągnięcia, więc najkrótszy fragment historii da się znaleźć przez połowienie.
 */
export function achievementDate(workouts, exerciseById, options, id) {
  const sorted = [...workouts].sort((a, b) => a.startedAt - b.startedAt);
  const hasIt = (count) => {
    const part = sorted.slice(0, count);
    const records = recordTimeline(part, exerciseById);
    return achievementProgress(part, exerciseById, { ...options, records }).find((item) => item.id === id).done;
  };
  if (!sorted.length || !hasIt(sorted.length)) return null;
  let low = 1;
  let high = sorted.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (hasIt(middle)) high = middle;
    else low = middle + 1;
  }
  return sorted[low - 1].startedAt;
}
