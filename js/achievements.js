// Osiągnięcia. Wynikają z historii tak jak reszta XP, więc nic nie trzeba zapisywać, a wcześniejsze treningi też się liczą.
// Nagroda jest stała i nie ma mnożnika za serię, żeby nie zależała od tygodnia, w którym wpadła.

import { MUSCLES } from './exercises.js';
import { dayKey, startOfWeek } from './format.js';
import { bestStreak, isWorking, workoutVolume } from './stats.js';

const EARLY_BEFORE_HOUR = 7;
const LATE_FROM_HOUR = 22;
const BIG_LIFTS = new Set(['squat', 'deadlift', 'sumo-deadlift']);
const TRAINED_MUSCLES = MUSCLES.filter((muscle) => muscle !== 'Całe ciało');

const achievement = (id, group, name, stat, target, xp, extra = {}) => ({ id, group, name, stat, target, xp, ...extra });
const tons = { unit: 'ton', scale: 1000 };
const kilos = { unit: 'kg' };
const bigLift = { detail: 'W przysiadzie ze sztangą lub martwym ciągu', ...kilos };
const dumbbell = { detail: 'Na rękę, w dowolnym ćwiczeniu z hantlami', ...kilos };

export const ACHIEVEMENT_GROUPS = ['Treningi', 'Seria tygodni', 'Łączny tonaż', 'Rekordy', 'Siła', 'Pozostałe'];

export const ACHIEVEMENTS = [
  achievement('workouts-1', 'Treningi', 'Pierwszy trening', 'workouts', 1, 50),
  achievement('workouts-10', 'Treningi', '10 treningów', 'workouts', 10, 150),
  achievement('workouts-50', 'Treningi', '50 treningów', 'workouts', 50, 500),
  achievement('workouts-100', 'Treningi', '100 treningów', 'workouts', 100, 1000),
  achievement('workouts-250', 'Treningi', '250 treningów', 'workouts', 250, 2000),

  achievement('streak-4', 'Seria tygodni', '4 tygodnie z rzędu', 'streak', 4, 300),
  achievement('streak-12', 'Seria tygodni', '12 tygodni z rzędu', 'streak', 12, 800),
  achievement('streak-26', 'Seria tygodni', '26 tygodni z rzędu', 'streak', 26, 2000),
  achievement('streak-52', 'Seria tygodni', '52 tygodnie z rzędu', 'streak', 52, 5000),

  achievement('tonnage-100', 'Łączny tonaż', '100 ton', 'tonnage', 100000, 300, tons),
  achievement('tonnage-500', 'Łączny tonaż', '500 ton', 'tonnage', 500000, 1000, tons),
  achievement('tonnage-1000', 'Łączny tonaż', '1000 ton', 'tonnage', 1000000, 2500, tons),

  achievement('records-10', 'Rekordy', '10 rekordów', 'records', 10, 200),
  achievement('records-50', 'Rekordy', '50 rekordów', 'records', 50, 800),
  achievement('records-100', 'Rekordy', '100 rekordów', 'records', 100, 1500),

  achievement('lift-100', 'Siła', 'Pierwsza setka', 'bigLift', 100, 500, bigLift),
  achievement('lift-150', 'Siła', 'Półtorej setki', 'bigLift', 150, 1000, bigLift),
  achievement('bench-100', 'Siła', 'Setka na ławce', 'bench', 100, 1000, { detail: 'Sztanga na ławce płaskiej', ...kilos }),
  achievement('dumbbell-30', 'Siła', 'Hantel 30 kg', 'dumbbell', 30, 500, dumbbell),
  achievement('dumbbell-40', 'Siła', 'Hantel 40 kg', 'dumbbell', 40, 1000, dumbbell),

  achievement('all-muscles', 'Pozostałe', 'Cała mapa', 'muscles', TRAINED_MUSCLES.length, 300, { detail: 'Seria na każdą partię w jednym tygodniu' }),
  achievement('early', 'Pozostałe', 'Ranny ptak', 'early', 1, 100, { detail: `Trening rozpoczęty przed ${EARLY_BEFORE_HOUR}:00` }),
  achievement('late', 'Pozostałe', 'Nocna zmiana', 'late', 1, 100, { detail: `Trening rozpoczęty od ${LATE_FROM_HOUR}:00` }),
];

/** Kolor krążka jak na sztandze: im większa nagroda, tym cięższy krążek. */
export function rewardTier(xp) {
  if (xp > 2000) return 'red';
  if (xp >= 1000) return 'blue';
  if (xp >= 300) return 'yellow';
  return 'green';
}

/** Wszystko, co liczą osiągnięcia. Rekordy przychodzą z zewnątrz, bo ich liczenie jest najcięższe. */
function achievementStats(workouts, exerciseById, { weeklyGoal, shieldedWeeks, records }) {
  const stats = { workouts: 0, streak: bestStreak(workouts, weeklyGoal, shieldedWeeks), tonnage: 0, records, bigLift: 0, bench: 0, dumbbell: 0, muscles: 0, early: 0, late: 0 };
  const weekMuscles = new Map();

  for (const workout of workouts) {
    const week = dayKey(startOfWeek(workout.startedAt));
    const trained = weekMuscles.get(week) ?? new Set();
    weekMuscles.set(week, trained);
    let hasWorkingSet = false;
    for (const item of workout.exercises) {
      const exercise = exerciseById(item.exerciseId);
      for (const set of item.sets) {
        if (!isWorking(set)) continue;
        hasWorkingSet = true;
        if (TRAINED_MUSCLES.includes(exercise?.muscle)) trained.add(exercise.muscle);
        if (!(set.reps > 0) || !(set.weight > 0)) continue;
        if (BIG_LIFTS.has(item.exerciseId)) stats.bigLift = Math.max(stats.bigLift, set.weight);
        if (item.exerciseId === 'bench-press') stats.bench = Math.max(stats.bench, set.weight);
        if (exercise?.equipment === 'Hantle') stats.dumbbell = Math.max(stats.dumbbell, set.weight);
      }
    }
    if (!hasWorkingSet) continue;
    stats.workouts += 1;
    stats.tonnage += workoutVolume(workout);
    const hour = new Date(workout.startedAt).getHours();
    if (hour < EARLY_BEFORE_HOUR) stats.early = 1;
    if (hour >= LATE_FROM_HOUR) stats.late = 1;
  }

  stats.muscles = Math.max(0, ...[...weekMuscles.values()].map((trained) => trained.size));
  return stats;
}

/** Każde osiągnięcie ze stanem: ile już jest i czy zdobyte. */
export function achievementProgress(workouts, exerciseById, { weeklyGoal = null, shieldedWeeks = [], records = 0 } = {}) {
  const stats = achievementStats(workouts, exerciseById, { weeklyGoal, shieldedWeeks, records });
  return ACHIEVEMENTS.map((item) => ({ ...item, value: stats[item.stat], done: stats[item.stat] >= item.target }));
}

export const achievementXp = (progress) => progress.reduce((sum, item) => sum + (item.done ? item.xp : 0), 0);
