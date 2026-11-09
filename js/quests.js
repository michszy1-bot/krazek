// Zadania tygodnia i pierwsze kroki. Zadania, tak jak XP, wynikają z historii, więc niczego nie trzeba zapisywać.
// Pierwsze kroki zależą też od ustawień, a raz wykonane zostają zapisane w ustawieniach, żeby XP nie znikało.

import { L } from './i18n.js';
import { addDays, dayKey, startOfWeek } from './format.js';
import { isRpe, isWorking, workingSetCount, workoutVolume } from './stats.js';

export const XP_QUEST = 100;
export const QUESTS_PER_WEEK = 3;
// Zadania liczą się od tygodnia, w którym pojawiły się w aplikacji, żeby dawna historia nie dała nagle punktów.
export const QUESTS_FROM = new Date(2026, 10, 9).getTime();

const LEGS = new Set(['Czworogłowe', 'Dwugłowe uda', 'Pośladki', 'Łydki']);
const NEW_EXERCISE_DAYS = 30;
const RPE_MIN_SETS = 6;

const workingSetsOf = (workout, test) => workout.exercises.reduce((sum, item) => sum + (test(item) ? item.sets.filter(isWorking).length : 0), 0);

/** Trening, w którym każda z co najmniej 6 serii roboczych ma ocenę wysiłku. */
function fullyRated(workout) {
  const sets = workout.exercises.flatMap((item) => item.sets.filter(isWorking));
  return sets.length >= RPE_MIN_SETS && sets.every((set) => isRpe(set.rpe));
}

/**
 * Pula zadań. Każde zwraca cel i postęp dla danego tygodnia. ctx: { week, before, exerciseById, records, weeklyGoal }.
 * eligible mówi, czy zadanie ma sens przy historii sprzed tygodnia, więc wybór nie zmienia się w trakcie tygodnia.
 */
const POOL = [
  {
    id: 'record',
    title: L('Pobij rekord w dowolnym ćwiczeniu', 'Beat a record in any exercise'),
    target: () => 1,
    progress: ({ records }) => records.length,
    eligible: ({ before }) => before.length > 0,
  },
  {
    id: 'rpe',
    title: L(`Oceń RPE we wszystkich seriach jednego treningu (min. ${RPE_MIN_SETS})`, `Rate RPE on every set of one workout (at least ${RPE_MIN_SETS})`),
    target: () => 1,
    progress: ({ week }) => week.filter(fullyRated).length,
  },
  {
    id: 'legs',
    title: L('Zrób 8 serii na nogi', 'Do 8 leg sets'),
    target: () => 8,
    progress: ({ week, exerciseById }) => week.reduce((sum, w) => sum + workingSetsOf(w, (item) => LEGS.has(exerciseById(item.exerciseId)?.muscle)), 0),
  },
  {
    id: 'core',
    title: L('Zrób 6 serii na brzuch', 'Do 6 ab sets'),
    target: () => 6,
    progress: ({ week, exerciseById }) => week.reduce((sum, w) => sum + workingSetsOf(w, (item) => exerciseById(item.exerciseId)?.muscle === 'Brzuch'), 0),
  },
  {
    id: 'muscles',
    title: L('Trenuj 6 różnych partii', 'Train 6 different muscles'),
    target: () => 6,
    progress: ({ week, exerciseById }) => new Set(week.flatMap((w) => w.exercises
      .filter((item) => item.sets.some(isWorking))
      .map((item) => exerciseById(item.exerciseId)?.muscle)
      .filter((muscle) => muscle && muscle !== 'Całe ciało'))).size,
  },
  {
    id: 'sets',
    title: (ctx) => L(`Zrób ${setsTarget(ctx)} serii roboczych`, `Do ${setsTarget(ctx)} working sets`),
    target: (ctx) => setsTarget(ctx),
    progress: ({ week }) => week.reduce((sum, w) => sum + workingSetCount(w), 0),
  },
  {
    id: 'comeback-exercise',
    title: L(`Zrób ćwiczenie, którego nie było od ${NEW_EXERCISE_DAYS} dni`, `Do an exercise you haven’t done for ${NEW_EXERCISE_DAYS} days`),
    target: () => 1,
    progress: ({ week, before, weekStart }) => {
      const recent = new Set(before
        .filter((w) => w.startedAt >= weekStart - NEW_EXERCISE_DAYS * 86400000)
        .flatMap((w) => w.exercises.map((item) => item.exerciseId)));
      return new Set(week.flatMap((w) => w.exercises.filter((item) => item.sets.some(isWorking)).map((item) => item.exerciseId))
        .filter((id) => !recent.has(id))).size > 0 ? 1 : 0;
    },
    eligible: ({ before }) => before.length > 0,
  },
  {
    id: 'volume',
    title: L('Przebij tonaż z zeszłego tygodnia', 'Beat last week’s volume'),
    target: ({ lastWeekVolume }) => Math.floor(lastWeekVolume) + 1,
    progress: ({ week }) => Math.round(week.reduce((sum, w) => sum + workoutVolume(w), 0)),
    eligible: ({ lastWeekVolume }) => lastWeekVolume > 0,
    unit: 'kg',
  },
];

/** 10 serii na każdy zaplanowany trening, a bez celu tak jak przy trzech treningach. */
const setsTarget = ({ weeklyGoal }) => 10 * (weeklyGoal ?? 3);

/** Prosty, stały skrót tekstu, żeby każdy tydzień miał swoje, zawsze te same zadania. */
function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Wybór zadań na tydzień: kolejność z pseudolosowego klucza, bez powtórzeń. */
function pick(candidates, key) {
  return [...candidates]
    .map((quest) => ({ quest, order: hash(`${key}|${quest.id}`) }))
    .sort((a, b) => a.order - b.order)
    .slice(0, QUESTS_PER_WEEK)
    .map(({ quest }) => quest);
}

