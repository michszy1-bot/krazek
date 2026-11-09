import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SEED_EXERCISES } from '../js/exercises.js';
import { doneQuests, FIRST_STEPS, firstStepsDone, liveFirstSteps, measureQuest, QUEST_IDS, QUESTS_FROM, QUESTS_PER_WEEK, weekQuests, XP_FIRST_STEP, XP_QUEST } from '../js/quests.js';
import { previousSeason, SEASON_TIERS, seasonHistory, seasonMedals, seasonOf, seasonTier, seasonTotals, seasonXp, SEASONS_FROM } from '../js/seasons.js';
import { muscleRecovery, recordTimeline, recoveryColour } from '../js/stats.js';
import { levelProgress, workoutGain } from '../js/level.js';
import { buildBackup, parseBackup } from '../js/backup.js';
import { badgeMarkup, seasonBadgeItem } from '../js/badges.js';

const byId = new Map(SEED_EXERCISES.map((exercise) => [exercise.id, exercise]));
const exerciseById = (id) => byId.get(id);
const set = (weight, reps, extra = {}) => ({ weight, reps, seconds: null, kind: 'normal', ...extra });
const sets = (count, weight, reps, extra) => Array.from({ length: count }, () => set(weight, reps, extra));
let counter = 0;
const workout = (date, items, hours = 1) => {
  counter += 1;
  const startedAt = new Date(date).getTime();
  return {
    id: `w${counter}`,
    name: 'Trening',
    startedAt,
    endedAt: startedAt + hours * 3600000,
    note: '',
    exercises: Object.entries(items).map(([exerciseId, list]) => ({ exerciseId, note: '', sets: list })),
  };
};

// Poniedziałek 16 listopada 2026, czyli drugi tydzień z zadaniami.
const WEEK = new Date(2026, 10, 16);
const inWeek = (day, hour = 18) => new Date(2026, 10, 16 + day, hour);

test('zadania tygodnia: zawsze trzy różne i te same przy każdym liczeniu', () => {
  const history = [workout(new Date(2026, 10, 10, 18), { 'bench-press': sets(3, 60, 8) })];
  const first = weekQuests(history, exerciseById, WEEK);
  const again = weekQuests(history, exerciseById, inWeek(4));
  assert.equal(first.length, QUESTS_PER_WEEK);
  assert.equal(new Set(first.map((quest) => quest.id)).size, QUESTS_PER_WEEK);
  assert.deepEqual(first.map((quest) => quest.id), again.map((quest) => quest.id));
  assert.ok(first.every((quest) => QUEST_IDS.includes(quest.id) && quest.xp === XP_QUEST));
});

test('zadania tygodnia: bez historii nie ma zadań, które jej wymagają', () => {
  for (let week = 0; week < 20; week += 1) {
    const ids = weekQuests([], exerciseById, new Date(2026, 10, 16 + week * 7)).map((quest) => quest.id);
    assert.ok(!ids.includes('record') && !ids.includes('volume') && !ids.includes('comeback-exercise'), ids.join());
  }
});

test('zadania tygodnia: różne tygodnie dostają różne zestawy', () => {
  const sets = new Set();
  for (let week = 0; week < 12; week += 1) sets.add(weekQuests([], exerciseById, new Date(2026, 10, 16 + week * 7)).map((q) => q.id).sort().join());
  assert.ok(sets.size > 3);
});

test('zadania: nogi, brzuch, partie i serie liczą tylko serie robocze z tego tygodnia', () => {
  const list = [
    workout(new Date(2026, 10, 13, 18), { squat: sets(8, 100, 5) }), // poprzedni tydzień
    workout(inWeek(0), { squat: [...sets(5, 100, 5), set(40, 10, { kind: 'warmup' })], crunch: sets(3, null, 15) }),
    workout(inWeek(2), { 'leg-press': sets(3, 150, 10), 'bench-press': sets(4, 80, 5), 'db-curl': sets(2, 14, 10) }),
  ];
  const legs = measureQuest('legs', list, exerciseById, WEEK);
  assert.equal(legs.progress, 8);
  assert.equal(legs.done, true);
  assert.equal(measureQuest('core', list, exerciseById, WEEK).progress, 3);
  assert.equal(measureQuest('muscles', list, exerciseById, WEEK).progress, 4);
  const total = measureQuest('sets', list, exerciseById, WEEK, { weeklyGoal: 2 });
  assert.equal(total.target, 20);
  assert.equal(total.progress, 17);
  assert.equal(total.done, false);
});

test('zadania: RPE wymaga oceny każdej serii roboczej w treningu z co najmniej 6 seriami', () => {
  const rated = (count) => sets(count, 80, 5, { rpe: 8 });
  const short = [workout(inWeek(0), { 'bench-press': rated(5) })];
  assert.equal(measureQuest('rpe', short, exerciseById, WEEK).done, false);
  const gap = [workout(inWeek(0), { 'bench-press': [...rated(6), set(80, 5)] })];
  assert.equal(measureQuest('rpe', gap, exerciseById, WEEK).done, false);
  const full = [workout(inWeek(0), { 'bench-press': [set(40, 10, { kind: 'warmup' }), ...rated(6)] })];
  assert.equal(measureQuest('rpe', full, exerciseById, WEEK).done, true);
});