export const QUEST_IDS = POOL.map((quest) => quest.id);

function questContext(workouts, exerciseById, weekStart, { weeklyGoal = null, records = [] }) {
  const start = startOfWeek(weekStart).getTime();
  const end = addDays(new Date(start), 7).getTime();
  const lastStart = addDays(new Date(start), -7).getTime();
  const before = workouts.filter((w) => w.startedAt < start);
  return {
    week: workouts.filter((w) => w.startedAt >= start && w.startedAt < end),
    before,
    weekStart: start,
    exerciseById,
    weeklyGoal,
    records: records.filter((entry) => entry.date >= start && entry.date < end),
    lastWeekVolume: before.filter((w) => w.startedAt >= lastStart).reduce((sum, w) => sum + workoutVolume(w), 0),
  };
}

function measure(quest, ctx) {
  const target = quest.target(ctx);
  const progress = quest.progress(ctx);
  return {
    id: quest.id,
    title: typeof quest.title === 'function' ? quest.title(ctx) : quest.title,
    target,
    progress: Math.min(progress, target),
    done: progress >= target,
    xp: XP_QUEST,
    unit: quest.unit ?? null,
    eligible: !quest.eligible || quest.eligible(ctx),
  };
}

/** Jedno zadanie z puli w danym tygodniu, niezależnie od tego, czy zostało wylosowane. Do testów i podpowiedzi. */
export function measureQuest(id, workouts, exerciseById, weekStart, options = {}) {
  return measure(POOL.find((quest) => quest.id === id), questContext(workouts, exerciseById, weekStart, options));
}

/**
 * Zadania tygodnia zaczynającego się od weekStart.
 * Zwraca [{ id, title, target, progress, done, xp, unit }].
 */
export function weekQuests(workouts, exerciseById, weekStart, options = {}) {
  const ctx = questContext(workouts, exerciseById, weekStart, options);
  const candidates = POOL.filter((quest) => !quest.eligible || quest.eligible(ctx));
  return pick(candidates, dayKey(new Date(ctx.weekStart))).map((quest) => measure(quest, ctx));
}

/** Wykonane zadania ze wszystkich tygodni od wprowadzenia zadań: [{ key: 'tydzień|zadanie', week, quest }]. */
export function doneQuests(workouts, exerciseById, options = {}, now = Date.now()) {
  const done = [];
  const latest = Math.max(now, ...workouts.map((w) => w.startedAt));
  for (let week = startOfWeek(QUESTS_FROM); week.getTime() <= latest; week = addDays(week, 7)) {
    const weekEnd = addDays(week, 7).getTime();
    if (!workouts.some((w) => w.startedAt >= week.getTime() && w.startedAt < weekEnd)) continue;
    for (const quest of weekQuests(workouts, exerciseById, week, options)) {
      if (quest.done) done.push({ key: `${dayKey(week)}|${quest.id}`, week: week.getTime(), quest });
    }
  }
  return done;
}

// --- Pierwsze kroki ---

export const XP_FIRST_STEP = 50;

export const FIRST_STEPS = [
  { id: 'goal', title: L('Ustaw cel tygodniowy', 'Set a weekly goal'), hint: L('Na ekranie Trening albo w Ustawieniach.', 'On the Workout screen or in Settings.') },
  { id: 'weight', title: L('Wpisz swoją wagę', 'Log your body weight'), hint: L('W profilu, przycisk „Dodaj wagę”.', 'In Profile, tap “Add weight”.') },
  { id: 'routine', title: L('Zapisz pierwszą rutynę', 'Save your first routine'), hint: L('Na ekranie Trening albo z zapisanego treningu.', 'On the Workout screen or from a saved workout.') },
  { id: 'rpe', title: L('Oceń wysiłek serii (RPE)', 'Rate the effort of a set (RPE)'), hint: L('Po odhaczeniu serii wybierz liczbę od 6 do 10.', 'After ticking a set, pick a number from 6 to 10.') },
  { id: 'backup', title: L('Zrób kopię zapasową', 'Make a backup'), hint: L('W Ustawieniach, sekcja Kopia zapasowa.', 'In Settings, under Backup.') },
  { id: 'home', title: L('Dodaj Formę do ekranu głównego', 'Add Forma to your Home Screen'), hint: L('W Safari: Udostępnij → Do ekranu początkowego, potem otwórz Formę z ikony.', 'In Safari: Share → Add to Home Screen, then open Forma from the icon.') },
];

/** Czy aplikacja działa jako osobna aplikacja z ekranu głównego, a nie w karcie przeglądarki. */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.navigator.standalone === true || Boolean(window.matchMedia?.('(display-mode: standalone)').matches);
}

/** Kroki wykonane według obecnego stanu aplikacji. */
export function liveFirstSteps({ settings, bodyWeights, routines, workouts, lastBackupAt }, standalone = isStandalone()) {
  const done = new Set();
  if (settings.weeklyGoal != null) done.add('goal');
  if (bodyWeights.length) done.add('weight');
  if (routines.length) done.add('routine');
  if (workouts.some((w) => w.exercises.some((item) => item.sets.some((set) => isRpe(set.rpe))))) done.add('rpe');
  if (lastBackupAt) done.add('backup');
  if (standalone) done.add('home');
  return done;
}

/** Kroki raz wykonane, z zapisu w ustawieniach i z obecnego stanu. */
export function firstStepsDone(stored = {}, live = new Set()) {
  return FIRST_STEPS.map((step) => step.id).filter((id) => stored[id] || live.has(id));
}