test('zadania: tonaż porównuje się z poprzednim tygodniem, a rekord wymaga nowego wyniku', () => {
  const list = [
    workout(new Date(2026, 10, 11, 18), { 'bench-press': sets(3, 80, 5) }), // 1200 kg
    workout(inWeek(1), { 'bench-press': sets(3, 80, 5) }),
  ];
  const volume = measureQuest('volume', list, exerciseById, WEEK);
  assert.equal(volume.target, 1201);
  assert.equal(volume.done, false);
  const records = recordTimeline(list, exerciseById);
  assert.equal(measureQuest('record', list, exerciseById, WEEK, { records }).done, false);
  const better = [...list, workout(inWeek(3), { 'bench-press': [set(85, 5)] })];
  assert.equal(measureQuest('volume', better, exerciseById, WEEK).done, true);
  assert.equal(measureQuest('record', better, exerciseById, WEEK, { records: recordTimeline(better, exerciseById) }).done, true);
});

test('zadania: ćwiczenie wraca po 30 dniach przerwy', () => {
  const list = [
    workout(new Date(2026, 9, 1, 18), { 'db-curl': sets(3, 14, 10) }),
    workout(new Date(2026, 10, 10, 18), { 'bench-press': sets(3, 80, 5) }),
    workout(inWeek(0), { 'bench-press': sets(3, 80, 5) }),
  ];
  assert.equal(measureQuest('comeback-exercise', list, exerciseById, WEEK).done, false);
  list.push(workout(inWeek(2), { 'db-curl': sets(3, 14, 10) }));
  assert.equal(measureQuest('comeback-exercise', list, exerciseById, WEEK).done, true);
});

test('zadania: XP liczy się dopiero od tygodnia wprowadzenia zadań', () => {
  const old = [workout(new Date(2026, 9, 5, 18), { squat: sets(20, 100, 5), crunch: sets(10, null, 15) })];
  assert.deepEqual(doneQuests(old, exerciseById, {}, new Date(2026, 10, 20).getTime()), []);
  const fresh = [workout(new Date(QUESTS_FROM + 86400000), { squat: sets(10, 100, 5), crunch: sets(8, null, 15), 'bench-press': sets(5, 80, 5), 'db-curl': sets(5, 14, 10), 'lat-pulldown': sets(5, 60, 10), 'lateral-raise': sets(5, 10, 12) })];
  const done = doneQuests(fresh, exerciseById, {}, new Date(2026, 10, 12).getTime());
  assert.ok(done.length > 0);
  assert.ok(done.every((entry) => entry.key.startsWith('2026-11-09|')));
});

test('pierwsze kroki: wynikają ze stanu, a zapisane zostają na stałe', () => {
  const empty = { settings: { weeklyGoal: null }, bodyWeights: [], routines: [], workouts: [], lastBackupAt: null };
  assert.deepEqual([...liveFirstSteps(empty, false)], []);
  const busy = {
    settings: { weeklyGoal: 3 },
    bodyWeights: [{ day: '2026-11-01', kg: 80 }],
    routines: [{ id: 'r' }],
    workouts: [workout(inWeek(0), { 'bench-press': [set(80, 5, { rpe: 8 })] })],
    lastBackupAt: 1,
  };
  assert.deepEqual([...liveFirstSteps(busy, true)].sort(), FIRST_STEPS.map((step) => step.id).sort());
  // Rutyna usunięta po wykonaniu kroku dalej się liczy, bo krok jest zapisany.
  assert.deepEqual(firstStepsDone({ routine: 5 }, new Set(['goal'])), ['goal', 'routine']);
  assert.deepEqual(firstStepsDone({ nieznany: 5 }, new Set()), []);
});

test('pierwsze kroki dają XP bez mnożnika i nie zmieniają zysku z treningu', () => {
  const list = [workout(new Date(2025, 0, 6, 18), { 'bench-press': sets(3, 60, 8) })];
  const without = levelProgress(list, exerciseById);
  const withSteps = levelProgress(list, exerciseById, { firstSteps: ['goal', 'weight'] });
  assert.equal(withSteps.xp - without.xp, 2 * XP_FIRST_STEP);
  const gain = workoutGain(list, list[0], exerciseById, { firstSteps: ['goal', 'weight'] });
  assert.equal(gain.xp, without.xp);
});

test('kopia zapasowa zachowuje wykonane pierwsze kroki i odrzuca nieznane', () => {
  const backup = buildBackup({ exercises: [], workouts: [], settings: { firstSteps: { goal: 1700000000000, routine: 'zle', hack: 1700000000000 } }, profile: {}, bodyWeights: [], routines: [], shop: {} });
  const parsed = parseBackup(JSON.stringify(backup));
  assert.deepEqual(parsed.settings.firstSteps, { goal: 1700000000000 });
  const none = parseBackup(JSON.stringify(buildBackup({ exercises: [], workouts: [], settings: {}, profile: {}, bodyWeights: [], routines: [], shop: {} })));
  assert.equal(none.settings.firstSteps, undefined);
});

test('sezony: trzy po cztery miesiące, z poprzednim sezonem przez granicę roku', () => {
  const autumn = seasonOf(new Date(2026, 10, 9));
  assert.equal(autumn.key, '2026-3');
  assert.equal(autumn.start, new Date(2026, 8, 1).getTime());
  assert.equal(autumn.end, new Date(2027, 0, 1).getTime());
  assert.equal(seasonOf(new Date(2027, 0, 1)).key, '2027-1');
  assert.equal(previousSeason(seasonOf(new Date(2027, 1, 1))).key, '2026-3');
  assert.equal(seasonOf(new Date(2026, 4, 1)).key, '2026-2');
  assert.equal(seasonOf(new Date(2026, 3, 30, 23)).key, '2026-1');
});

test('sezony: progi medalu i XP tylko za najwyższy', () => {
  assert.deepEqual(seasonTier(0), { tier: null, next: SEASON_TIERS[0] });
  assert.equal(seasonTier(16).tier.id, 'bronze');
  assert.equal(seasonTier(47).tier.id, 'silver');
  assert.deepEqual(seasonTier(60), { tier: SEASON_TIERS[2], next: null });
  const list = Array.from({ length: 33 }, (_, i) => workout(new Date(2026, 8, 1 + i * 3, 18), { 'bench-press': sets(1, 60, 5) }));
  const medals = seasonMedals(list, new Date(2026, 11, 1).getTime());
  assert.equal(medals.length, 1);
  assert.equal(medals[0].tier.id, 'silver');
  assert.equal(seasonXp(medals), 400);
});

test('sezony: przed wprowadzeniem medale są w historii, ale bez XP', () => {
  const list = Array.from({ length: 16 }, (_, i) => workout(new Date(2026, 4, 1 + i * 5, 18), { 'bench-press': sets(1, 60, 5) }));
  assert.deepEqual(seasonMedals(list, new Date(2026, 10, 9).getTime()), []);
  const history = seasonHistory(list, [], new Date(2026, 10, 9).getTime());
  assert.equal(history.length, 1);
  assert.equal(history[0].season.key, '2026-2');
  assert.equal(history[0].tier.id, 'bronze');
  assert.equal(history[0].counts, false);
  assert.ok(SEASONS_FROM >= history[0].season.end);
});

test('sezony: trening tylko z rozgrzewką się nie liczy, a porównanie można uciąć w dniu sezonu', () => {
  const season = seasonOf(new Date(2026, 9, 1));
  const list = [
    workout(new Date(2026, 8, 3, 18), { 'bench-press': sets(2, 60, 5) }),
    workout(new Date(2026, 9, 3, 18), { 'bench-press': [set(40, 10, { kind: 'warmup' })] }),
    workout(new Date(2026, 10, 3, 18), { 'bench-press': sets(1, 100, 1) }),
  ];
  assert.deepEqual(seasonTotals(list, season), { workouts: 2, volume: 700, sets: 3, records: 0 });
  assert.equal(seasonTotals(list, season, [], new Date(2026, 9, 1).getTime()).workouts, 1);
});

test('medal sezonu: metal z progu i numer sezonu na tarczy', () => {
  const season = seasonOf(new Date(2026, 10, 9));
  const item = seasonBadgeItem(season, SEASON_TIERS[1], true);
  assert.equal(item.group, 'Sezon');
  const markup = badgeMarkup(item);
  assert.ok(markup.includes('medal-silver-rim'));
  assert.ok(markup.includes('>3/26<'));
});

test('regeneracja: godziny od końca treningu, nogi pomocnicze od pół serii', () => {
  const now = new Date(2026, 10, 20, 12).getTime();
  const list = [
    workout(new Date(2026, 10, 19, 18), { squat: sets(3, 100, 5) }, 1), // koniec 19:00, 17 h temu
    workout(new Date(2026, 10, 17, 9), { 'bench-press': sets(3, 80, 5) }, 1), // koniec 10:00, 74 h temu
    workout(new Date(2026, 10, 18, 9), { 'bench-press': [set(40, 10, { kind: 'warmup' })] }), // sama rozgrzewka
  ];
  const rows = muscleRecovery(list, exerciseById, ['Czworogłowe', 'Pośladki', 'Klatka', 'Triceps', 'Biceps'], now);
  const hours = Object.fromEntries(rows.map((row) => [row.muscle, row.hours]));
  assert.equal(hours['Czworogłowe'], 17);
  assert.equal(hours['Pośladki'], 17);
  assert.equal(hours.Klatka, 74);
  assert.equal(hours.Biceps, null);
  assert.deepEqual([null, 0, 23.9, 24, 47, 48, 71.9, 72, 500].map(recoveryColour), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
});
