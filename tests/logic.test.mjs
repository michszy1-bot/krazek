import { test } from 'node:test';
import assert from 'node:assert/strict';

import { addDays, dayKey, fmtClock, fmtDuration, fmtMultiplier, fmtSet, fmtSetChange, fmtVolume, inputValue, parseNum, pastWorkoutStart, plural, startOfWeek } from '../js/format.js';
import { ACHIEVEMENT_GROUPS, ACHIEVEMENTS, achievementProgress, achievementXp, rewardTier } from '../js/achievements.js';
import { backupStatus, bestSet, bestStreak, compareSets, estimate1RM, flagRecords, goalProgress, isComplete, loadBar, MUSCLE_SCALES, muscleLevel, muscleSets, neglectedMuscles, niceTicks, plateHeight, plateTier, plateTravel, plateWidth, recordsFor, recordTimeline, restAfterSet, setLabels, stepBaseWeight, steppedWeight, streakMultiplier, streakStatus, suggestNextWeight, summarizeSets, swapExercise, warmupSets, weekDays, weeklyTotals, weeksToShield, weightStep, workoutComparison, workoutRecords, workoutVolume } from '../js/stats.js';
import { workoutsCsv } from '../js/csv.js';
import { levelProgress, strengthCategory, strengthColour, strengthRatio, workoutGain } from '../js/level.js';
import { LIFTS_BODY, ONE_DUMBBELL, STRENGTH_ALSO, STRENGTH_TOPS } from '../js/strength-norms.js';
import { applyFilter } from '../js/picker.js';
import { SHAPE_TO_MUSCLE } from '../js/muscle-map.js';
import { BODY_BACK, BODY_FRONT } from '../js/muscle-shapes.js';
import { buildBackup, parseBackup } from '../js/backup.js';
import { buyItem, cleanInscription, cleanShop, hasChalkDust, hasRecordSparks, INSCRIPTION_MAX, SHOP_ITEMS, SHOP_SECTIONS, shownInscription, shownTitle, spendable, themeColor, useShields, wearItem, wornItem, wornLooks } from '../js/shop.js';
import { ageOn, cleanProfile, cleanWeights, dayTime, isDay, putWeight, removeWeight, weightChange, weightOn } from '../js/body.js';
import { cleanRoutines, hasOwnName, isNameTaken, moveItem, parseRepRange, putRoutine, routineDiffers, routineFromWorkout, routineSetCount } from '../js/routines.js';
import { SEED_EXERCISES, MUSCLES, EQUIPMENT, HELPER_MUSCLES, musclesOf, RETIRED_EXERCISES, syncExercises } from '../js/exercises.js';
import { ANIMATIONS } from '../js/animations.js';

const nbsp = (s) => s.replace(/ /g, ' ');
const set = (weight, reps, extra = {}) => ({ weight, reps, seconds: null, kind: 'normal', ...extra });
const workout = (id, date, items) => ({
  id,
  name: id,
  startedAt: new Date(date).getTime(),
  endedAt: new Date(date).getTime() + 3600000,
  note: '',
  exercises: Object.entries(items).map(([exerciseId, sets]) => ({ exerciseId, note: '', sets })),
});

test('parseNum przyjmuje przecinek i kropkę, odrzuca śmieci', () => {
  assert.equal(parseNum('82,5'), 82.5);
  assert.equal(parseNum('82.5'), 82.5);
  assert.equal(parseNum(' 100 '), 100);
  assert.equal(parseNum('0'), 0);
  assert.equal(parseNum(''), null);
  assert.equal(parseNum('abc'), null);
  assert.equal(parseNum('1,2,3'), null);
  assert.equal(parseNum('-5'), null);
  assert.equal(parseNum('2000', { max: 1000 }), null);
  assert.equal(parseNum('7,6', { integer: true }), 8);
});

test('inputValue pokazuje przecinek i pusty brak wartości', () => {
  assert.equal(inputValue(82.5), '82,5');
  assert.equal(inputValue(null), '');
  assert.equal(inputValue(0), '0');
});

test('polska odmiana', () => {
  const f = (n) => plural(n, 'seria', 'serie', 'serii');
  assert.equal(f(1), 'seria');
  assert.equal(f(2), 'serie');
  assert.equal(f(5), 'serii');
  assert.equal(f(12), 'serii');
  assert.equal(f(22), 'serie');
  assert.equal(f(0), 'serii');
});

test('formatowanie czasu, objętości i serii', () => {
  assert.equal(fmtClock(90), '1:30');
  assert.equal(fmtClock(3700), '1:01:40');
  assert.equal(fmtDuration(58 * 60000), '58 min');
  assert.equal(fmtDuration(72 * 60000), '1 h 12 min');
  assert.equal(fmtDuration(120 * 60000), '2 h');
  assert.equal(fmtVolume(950), '950 kg');
  assert.equal(fmtVolume(12450), '12,5 t');
  assert.equal(fmtSet(set(82.5, 8), 'weight'), '82,5 kg × 8');
  assert.equal(fmtSet(set(82.5, 8), 'weight', { compact: true }), '82,5 × 8');
  assert.equal(fmtSet(set(null, 12), 'bodyweight'), '12 powtórzeń');
  assert.equal(fmtSet(set(10, 8), 'bodyweight', { compact: true }), '+10 × 8');
  assert.equal(fmtSet({ seconds: 75 }, 'time'), '1:15');
});

test('ocena wysiłku jest tylko w krótkim zapisie serii i nie zmienia wyniku', () => {
  assert.equal(fmtSet(set(30, 6, { rpe: 8 }), 'weight', { compact: true }), '30 × 6 @8');
  assert.equal(fmtSet(set(30, 6, { rpe: 8 }), 'weight'), '30 kg × 6');
  assert.equal(fmtSet(set(null, 12, { rpe: 10 }), 'bodyweight', { compact: true }), '× 12 @10');
  assert.equal(fmtSet({ seconds: 75, rpe: 7 }, 'time', { compact: true }), '1:15 @7');
  assert.equal(fmtSet(set(null, null, { rpe: 8 }), 'weight', { compact: true }), '');
  assert.equal(workoutVolume(workout('a', '2026-10-01', { squat: [set(100, 5, { rpe: 9 })] })), workoutVolume(workout('b', '2026-10-01', { squat: [set(100, 5)] })));
});

test('kopia zachowuje ocenę wysiłku i ustawienie, a zła ocena przepada bez szkody', () => {
  const data = {
    exercises: SEED_EXERCISES,
    workouts: [workout('a', '2026-10-01', { squat: [set(100, 5, { rpe: 8 }), set(100, 5), set(100, 5, { rpe: 5 }), set(100, 5, { rpe: 'mocno' })] })],
    settings: { restSec: 150, askRpe: false },
  };
  const parsed = parseBackup(JSON.stringify(buildBackup(data)));
  assert.deepEqual(parsed.workouts[0].exercises[0].sets.map((s) => s.rpe), [8, undefined, undefined, undefined]);
  assert.equal('rpe' in parsed.workouts[0].exercises[0].sets[1], false);
  assert.equal(parsed.settings.askRpe, false);
  const older = parseBackup(JSON.stringify(buildBackup({ ...data, settings: { restSec: 150 } })));
  assert.equal('askRpe' in older.settings, false);
});

test('tydzień zaczyna się w poniedziałek, także gdy dziś jest niedziela', () => {
  assert.equal(dayKey(startOfWeek(new Date(2026, 10, 8, 23, 30))), '2026-11-02');
  assert.equal(dayKey(startOfWeek(new Date(2026, 10, 2, 0, 5))), '2026-11-02');
  assert.equal(dayKey(addDays(new Date(2026, 9, 24), 7)), '2026-10-31');
});

test('wcześniejszy trening domyślnie zaczyna się wczoraj o 18:00 i nigdy w przyszłości', () => {
  const now = new Date(2026, 10, 6, 12, 0);
  assert.equal(pastWorkoutStart(null, now), new Date(2026, 10, 5, 18, 0).getTime());
  assert.equal(pastWorkoutStart(new Date(2026, 10, 2, 9, 30), now), new Date(2026, 10, 2, 18, 0).getTime());
  assert.equal(pastWorkoutStart(new Date(2026, 10, 6), now), now.getTime() - 3600000);
  const evening = new Date(2026, 10, 6, 21, 0);
  assert.equal(pastWorkoutStart(new Date(2026, 10, 6), evening), new Date(2026, 10, 6, 18, 0).getTime());
});

test('dopisanie starszego treningu nie czyni go rekordem, ale zmienia rekordy późniejszych', () => {
  const lookup = (id) => SEED_EXERCISES.find((e) => e.id === id);
  const newer = workout('newer', '2026-10-20', { squat: [set(100, 5)] });
  const middle = workout('middle', '2026-10-10', { squat: [set(90, 5)] });
  assert.deepEqual(workoutRecords(newer, [newer], lookup), []);
  assert.ok(workoutRecords(newer, [newer, middle], lookup).some((r) => r.key === 'maxWeight'));
  const heavierOld = workout('old', '2026-10-01', { squat: [set(140, 5)] });
  assert.deepEqual(workoutRecords(newer, [newer, middle, heavierOld], lookup), []);
  assert.deepEqual(workoutRecords(heavierOld, [newer, middle, heavierOld], lookup), []);
});

test('1RM: pojedyncze powtórzenie to sam ciężar, brak danych to zero', () => {
  assert.equal(estimate1RM(100, 1), 100);
  assert.equal(estimate1RM(100, 10), 100 * (1 + 10 / 30));
  assert.equal(estimate1RM(null, 5), 0);
  assert.equal(estimate1RM(100, 0), 0);
});

test('isComplete zależy od rodzaju ćwiczenia', () => {
  assert.equal(isComplete(set(0, 5), 'weight'), true);
  assert.equal(isComplete(set(null, 5), 'weight'), false);
  assert.equal(isComplete(set(60, null), 'weight'), false);
  assert.equal(isComplete(set(null, 5), 'bodyweight'), true);
  assert.equal(isComplete({ seconds: 30 }, 'time'), true);
  assert.equal(isComplete({ seconds: null }, 'time'), false);
});

test('rozgrzewka nie liczy się do objętości, podsumowań ani rekordów', () => {
  const warm = set(200, 1, { kind: 'warmup' });
  const w = workout('a', '2026-10-01T10:00', { squat: [warm, set(100, 5)] });
  assert.equal(workoutVolume(w), 500);
  assert.equal(summarizeSets(w.exercises[0].sets).maxWeight, 100);
  assert.equal(recordsFor([w], 'squat').values.maxWeight.value, 100);
});

test('recordsFor uwzględnia tylko treningi wcześniejsze i pomija wskazany', () => {
  const a = workout('a', '2026-10-01T10:00', { squat: [set(100, 5)] });
  const b = workout('b', '2026-10-08T10:00', { squat: [set(120, 5)] });
  assert.equal(recordsFor([a, b], 'squat').values.maxWeight.value, 120);
  assert.equal(recordsFor([a, b], 'squat', { beforeTs: b.startedAt }).values.maxWeight.value, 100);
  assert.equal(recordsFor([a, b], 'squat', { excludeId: 'b' }).values.maxWeight.value, 100);
  assert.equal(recordsFor([a, b], 'bench-press').hasHistory, false);
});

test('flagRecords: pierwszy raz nie jest rekordem', () => {
  const flags = flagRecords([set(100, 5)], 'weight', { hasHistory: false, values: {} });
  assert.deepEqual(flags, [[]]);
});

test('flagRecords: wykrywa ciężar i 1RM, kolejne serie porównuje z już pobitym', () => {
  const baseline = recordsFor([workout('a', '2026-10-01', { squat: [set(100, 5)] })], 'squat');
  const flags = flagRecords([set(90, 5), set(110, 3), set(105, 3)], 'weight', baseline);
  assert.deepEqual(flags[0], []);
  assert.ok(flags[1].includes('maxWeight'));
  assert.ok(flags[1].includes('est1RM'));
  assert.deepEqual(flags[2], []);
});

test('flagRecords: pomija serie nieodhaczone i rozgrzewkowe', () => {
  const baseline = recordsFor([workout('a', '2026-10-01', { squat: [set(100, 5)] })], 'squat');
  const flags = flagRecords([set(150, 5, { done: false }), set(150, 5, { kind: 'warmup' })], 'weight', baseline);
  assert.deepEqual(flags, [[], []]);
});

test('flagRecords: masa ciała porównuje powtórzenia i dociążenie', () => {
  const baseline = recordsFor([workout('a', '2026-10-01', { 'pull-up': [set(null, 8)] })], 'pull-up');
  const flags = flagRecords([set(null, 10), set(5, 6)], 'bodyweight', baseline);
  assert.deepEqual(flags[0], ['maxReps']);
  assert.deepEqual(flags[1], ['maxWeight']);
});

test('workoutRecords podaje najlepszą serię dla każdego rodzaju rekordu', () => {
  const lookup = (id) => SEED_EXERCISES.find((e) => e.id === id);
  const a = workout('a', '2026-10-01', { squat: [set(100, 5)] });
  const b = workout('b', '2026-10-08', { squat: [set(105, 5), set(110, 5)] });
  const found = workoutRecords(b, [a, b], lookup);
  const weight = found.find((r) => r.key === 'maxWeight');
  assert.equal(weight.value, 110);
  assert.equal(found.filter((r) => r.key === 'maxWeight').length, 1);
  assert.deepEqual(workoutRecords(a, [a, b], lookup), []);
});

test('kolor krążka zależy od liczby serii', () => {
  assert.deepEqual([0, 9, 10, 14, 15, 19, 20, 40].map(plateTier), ['green', 'green', 'yellow', 'yellow', 'blue', 'blue', 'red', 'red']);
});

test('sztanga ma krążki po kolei treningów i puste miejsca do celu', () => {
  const workout = (startedAt, sets) => ({ startedAt, exercises: [{ sets: Array.from({ length: sets }, () => ({ done: true, kind: 'normal', weight: 50, reps: 8 })) }] });
  const week = [workout(3, 14), workout(1, 20), workout(2, 8), workout(4, 18)];
  assert.deepEqual(loadBar(week, 5), { plates: [20, 8, 14, 18], empty: 1 });
  assert.deepEqual(loadBar(week, 2), { plates: [20, 8, 14, 18], empty: 0 });
  assert.deepEqual(loadBar(week, null), { plates: [20, 8, 14, 18], empty: 0 });
  assert.deepEqual(loadBar([], 3), { plates: [], empty: 3 });
  assert.equal(week[0].startedAt, 3, 'kolejność listy zostaje bez zmian');
});

test('nowy krążek zawsze startuje poza ekranem', () => {
  for (let count = 1; count <= 7; count += 1) {
    const width = plateWidth(count);
    for (let index = 0; index < count; index += 1) {
      const innerEdge = 2 + index * (width + 2);
      assert.equal(innerEdge + plateTravel(index, width), 104, `krążek ${index + 1} z ${count}`);
    }
  }
});

test('krążki mieszczą się na końcu gryfu przy każdym celu', () => {
  assert.equal(plateWidth(0), 22);
  assert.equal(plateWidth(4), 22);
  for (let count = 1; count <= 10; count += 1) {
    assert.ok(count * plateWidth(count) + (count - 1) * 2 <= 94, `${count} krążków`);
  }
  assert.equal(plateHeight(0), 56);
  assert.equal(plateHeight(24), 136);
  assert.equal(plateHeight(60), 136);
});

test('weekDays i weeklyTotals grupują po tygodniach od poniedziałku', () => {
  const now = new Date(2026, 10, 6, 12);
  const w = [
    workout('a', new Date(2026, 10, 2, 18), { squat: [set(100, 5), set(100, 5)] }),
    workout('b', new Date(2026, 9, 26, 18), { squat: [set(100, 10)] }),
  ];
  const days = weekDays(w, now);
  assert.equal(days.length, 7);
  assert.equal(days[0].sets, 2);
  assert.equal(days[4].isToday, true);
  const totals = weeklyTotals(w, 3, now);
  assert.deepEqual(totals.map((t) => t.volume), [0, 1000, 1000]);
  assert.deepEqual(totals.map((t) => t.workouts), [0, 1, 1]);
});

test('muscleSets liczy serie robocze i sortuje malejąco', () => {
  const lookup = (id) => SEED_EXERCISES.find((e) => e.id === id);
  const w = workout('a', '2026-11-02', {
    squat: [set(100, 5), set(100, 5, { kind: 'warmup' })],
    'bench-press': [set(80, 5), set(80, 5)],
  });
  assert.deepEqual(muscleSets([w], lookup, 0), [
    { muscle: 'Klatka', sets: 2 },
    { muscle: 'Czworogłowe', sets: 1 },
    { muscle: 'Pośladki', sets: 0.5 },
    { muscle: 'Dwugłowe uda', sets: 0.5 },
  ]);
});

test('przysiad liczy się w połowie do pośladków i dwugłowych, a izolacja i własne ćwiczenie tylko do swojej partii', () => {
  const lookup = (id) => SEED_EXERCISES.find((e) => e.id === id) ?? (id === 'moje' ? { id, muscle: 'Klatka' } : undefined);
  assert.deepEqual(musclesOf(lookup('squat')), [['Czworogłowe', 1], ['Pośladki', 0.5], ['Dwugłowe uda', 0.5]]);
  assert.deepEqual(musclesOf(lookup('leg-extension')), [['Czworogłowe', 1]]);
  assert.deepEqual(musclesOf(lookup('moje')), [['Klatka', 1]]);
  assert.deepEqual(musclesOf(undefined), []);
  const week = workout('a', '2026-11-02', { squat: [set(100, 5), set(100, 5), set(100, 5), set(100, 5)] });
  assert.deepEqual(neglectedMuscles([week], lookup, ['Pośladki', 'Dwugłowe uda', 'Łydki'], new Date(2026, 10, 3), 7), [{ muscle: 'Łydki', days: null }]);
});

test('partie pomocnicze dotyczą istniejących ćwiczeń i partii, innych niż główna', () => {
  for (const [id, muscles] of HELPER_MUSCLES) {
    const exercise = SEED_EXERCISES.find((e) => e.id === id);
    assert.ok(exercise, id);
    for (const muscle of muscles) {
      assert.ok(MUSCLES.includes(muscle), `${id}: ${muscle}`);
      assert.notEqual(muscle, exercise.muscle, id);
    }
  }
});

test('niceTicks daje równe, okrągłe podziałki obejmujące zakres', () => {
  const ticks = niceTicks(62.5, 107, 4);
  assert.ok(ticks[0] <= 62.5);
  assert.ok(ticks.at(-1) >= 107);
  const step = ticks[1] - ticks[0];
  ticks.slice(1).forEach((t, i) => assert.ok(Math.abs(t - ticks[i] - step) < 1e-6));
  assert.ok(niceTicks(100, 100).length >= 2);
});

test('każde ćwiczenie z bazy ma animację i każda animacja ma ćwiczenie', () => {
  const seedIds = SEED_EXERCISES.map((e) => e.id).sort();
  assert.deepEqual(Object.keys(ANIMATIONS).sort(), seedIds);
  const files = Object.values(ANIMATIONS);
  assert.equal(new Set(files).size, files.length, 'dwa ćwiczenia nie powinny mieć tej samej animacji');
});

test('baza nie ma pompek z masą ciała ani kettlebell, a wycofane ćwiczenia nie wracają', () => {
  assert.equal(SEED_EXERCISES.some((e) => /^Pompki/.test(e.name)), false);
  assert.equal(SEED_EXERCISES.some((e) => e.equipment === 'Kettlebell'), false);
  const seedIds = new Set(SEED_EXERCISES.map((e) => e.id));
  assert.deepEqual(RETIRED_EXERCISES.filter((id) => seedIds.has(id)), []);
});

test('uzgadnianie: wycofane nieużyte znika, a użyte zostaje ukryte w historii', () => {
  const stored = [
    { id: 'push-up', name: 'Pompki', muscle: 'Klatka', equipment: 'Masa ciała', type: 'bodyweight' },
    { id: 'kb-swing', name: 'Swing', muscle: 'Całe ciało', equipment: 'Kettlebell', type: 'weight' },
  ];
  const { exercises, toSave, toRemove } = syncExercises(stored, (id) => id === 'kb-swing');
  assert.deepEqual(toRemove, ['push-up']);
  assert.equal(exercises.has('push-up'), false);
  assert.equal(exercises.get('kb-swing').archived, true);
  assert.equal(exercises.get('kb-swing').name, 'Swing');
  assert.ok(toSave.some((e) => e.id === 'kb-swing'));
});

test('uzgadnianie: nazwa idzie za bazą, a ustawienia użytkownika i własne ćwiczenia zostają', () => {
  const stored = [
    { id: 'machine-dip', name: 'Pompki na poręczach na maszynie', muscle: 'Triceps', equipment: 'Maszyna', type: 'weight', restSec: 90, archived: true },
    { id: 'goblet-squat', name: 'Przysiad goblet', muscle: 'Czworogłowe', equipment: 'Kettlebell', type: 'weight' },
    { id: 'custom-1', name: 'Moje', muscle: 'Klatka', equipment: 'Kettlebell', type: 'weight', custom: true },
  ];
  const { exercises } = syncExercises(stored, () => false);
  const dip = exercises.get('machine-dip');
  assert.equal(dip.name, 'Dipy na maszynie');
  assert.equal(dip.restSec, 90);
  assert.equal(dip.archived, true);
  assert.equal(exercises.get('goblet-squat').equipment, 'Hantle');
  assert.deepEqual(exercises.get('custom-1'), stored[2]);
  assert.equal(exercises.size, SEED_EXERCISES.length + 1);
});

test('uzgadnianie: drugi przebieg nie ma już nic do zrobienia', () => {
  const first = syncExercises([], () => false);
  const second = syncExercises([...first.exercises.values()], () => false);
  assert.deepEqual(second.toSave, []);
  assert.deepEqual(second.toRemove, []);
});

test('rodzaje serii: litery zamiast numeru, a do upadku i dropset liczą się do objętości', () => {
  const sets = [set(40, 10, { kind: 'warmup' }), set(100, 5), set(100, 5), set(100, 4, { kind: 'failure' }), set(70, 8, { kind: 'drop' })];
  assert.deepEqual(setLabels(sets), ['R', '1', '2', 'U', 'D']);
  assert.equal(summarizeSets(sets).setCount, 4);
  assert.equal(summarizeSets(sets).volume, 100 * 5 + 100 * 5 + 100 * 4 + 70 * 8);
});

test('kopia i rutyna zachowują nowe rodzaje serii, a nieznany rodzaj wraca do roboczej', () => {
  const exercises = SEED_EXERCISES.filter((e) => e.id === 'squat');
  const w = workout('a', '2026-10-01', { squat: [set(100, 5, { kind: 'failure' }), set(70, 8, { kind: 'drop' }), set(50, 8, { kind: 'dziwna' })] });
  const parsed = parseBackup(JSON.stringify(buildBackup({ exercises, workouts: [w], settings: {} })));
  assert.deepEqual(parsed.workouts[0].exercises[0].sets.map((s) => s.kind), ['failure', 'drop', 'normal']);
  const routine = routineFromWorkout(parsed.workouts[0], { id: 'r', name: 'x' });
  assert.deepEqual(cleanRoutines([routine], new Set(['squat']))[0].exercises[0].sets, ['failure', 'drop', 'normal']);
});

test('moveItem przesuwa element i nie wychodzi poza listę', () => {
  const list = ['a', 'b', 'c'];
  assert.deepEqual(moveItem(list, 2, -1), ['a', 'c', 'b']);
  assert.deepEqual(moveItem(list, 0, 1), ['b', 'a', 'c']);
  assert.equal(moveItem(list, 0, -1), list);
  assert.equal(moveItem(list, 2, 1), list);
  assert.deepEqual(list, ['a', 'b', 'c']);
});

test('historia rekordów zgadza się z rekordami pojedynczych treningów', () => {
  const lookup = (id) => SEED_EXERCISES.find((e) => e.id === id);
  const history = [
    workout('w1', '2026-10-01', { squat: [set(100, 5)], 'bench-press': [set(60, 5)] }),
    workout('w2', '2026-10-08', { squat: [set(90, 5)], 'bench-press': [set(70, 5)] }),
    workout('w3', '2026-10-15', { squat: [set(110, 3, { kind: 'failure' }), set(40, 20, { kind: 'warmup' })] }),
    workout('w4', '2026-10-22', { squat: [set(105, 3)] }),
  ];
  const timeline = recordTimeline(history, lookup);
  assert.deepEqual(timeline.map((entry) => `${entry.workoutId}:${entry.exerciseId}`), ['w3:squat', 'w2:bench-press']);
  for (const w of history) {
    const expected = workoutRecords(w, history, lookup);
    const actual = timeline.filter((entry) => entry.workoutId === w.id).flatMap((entry) => entry.records);
    assert.deepEqual(actual.map((r) => [r.exerciseId, r.key, r.value]), expected.map((r) => [r.exerciseId, r.key, r.value]));
  }
});

test('cel tygodniowy: trwający tydzień nie przerywa serii, a pusty tydzień już tak', () => {
  // 2026-11-04 to środa, a tygodnie zaczynają się 2 listopada, 26 i 19 października.
  const now = new Date(2026, 10, 4, 12);
  const on = (id, month, day) => workout(id, new Date(2026, month, day, 18).toISOString(), { squat: [set(100, 5)] });
  const lastTwoWeeks = [on('a', 9, 26), on('b', 9, 28), on('c', 9, 19), on('d', 9, 21)];

  assert.deepEqual(goalProgress(lastTwoWeeks, 2, now), { done: 0, goal: 2, met: false, streak: 2 });
  const withThisWeek = [...lastTwoWeeks, on('e', 10, 2), on('f', 10, 3)];
  assert.deepEqual(goalProgress(withThisWeek, 2, now), { done: 2, goal: 2, met: true, streak: 3 });
  assert.equal(goalProgress([on('a', 9, 26), on('c', 9, 12)], 1, now).streak, 1);
  assert.equal(goalProgress(lastTwoWeeks, 3, now).streak, 0);
  assert.equal(goalProgress([], 1, now).streak, 0);
});

test('kopia zachowuje cel tygodniowy i odrzuca złą wartość', () => {
  const base = { app: 'krazek', version: 1, exercises: [], workouts: [] };
  assert.equal(parseBackup(JSON.stringify({ ...base, settings: { weeklyGoal: 4 } })).settings.weeklyGoal, 4);
  assert.equal('weeklyGoal' in parseBackup(JSON.stringify({ ...base, settings: { weeklyGoal: 9 } })).settings, false);
});

test('weightOn bierze wagę z dnia albo ostatnią wcześniejszą', () => {
  const list = [{ day: '2026-11-03', kg: 80 }, { day: '2026-10-20', kg: 82 }];
  assert.equal(weightOn(list, '2026-11-03').kg, 80);
  assert.equal(weightOn(list, '2026-11-01').kg, 82);
  assert.equal(weightOn(list, '2026-01-01').kg, 82);
  assert.equal(weightOn([], '2026-01-01'), null);
});

test('filtr łączy sprzęt, partię i wyszukiwanie', () => {
  const byEquipment = applyFilter(SEED_EXERCISES, { query: '', muscle: null, equipment: 'Hantle' });
  assert.ok(byEquipment.length > 0);
  assert.ok(byEquipment.every((e) => e.equipment === 'Hantle'));
  const both = applyFilter(SEED_EXERCISES, { query: '', muscle: 'Barki', equipment: 'Maszyna' });
  assert.ok(both.length > 0);
  assert.ok(both.every((e) => e.muscle === 'Barki' && e.equipment === 'Maszyna'));
  assert.deepEqual(applyFilter(SEED_EXERCISES, { query: 'iso-lateral', muscle: null, equipment: 'Hantle' }), []);
  assert.equal(applyFilter(SEED_EXERCISES, { query: 'iso-lateral', muscle: null, equipment: null }).length, 1);
});

test('kopia zachowuje ulubione i stałą notatkę, a uzgadnianie z bazą ich nie rusza', () => {
  const exercise = { ...SEED_EXERCISES[0], favorite: true, stickyNote: 'siedzenie na 4' };
  const parsed = parseBackup(JSON.stringify(buildBackup({ exercises: [exercise], workouts: [], settings: {} })));
  assert.equal(parsed.exercises[0].favorite, true);
  assert.equal(parsed.exercises[0].stickyNote, 'siedzenie na 4');
  const kept = syncExercises([{ ...exercise, name: 'Stara nazwa' }], () => false).exercises.get(exercise.id);
  assert.equal(kept.name, SEED_EXERCISES[0].name);
  assert.equal(kept.favorite, true);
  assert.equal(kept.stickyNote, 'siedzenie na 4');
  const plain = parseBackup(JSON.stringify(buildBackup({ exercises: [SEED_EXERCISES[0]], workouts: [], settings: {} }))).exercises[0];
  assert.equal('favorite' in plain, false);
  assert.equal('stickyNote' in plain, false);
});

test('zakres powtórzeń: jedno pole to stała liczba, a zły zakres jest odrzucany', () => {
  assert.deepEqual(parseRepRange('8', '12'), { valid: true, repRange: { min: 8, max: 12 } });
  assert.deepEqual(parseRepRange('10', ''), { valid: true, repRange: { min: 10, max: 10 } });
  assert.deepEqual(parseRepRange('', '10'), { valid: true, repRange: { min: 10, max: 10 } });
  assert.deepEqual(parseRepRange('', ' '), { valid: true, repRange: null });
  assert.equal(parseRepRange('12', '8').valid, false);
  assert.equal(parseRepRange('0', '8').valid, false);
  assert.equal(parseRepRange('abc', '8').valid, false);
  assert.equal(parseRepRange('8', '500').valid, false);
});

test('rutyna: zakres przechodzi przez kopię, a zły wypada bez odrzucania rutyny', () => {
  const known = new Set(['a']);
  const routine = (repRange) => [{ id: 'r', name: 'x', exercises: [{ exerciseId: 'a', sets: ['normal'], repRange }] }];
  assert.deepEqual(cleanRoutines(routine({ min: 8, max: 12 }), known)[0].exercises[0].repRange, { min: 8, max: 12 });
  assert.equal('repRange' in cleanRoutines(routine({ min: 12, max: 8 }), known)[0].exercises[0], false);
  assert.equal('repRange' in cleanRoutines(routine('dużo'), known)[0].exercises[0], false);
});

test('rutyna z treningu: pomija ćwiczenia bez serii, a różnice wykrywa po treści', () => {
  const base = { id: 'r', name: 'x', exercises: [{ exerciseId: 'a', sets: ['normal', 'normal'], repRange: { min: 8, max: 12 } }, { exerciseId: 'b', sets: ['normal'] }] };
  const draft = {
    exercises: [
      { exerciseId: 'a', repRange: { min: 8, max: 12 }, sets: [{ kind: 'normal', done: true }, { kind: 'normal', done: false }] },
      { exerciseId: 'b', sets: [{ kind: 'normal', done: false }] },
      { exerciseId: 'c', sets: [] },
    ],
  };
  const same = routineFromWorkout(draft, base);
  assert.equal(same.exercises.length, 2);
  assert.equal(routineDiffers(base, same), false, 'nieodhaczona seria to jeszcze nie zmiana rutyny');
  draft.exercises[1].sets.push({ kind: 'failure' });
  assert.equal(routineDiffers(base, routineFromWorkout(draft, base)), true);
  const reordered = { ...base, exercises: [...base.exercises].reverse() };
  assert.equal(routineDiffers(base, reordered), true);
});

test('propozycja ciężaru: tylko gdy wszystkie liczone serie sięgnęły górnej granicy', () => {
  const range = { min: 8, max: 12 };
  assert.deepEqual(suggestNextWeight([set(60, 12), set(60, 12)], range, 'Sztanga'), { weight: 62.5, reason: 'range' });
  assert.equal(suggestNextWeight([set(20, 12)], range, 'Hantle').weight, 22);
  assert.equal(suggestNextWeight([set(60, 12), set(60, 11)], range, 'Sztanga'), null);
  assert.equal(suggestNextWeight([set(60, 12)], null, 'Sztanga'), null);
  assert.equal(suggestNextWeight([], range, 'Sztanga'), null);
  assert.equal(suggestNextWeight([set(0, 12)], range, 'Sztanga'), null);
  const mixed = [set(20, 5, { kind: 'warmup' }), set(60, 12), set(60, 13, { kind: 'failure' }), set(40, 6, { kind: 'drop' })];
  assert.equal(suggestNextWeight(mixed, range, 'Sztanga').weight, 62.5);
});

test('propozycja ciężaru z RPE: lekkie serie podnoszą ciężar, a RPE 10 go wstrzymuje', () => {
  const range = { min: 8, max: 12 };
  const rated = (rpe) => set(30, 8, { rpe });
  assert.deepEqual(suggestNextWeight([rated(7), rated(6)], null, 'Sztanga'), { weight: 32.5, reason: 'rpe' });
  assert.deepEqual(suggestNextWeight([rated(7)], range, 'Hantle'), { weight: 32, reason: 'rpe' });
  assert.equal(suggestNextWeight([rated(8), rated(7)], null, 'Sztanga'), null);
  assert.equal(suggestNextWeight([rated(7), set(30, 8)], null, 'Sztanga'), null, 'nieoceniona seria nie może być uznana za lekką');
  assert.equal(suggestNextWeight([set(60, 12, { rpe: 9 }), set(60, 12, { rpe: 10 })], range, 'Sztanga'), null);
  assert.equal(suggestNextWeight([set(60, 12, { rpe: 9 }), set(60, 12, { rpe: 9 })], range, 'Sztanga').reason, 'range');
  assert.equal(suggestNextWeight([set(20, 5, { kind: 'warmup', rpe: 10 }), rated(7)], null, 'Sztanga').reason, 'rpe', 'rozgrzewka się nie liczy');
});

test('najlepsza seria: szacowany maks, a przy remisie lżejsza ocena', () => {
  assert.deepEqual(bestSet([set(30, 10), set(32.5, 4), set(20, 5, { kind: 'warmup' })], 'weight'), set(30, 10));
  assert.deepEqual(bestSet([set(30, 8, { rpe: 9 }), set(30, 8, { rpe: 8 }), set(30, 8)], 'weight'), set(30, 8, { rpe: 8 }));
  assert.deepEqual(bestSet([set(10, 5), set(0, 20)], 'bodyweight'), set(10, 5));
  assert.equal(bestSet([{ seconds: 40, kind: 'normal' }, { seconds: 60, kind: 'normal' }], 'time').seconds, 60);
  assert.equal(bestSet([set(20, 5, { kind: 'warmup' })], 'weight'), null);
});

test('zmiana względem poprzedniego razu: ciężar, powtórzenia, czas i sam spadek RPE', () => {
  const text = (now, before, type = 'weight') => {
    const change = compareSets(now, before, type);
    return [nbsp(fmtSetChange(change)), change.direction];
  };
  assert.deepEqual(text(set(32.5, 8), set(30, 8)), ['+2,5 kg', 1]);
  assert.deepEqual(text(set(30, 9), set(30, 8)), ['+1 powt.', 1]);
  assert.deepEqual(text(set(32.5, 6), set(30, 8)), ['+2,5 kg, −2 powt.', 1]);
  assert.deepEqual(text(set(32.5, 4), set(30, 8)), ['+2,5 kg, −4 powt.', -1]);
  assert.deepEqual(text(set(30, 8), set(30, 8)), ['Bez zmian', 0]);
  assert.deepEqual(text(set(30, 8, { rpe: 8 }), set(30, 8, { rpe: 9 })), ['RPE 9 → 8', 1]);
  assert.deepEqual(text(set(30, 8, { rpe: 9 }), set(30, 8, { rpe: 8 })), ['RPE 8 → 9', -1]);
  assert.deepEqual(text(set(30, 8, { rpe: 8 }), set(30, 8)), ['Bez zmian', 0]);
  assert.deepEqual(text({ seconds: 70, kind: 'normal' }, { seconds: 60, kind: 'normal' }, 'time'), ['+10 s', 1]);
  assert.deepEqual(text(set(0, 12), set(0, 10), 'bodyweight'), ['+2 powt.', 1]);
});

test('porównanie treningu pomija nowe ćwiczenia i szuka ostatniej sesji z serią roboczą', () => {
  const byId = (id) => SEED_EXERCISES.find((e) => e.id === id);
  const older = workout('a', '2026-10-01', { squat: [set(100, 5)], 'bench-press': [set(60, 8)] });
  const onlyWarmup = workout('b', '2026-10-03', { squat: [set(40, 5, { kind: 'warmup' })] });
  const current = workout('c', '2026-10-05', { squat: [set(105, 5)], deadlift: [set(120, 5)] });
  const later = workout('d', '2026-10-07', { squat: [set(200, 5)] });
  const rows = workoutComparison(current, [later, current, onlyWarmup, older], byId);
  assert.deepEqual(rows.map((row) => [row.exerciseId, row.weight, row.direction]), [['squat', 5, 1]]);
  assert.deepEqual(workoutComparison(older, [older], byId), []);
});

test('zaniedbane partie: od najdłużej odkładanej, a rozgrzewka się nie liczy', () => {
  const lookup = (id) => SEED_EXERCISES.find((e) => e.id === id);
  const now = new Date(2026, 10, 20, 12);
  const on = (id, month, day, items) => workout(id, new Date(2026, month, day, 18).toISOString(), items);
  const history = [
    on('a', 10, 18, { squat: [set(100, 5)] }),
    on('b', 10, 8, { 'bench-press': [set(80, 5)] }),
    on('c', 10, 13, { deadlift: [set(100, 5)] }),
    on('d', 10, 19, { 'barbell-curl': [set(20, 5, { kind: 'warmup' })] }),
  ];
  const result = neglectedMuscles(history, lookup, ['Czworogłowe', 'Klatka', 'Plecy', 'Biceps'], now, 7);
  assert.deepEqual(result, [
    { muscle: 'Klatka', days: 12 },
    { muscle: 'Plecy', days: 7 },
    { muscle: 'Biceps', days: null },
  ]);
});

test('mapa mięśni pokazuje każdą partię z aplikacji poza całym ciałem', () => {
  const shapes = new Set([...Object.keys(BODY_FRONT), ...Object.keys(BODY_BACK)]);
  for (const shape of Object.keys(SHAPE_TO_MUSCLE)) assert.ok(shapes.has(shape), `brak kształtu: ${shape}`);
  const mapped = new Set(Object.values(SHAPE_TO_MUSCLE));
  assert.deepEqual(MUSCLES.filter((m) => !mapped.has(m)), ['Całe ciało']);
  assert.deepEqual([...mapped].filter((m) => !MUSCLES.includes(m)), []);
  for (const paths of [...Object.values(BODY_FRONT), ...Object.values(BODY_BACK)]) {
    assert.ok(paths.length > 0);
    assert.ok(paths.every((d) => /^[Mm]/.test(d)));
  }
});

test('szybka zmiana ciężaru: punkt wyjścia i skok', () => {
  const empty = (kind = 'normal') => set(null, null, { kind });
  assert.equal(weightStep('Hantle'), 2);
  assert.equal(weightStep('Sztanga'), 2.5);
  assert.equal(stepBaseWeight([set(60, 5)], 0, 50), 60, 'wpisany ciężar ma pierwszeństwo');
  assert.equal(stepBaseWeight([set(60, 5), empty()], 1, 50), 60, 'potem seria wyżej');
  assert.equal(stepBaseWeight([empty()], 0, 50), 50, 'potem podpowiedź');
  assert.equal(stepBaseWeight([empty()], 0, undefined), 0, 'na końcu zero');
  assert.equal(stepBaseWeight([set(40, 10, { kind: 'warmup' }), empty()], 1, 80), 80, 'rozgrzewka nie jest punktem wyjścia');
  assert.equal(stepBaseWeight([set(40, 10, { kind: 'warmup' }), empty('warmup')], 1, 80), 40);
  assert.equal(stepBaseWeight([set(60, 5), set(50, 8, { kind: 'drop' }), empty()], 2, 0), 50);
  assert.equal(steppedWeight(60, 2.5), 62.5);
  assert.equal(steppedWeight(1, -2.5), 0);
  assert.equal(steppedWeight(0.1, 0.2), 0.3);
});

test('poziom koloru mapy mięśni idzie za liczbą serii', () => {
  const levels = (muscle, counts) => counts.map((sets) => muscleLevel(sets, muscle));
  assert.deepEqual(levels('Klatka', [0, 1, 5, 6, 10, 11, 15, 16, 40]), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
  for (const legs of ['Czworogłowe', 'Dwugłowe uda', 'Pośladki', 'Łydki']) {
    assert.deepEqual(levels(legs, [0, 1, 2, 3, 5, 6, 7, 8, 20]), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
  }
});

const levelExercises = new Map([
  ['bench', { muscle: 'Klatka', type: 'weight' }],
  ['squat', { muscle: 'Czworogłowe', type: 'weight' }],
  ['burpee', { muscle: 'Całe ciało', type: 'bodyweight' }],
]);
const levelLookup = (id) => levelExercises.get(id);
const workSets = (count, weight = 50) => Array.from({ length: count }, () => ({ weight, reps: 8, seconds: null, kind: 'normal' }));
// XP bez nagród za osiągnięcia, które mają osobne testy.
const workXp = (workouts, lookup, options) => {
  const progress = levelProgress(workouts, lookup, options);
  return progress.xp - progress.achievementXp;
};
const levelWorkout = (id, date, exerciseId, sets) => ({ id, name: 'T', startedAt: date.getTime(), endedAt: date.getTime() + 1, note: '', exercises: [{ exerciseId, note: '', sets }] });

test('mnożnik serii: co 4 tygodnie o 0,1, najwyżej ×1,5', () => {
  assert.deepEqual([0, 3, 4, 7, 8, 12, 16, 20, 40].map(streakMultiplier), [1, 1, 1.1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.5]);
  assert.equal(fmtMultiplier(1.1), '×1,1');
  assert.equal(fmtMultiplier(1 + 2 * 0.1), '×1,2');
});

test('mnożnik serii: działa na XP tygodnia i zależy od tygodni przed nim', () => {
  // Pięć poniedziałków po jednym treningu, cel 1. Ten sam ciężar nie jest rekordem.
  const weeks = [5, 12, 19, 26].map((day, i) => levelWorkout(`w${i}`, new Date(2026, 9, day, 9), 'bench', workSets(4)));
  const fifth = levelWorkout('w4', new Date(2026, 10, 2, 9), 'bench', workSets(4));
  const week = 50 + 20;
  // Bez celu nie ma mnożnika.
  assert.equal(workXp([...weeks, fifth], levelLookup), 5 * week);
  // Pierwsze cztery tygodnie bez mnożnika, piąty ×1,1, także premia za cel.
  assert.equal(workXp(weeks, levelLookup, { weeklyGoal: 1 }), 4 * (week + 150));
  assert.equal(workXp([...weeks, fifth], levelLookup, { weeklyGoal: 1 }), 4 * (week + 150) + Math.round((week + 150) * 1.1));
  // Przerwa zeruje serię, a tydzień z tarczą nie.
  const afterGap = levelWorkout('w5', new Date(2026, 10, 9, 9), 'bench', workSets(4));
  const gap = [...weeks, afterGap];
  assert.equal(workXp(gap, levelLookup, { weeklyGoal: 1 }), 5 * (week + 150));
  assert.equal(workXp(gap, levelLookup, { weeklyGoal: 1, shieldedWeeks: ['2026-11-02'] }), 4 * (week + 150) + Math.round((week + 150) * 1.1));
  const gain = workoutGain([...weeks, fifth], fifth, levelLookup, { weeklyGoal: 1 });
  assert.equal(gain.multiplier, 1.1);
  assert.equal(gain.xp, Math.round((week + 150) * 1.1));
  assert.equal(workoutGain([...weeks, fifth], fifth, levelLookup).multiplier, 1);
});

test('stan serii: mnożnik tygodnia i ile brakuje do następnego', () => {
  const on = (m, d) => levelWorkout(`${m}-${d}`, new Date(2026, m, d, 9), 'bench', workSets(1));
  const now = new Date(2026, 10, 6, 12);
  assert.equal(streakStatus([], null, [], now), null);
  assert.deepEqual(streakStatus([], 1, [], now), { streak: 0, multiplier: 1, next: { multiplier: 1.1, left: 4 } });
  const three = [on(9, 12), on(9, 19), on(9, 26)];
  assert.deepEqual(streakStatus(three, 1, [], now), { streak: 3, multiplier: 1, next: { multiplier: 1.1, left: 1 } });
  // Cel w tym tygodniu domyka czwarty tydzień: ×1,1 dopiero od następnego.
  assert.deepEqual(streakStatus([...three, on(10, 2)], 1, [], now), { streak: 4, multiplier: 1, next: { multiplier: 1.1, left: 0 } });
  const four = [on(9, 5), ...three];
  assert.deepEqual(streakStatus(four, 1, [], now), { streak: 4, multiplier: 1.1, next: { multiplier: 1.2, left: 4 } });
  const twenty = Array.from({ length: 20 }, (_, i) => levelWorkout(`t${i}`, new Date(2026, 9, 26 - i * 7, 9), 'bench', workSets(1)));
  assert.deepEqual(streakStatus(twenty, 1, [], now), { streak: 20, multiplier: 1.5, next: null });
});

test('XP: trening raz dziennie, seria za 5, a seria na nogi za 10', () => {
  const monday = new Date(2026, 10, 2, 9);
  assert.equal(workXp([], levelLookup), 0);
  assert.equal(levelProgress([], levelLookup).level, 1);
  assert.equal(workXp([levelWorkout('a', monday, 'bench', workSets(4))], levelLookup), 50 + 20);
  assert.equal(workXp([levelWorkout('a', monday, 'squat', workSets(4))], levelLookup), 50 + 40);
  // Drugi trening tego samego dnia daje tylko serie. Ten sam ciężar nie jest rekordem.
  const twice = [levelWorkout('a', monday, 'bench', workSets(1)), levelWorkout('b', new Date(2026, 10, 2, 18), 'bench', workSets(1))];
  assert.equal(workXp(twice, levelLookup), 50 + 5 + 5);
});

test('XP: rozgrzewka nie daje punktów, a trening z samą rozgrzewką też nie', () => {
  const warmup = [{ weight: 20, reps: 10, seconds: null, kind: 'warmup' }];
  assert.equal(workXp([levelWorkout('a', new Date(2026, 10, 2, 9), 'bench', warmup)], levelLookup), 0);
});

test('XP: tygodniowy limit serii na partię, od nowa w kolejnym tygodniu', () => {
  const week1 = levelWorkout('a', new Date(2026, 10, 2, 9), 'bench', workSets(30));
  const sameWeek = levelWorkout('b', new Date(2026, 10, 8, 9), 'bench', workSets(5));
  const week2 = levelWorkout('c', new Date(2026, 10, 9, 9), 'bench', workSets(5));
  assert.equal(workXp([week1], levelLookup), 50 + 16 * 5);
  assert.equal(workXp([week1, sameWeek], levelLookup), 100 + 16 * 5);
  assert.equal(workXp([week1, sameWeek, week2], levelLookup), 150 + 21 * 5);
  assert.equal(workXp([levelWorkout('a', new Date(2026, 10, 2, 9), 'squat', workSets(30))], levelLookup), 50 + 8 * 10);
});

test('XP: rekord i cel tygodniowy, a pierwszy raz nie jest rekordem', () => {
  const first = levelWorkout('a', new Date(2026, 10, 2, 9), 'bench', workSets(1, 50));
  const better = levelWorkout('b', new Date(2026, 10, 3, 9), 'bench', workSets(1, 60));
  const plain = 2 * 50 + 2 * 5;
  assert.equal(workXp([first, better], levelLookup), plain + 100);
  assert.equal(workXp([first, better], levelLookup, { weeklyGoal: 2 }), plain + 100 + 150);
  assert.equal(workXp([first, better], levelLookup, { weeklyGoal: 3 }), plain + 100);
});

test('poziom główny: próg rośnie z kwadratem, a bez wagi partie nie mają wyniku', () => {
  const body = levelProgress([levelWorkout('a', new Date(2026, 10, 2, 9), 'burpee', workSets(10))], levelLookup);
  // Trening 50 XP, serie 50 XP i pierwszy trening jako osiągnięcie 50 XP.
  assert.equal(body.xp, 150);
  assert.equal(body.level, 2);
  assert.equal(body.toNext, 250);
  assert.equal(body.share, 50 / 300);
  assert.equal(body.muscles.length, 11);
  assert.ok(body.muscles.every((row) => row.level === null));
});

const seedLookup = (id) => SEED_EXERCISES.find((e) => e.id === id);
const lift = (weight, reps, kind = 'normal') => ({ weight, reps, seconds: null, kind });
const strengthOf = (workouts, bodyWeights, muscle) => levelProgress(workouts, seedLookup, { bodyWeights }).muscles.find((row) => row.muscle === muscle);
const at75 = [{ day: '2026-01-01', kg: 75 }];

test('siła partii: 30 kg × 6 na hantel przy 75 kg to 96% masy ciała, z poprawką na masę w poziomie', () => {
  const row = strengthOf([levelWorkout('a', new Date(2026, 10, 2, 9), 'db-incline', [lift(30, 6)])], at75, 'Klatka');
  assert.ok(Math.abs(row.ratio - 0.96) < 1e-9);
  assert.equal(row.level, 13);
  assert.equal(strengthCategory(row.level), 'Średnio zaawansowany');
  assert.equal(row.exercise, 'Wyciskanie hantli na ławce skośnej');
  assert.ok(Math.abs(row.nextRatio - (1.4 * 13) / 19 / (75 / 80) ** 0.35) < 1e-9);
  assert.ok(row.share > 0 && row.share < 1);
});

test('siła partii: jeden hantel, podciąganie i ciężar liczony przez ograniczoną liczbę powtórzeń', () => {
  const ratio = (id, set, kg = 80) => strengthRatio(seedLookup(id), set, kg);
  assert.equal(ratio('db-row', lift(40, 1)), 0.5);
  assert.equal(ratio('db-curl', lift(10, 1)), 0.25);
  assert.equal(ratio('bench-press', lift(80, 1)), 1);
  assert.equal(ratio('bench-press', lift(40, 30)), ratio('bench-press', lift(40, 12)));
  assert.equal(ratio('pull-up', lift(null, 1)), 1);
  assert.equal(ratio('pull-up', lift(20, 1)), 1.25);
  assert.equal(ratio('crunch', lift(null, 20)), 0);
  assert.equal(ratio('bench-press', lift(0, 5)), 0);
  assert.equal(ratio('bench-press', lift(80, 1), 0), 0);
});

test('siła partii: najlepszy wynik zostaje z wagą z tamtego dnia, a rozgrzewka się nie liczy', () => {
  const weights = [{ day: '2026-06-01', kg: 100 }, { day: '2026-01-01', kg: 50 }];
  const early = levelWorkout('a', new Date(2026, 1, 2, 9), 'bench-press', [lift(50, 1)]);
  const late = levelWorkout('b', new Date(2026, 6, 2, 9), 'bench-press', [lift(50, 1)]);
  assert.equal(strengthOf([early], weights, 'Klatka').ratio, 1);
  assert.equal(strengthOf([early, late], weights, 'Klatka').ratio, 1);
  assert.equal(strengthOf([late], weights, 'Klatka').ratio, 0.5);
  const warmup = levelWorkout('c', new Date(2026, 6, 2, 9), 'bench-press', [lift(200, 1, 'warmup')]);
  assert.equal(strengthOf([warmup], weights, 'Klatka').level, null);
});

test('siła partii: bez wagi i przy ćwiczeniu bez normy nie ma wyniku, a powyżej normy jest poziom najwyższy', () => {
  const heavy = levelWorkout('a', new Date(2026, 10, 2, 9), 'bench-press', [lift(500, 1)]);
  assert.equal(strengthOf([heavy], [], 'Klatka').level, null);
  const top = strengthOf([heavy], at75, 'Klatka');
  assert.equal(top.level, 20);
  assert.equal(top.share, 1);
  assert.equal(top.nextRatio, null);
  const assisted = levelWorkout('b', new Date(2026, 10, 2, 9), 'machine-assisted-pull-up', [lift(60, 8)]);
  assert.equal(strengthOf([assisted], at75, 'Plecy').level, null);
});

test('siła partii: przysiad i martwy ciąg liczą się też do innych partii nóg', () => {
  const squat = levelWorkout('a', new Date(2026, 10, 2, 9), 'squat', [lift(100, 1)]);
  assert.equal(strengthOf([squat], at75, 'Czworogłowe').exercise, 'Przysiad ze sztangą');
  assert.equal(strengthOf([squat], at75, 'Pośladki').exercise, 'Przysiad ze sztangą');
  assert.equal(strengthOf([squat], at75, 'Dwugłowe uda').exercise, 'Przysiad ze sztangą');
  assert.ok(strengthOf([squat], at75, 'Dwugłowe uda').level < strengthOf([squat], at75, 'Czworogłowe').level);
  assert.equal(strengthOf([squat], at75, 'Łydki').level, null);
  const deadlift = levelWorkout('b', new Date(2026, 10, 3, 9), 'deadlift', [lift(100, 1)]);
  assert.equal(strengthOf([deadlift], at75, 'Plecy').exercise, 'Martwy ciąg');
  assert.equal(strengthOf([deadlift], at75, 'Dwugłowe uda').exercise, 'Martwy ciąg');
});

test('siła partii: wolne ciężary mają pierwszeństwo przed maszyną i wyciągiem', () => {
  const day = (d) => new Date(2026, 10, d, 9);
  const machine = levelWorkout('a', day(2), 'machine-press', [lift(150, 1)]);
  const cable = levelWorkout('b', day(3), 'cable-fly', [lift(10, 1)]);
  const lightBarbell = levelWorkout('c', day(4), 'bench-press', [lift(40, 1)]);
  const heavyBarbell = levelWorkout('d', day(5), 'bench-press', [lift(60, 1)]);
  const nextMachine = levelWorkout('e', day(6), 'machine-press', [lift(200, 1)]);

  // Bez wolnych ciężarów liczy się najlepszy wynik z maszyny i wyciągu.
  assert.equal(strengthOf([machine, cable], at75, 'Klatka').exercise, 'Wyciskanie na maszynie');
  // Wolny ciężar wygrywa nawet wtedy, gdy jego wynik jest niższy.
  const free = strengthOf([machine, lightBarbell], at75, 'Klatka');
  assert.equal(free.exercise, 'Wyciskanie sztangi na ławce płaskiej');
  assert.ok(free.level < strengthOf([machine], at75, 'Klatka').level);
  // Kolejność treningów nie ma znaczenia, a większy ciężar wolny poprawia wynik.
  assert.equal(strengthOf([lightBarbell, nextMachine], at75, 'Klatka').exercise, 'Wyciskanie sztangi na ławce płaskiej');
  assert.equal(strengthOf([lightBarbell, heavyBarbell, nextMachine], at75, 'Klatka').ratio, 60 / 75);
  // Podciąganie to masa ciała, więc też ma pierwszeństwo przed maszyną.
  const pullUp = levelWorkout('f', day(2), 'pull-up', [lift(null, 1)]);
  const row = levelWorkout('g', day(3), 'machine-row', [lift(200, 1)]);
  assert.equal(strengthOf([row, pullUp], at75, 'Plecy').exercise, 'Podciąganie nachwytem');
  // Martwy ciąg liczy się do pleców przed maszyną.
  const deadlift = levelWorkout('h', day(4), 'deadlift', [lift(60, 1)]);
  assert.equal(strengthOf([row, deadlift], at75, 'Plecy').exercise, 'Martwy ciąg');
});

test('siła partii: 140 kg przy 80 kg to zaawansowany, a przy większej masie ten sam procent daje więcej', () => {
  const strong = strengthOf([levelWorkout('a', new Date(2026, 10, 2, 9), 'bench-press', [lift(140, 1)])], [{ day: '2026-01-01', kg: 80 }], 'Klatka');
  assert.equal(strong.ratio, 1.75);
  assert.equal(strong.level, 17);
  assert.equal(strengthCategory(strong.level), 'Zaawansowany');
  const heavier = strengthOf([levelWorkout('b', new Date(2026, 10, 2, 9), 'bench-press', [lift(175, 1)])], [{ day: '2026-01-01', kg: 100 }], 'Klatka');
  assert.equal(heavier.ratio, 1.75);
  assert.ok(heavier.level > strong.level);
  assert.ok(heavier.nextRatio < 2);
});

test('siła partii: normy z danych zawodników i mniejsza poprawka na masę w martwym ciągu', () => {
  const weights = (kg) => [{ day: '2026-01-01', kg }];
  const at = (id, load, kg, muscle) => strengthOf([levelWorkout('a', new Date(2026, 10, 2, 9), id, [lift(load, 1)])], weights(kg), muscle);
  assert.equal(at('squat', 240, 80, 'Czworogłowe').level, 20);
  assert.equal(at('deadlift', 276, 80, 'Plecy').level, 20);
  assert.equal(at('deadlift', 200, 80, 'Plecy').level, 14);
  // Masa ciała pomaga w martwym ciągu mniej, więc przy 125 kg poprawka jest tam większa niż w wyciskaniu.
  const factor = ({ level, nextRatio }, top) => (top * level) / 19 / nextRatio;
  const press = factor(at('bench-press', 125, 125, 'Klatka'), 2);
  const pull = factor(at('deadlift', 125, 125, 'Plecy'), 3.45);
  assert.ok(Math.abs(press - (125 / 80) ** 0.35) < 1e-9);
  assert.ok(Math.abs(pull - (125 / 80) ** 0.5) < 1e-9);
  assert.ok(pull > press);
});

test('nazwy poziomów siły', () => {
  assert.deepEqual([1, 5, 6, 10, 11, 15, 16, 19, 20].map(strengthCategory), ['Początkujący', 'Początkujący', 'Nowicjusz', 'Nowicjusz', 'Średnio zaawansowany', 'Średnio zaawansowany', 'Zaawansowany', 'Zaawansowany', 'Elita']);
});

test('siła partii: ćwiczenie na nogi daje partii pomocniczej 10% wyniku, dopóki nie ma ćwiczenia wprost na nią', () => {
  const day = (d) => new Date(2026, 10, d, 9);
  const lunge = levelWorkout('a', day(2), 'barbell-lunge', [lift(100, 1)]);
  assert.equal(strengthOf([lunge], at75, 'Pośladki').exercise, 'Wykroki w tył ze sztangą');
  assert.ok(strengthOf([lunge], at75, 'Pośladki').level <= 2);
  // Maszyna wprost na pośladki wygrywa z wykrokami, a wolny ciężar wprost z maszyną.
  const abduction = levelWorkout('b', day(3), 'hip-abduction', [lift(20, 1)]);
  assert.equal(strengthOf([lunge, abduction], at75, 'Pośladki').exercise, 'Odwodzenie nóg na maszynie');
  const thrust = levelWorkout('c', day(4), 'hip-thrust', [lift(40, 1)]);
  assert.equal(strengthOf([lunge, abduction, thrust], at75, 'Pośladki').exercise, 'Wypychanie bioder ze sztangą');
  // Przysiad na mocnej normie liczy się jak wolny ciężar, więc wygrywa z maszyną na pośladki.
  const squat = levelWorkout('d', day(5), 'squat', [lift(60, 1)]);
  const heavyAbduction = levelWorkout('e', day(6), 'hip-abduction', [lift(200, 1)]);
  assert.equal(strengthOf([squat, heavyAbduction], at75, 'Pośladki').exercise, 'Przysiad ze sztangą');
});

test('góra ciała: wyciskanie i wiosłowanie liczą się tylko do partii głównej', () => {
  const day = new Date(2026, 10, 2, 9);
  const bench = levelWorkout('a', day, 'bench-press', [lift(100, 1)]);
  const row = levelWorkout('b', day, 'barbell-row', [lift(100, 1)]);
  const press = levelWorkout('c', day, 'ohp', [lift(50, 1)]);
  for (const muscle of ['Triceps', 'Biceps', 'Przedramiona']) {
    assert.equal(strengthOf([bench, row, press], at75, muscle).level, null, muscle);
  }
  assert.equal(strengthOf([bench], at75, 'Barki').level, null);
  const lookup = (id) => SEED_EXERCISES.find((e) => e.id === id);
  assert.deepEqual(musclesOf(lookup('bench-press')), [['Klatka', 1]]);
  assert.deepEqual(musclesOf(lookup('barbell-row')), [['Plecy', 1]]);
  assert.deepEqual(musclesOf(lookup('deadlift')), [['Plecy', 1], ['Dwugłowe uda', 0.5], ['Pośladki', 0.5]]);
  const upper = new Set(['Klatka', 'Plecy', 'Barki', 'Biceps', 'Triceps', 'Przedramiona', 'Brzuch']);
  for (const [id, muscles] of HELPER_MUSCLES) assert.deepEqual(muscles.filter((m) => upper.has(m)), [], id);
});

test('kolor poziomu siły: co pięć poziomów, a bez wyniku szary', () => {
  assert.deepEqual([null, 0, 1, 5, 6, 10, 11, 15, 16, 20].map(strengthColour), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
});

test('normy siły obejmują wszystkie ćwiczenia z ciężarem poza świadomymi wyjątkami', () => {
  const skipped = SEED_EXERCISES.filter((e) => e.type === 'weight' && !STRENGTH_TOPS[e.id]).map((e) => e.id).sort();
  assert.deepEqual(skipped, ['assisted-dip', 'barbell-thruster', 'clean-press', 'db-clean', 'db-snatch', 'machine-assisted-pull-up', 'power-clean', 'wrist-roller']);
  const ids = new Set(SEED_EXERCISES.map((e) => e.id));
  assert.deepEqual(Object.keys(STRENGTH_TOPS).filter((id) => !ids.has(id)), []);
  assert.deepEqual(Object.keys(STRENGTH_ALSO).filter((id) => !STRENGTH_TOPS[id]), []);
  for (const norms of Object.values(STRENGTH_ALSO)) assert.deepEqual(Object.keys(norms).filter((m) => !MUSCLES.includes(m)), []);
  assert.deepEqual([...ONE_DUMBBELL].filter((id) => seedLookup(id)?.equipment !== 'Hantle'), []);
  assert.deepEqual([...LIFTS_BODY].filter((id) => seedLookup(id)?.type !== 'bodyweight' || !STRENGTH_TOPS[id]), []);
});

test('zysk z treningu to różnica historii, razem z awansami siły', () => {
  const earlier = levelWorkout('a', new Date(2026, 10, 2, 9), 'bench-press', workSets(4, 50));
  const today = levelWorkout('b', new Date(2026, 10, 3, 9), 'bench-press', workSets(4, 60));
  const options = { bodyWeights: at75 };
  const gain = workoutGain([today, earlier], today, seedLookup, options);
  assert.equal(gain.xp, 50 + 20 + 100);
  // Przed: 70 XP i 50 XP za pierwszy trening, po: jeszcze 170 XP.
  assert.equal(gain.before.xp, 120);
  assert.equal(gain.after.xp, 290);
  assert.deepEqual(gain.muscleUps.map((row) => row.muscle), ['Klatka']);
  assert.ok(gain.muscleUps[0].level > gain.before.muscles.find((row) => row.muscle === 'Klatka').level);
  const same = levelWorkout('c', new Date(2026, 10, 4, 9), 'bench-press', workSets(1, 50));
  assert.deepEqual(workoutGain([same, today], same, seedLookup, options).muscleUps, []);
});

test('przerwa po rozgrzewce jest krótka, ale nie dłuższa od ustawionej', () => {
  assert.equal(restAfterSet({ kind: 'warmup' }, 120), 45);
  assert.equal(restAfterSet({ kind: 'warmup' }, 30), 30);
  assert.equal(restAfterSet({ kind: 'warmup' }, 0), 0);
  assert.equal(restAfterSet({ kind: 'normal' }, 120), 120);
  assert.equal(restAfterSet({ kind: 'drop' }, 120), 120);
});

test('przypomnienie o kopii: co tydzień, ale tylko gdy są nowe treningi', () => {
  const day = 86400000;
  const now = 100 * day;
  const workouts = [{ endedAt: now - day }, { endedAt: now - 2 * day }, { endedAt: now - 20 * day }];
  assert.deepEqual(backupStatus([], null, now), { unsaved: 0, due: false });
  assert.deepEqual(backupStatus(workouts, null, now), { unsaved: 3, due: true });
  assert.deepEqual(backupStatus(workouts, now - 7 * day, now), { unsaved: 2, due: true });
  assert.deepEqual(backupStatus(workouts, now - 6 * day, now), { unsaved: 2, due: false });
  assert.deepEqual(backupStatus(workouts, now - 12 * 3600000, now), { unsaved: 0, due: false });
  assert.deepEqual(backupStatus([{ endedAt: now - 20 * day }], now - 10 * day, now), { unsaved: 0, due: false });
});

test('rozgrzewka: gryf, 50% i 75%, bez powtórek i bez ciężaru roboczego', () => {
  const plan = (weight, equipment) => warmupSets(weight, equipment).map((set) => [set.weight, set.reps]);
  assert.deepEqual(plan(100, 'Sztanga'), [[20, 10], [50, 8], [75, 4]]);
  assert.deepEqual(plan(40, 'Sztanga'), [[20, 10], [30, 4]]);
  assert.deepEqual(plan(25, 'Sztanga'), [[20, 10]]);
  assert.deepEqual(plan(20, 'Sztanga'), []);
  assert.deepEqual(plan(30, 'Hantle'), [[16, 8], [22, 4]]);
  assert.deepEqual(plan(60, 'Maszyna'), [[30, 8], [45, 4]]);
  assert.deepEqual(plan(2, 'Hantle'), []);
  assert.deepEqual(plan(0, 'Sztanga'), []);
  assert.ok(warmupSets(100, 'Sztanga').every((set) => set.kind === 'warmup' && !set.done));
});

test('zamiana ćwiczenia: odhaczone serie zostają, reszta przechodzi pusta', () => {
  const done = { weight: 60, reps: 8, seconds: null, kind: 'normal', done: true };
  const open = { weight: 60, reps: null, seconds: null, kind: 'failure', done: false };
  const item = { exerciseId: 'a', note: 'bark', sets: [done, open], repRange: { min: 8, max: 12 } };

  const split = swapExercise(item, 'b');
  assert.deepEqual(split.kept.sets, [done]);
  assert.equal(split.kept.exerciseId, 'a');
  assert.equal(split.kept.note, 'bark');
  assert.deepEqual(split.fresh, {
    exerciseId: 'b',
    note: '',
    sets: [{ weight: null, reps: null, seconds: null, kind: 'failure', done: false }],
    repRange: { min: 8, max: 12 },
  });
  assert.equal(item.sets.length, 2, 'oryginał zostaje na wypadek cofnięcia');

  const whole = swapExercise({ exerciseId: 'a', note: 'bark', sets: [open] }, 'b');
  assert.equal(whole.kept, null);
  assert.equal(whole.fresh.note, 'bark');
  assert.equal('repRange' in whole.fresh, false);
});

test('CSV: jeden wiersz na serię, od najstarszego, w formacie polskiego Excela', () => {
  const exercises = new Map([['a', { name: 'Wyciskanie; leżąc', muscle: 'Klatka', equipment: 'Sztanga' }], ['b', { name: 'Plank', muscle: 'Brzuch', equipment: 'Masa ciała' }]]);
  const at = (hour) => new Date(2026, 10, 5, hour, 5).getTime();
  const workouts = [
    { name: 'Nowszy', startedAt: at(18), note: '', exercises: [{ exerciseId: 'b', note: '', sets: [{ weight: null, reps: null, seconds: 60, kind: 'normal' }] }] },
    { name: '=Starszy', startedAt: at(9), note: 'Mówił "dobrze"', exercises: [{ exerciseId: 'a', note: '', sets: [
      { weight: 20, reps: 10, seconds: null, kind: 'warmup' },
      { weight: 62.5, reps: 8, seconds: null, kind: 'normal', rpe: 8 },
    ] }] },
  ];
  const lines = workoutsCsv(workouts, (id) => exercises.get(id)).split('\r\n');
  assert.ok(lines[0].startsWith('﻿Data;Godzina;Trening;'));
  assert.ok(lines[0].includes(';Czas (s);RPE;Notatka do ćwiczenia;'));
  assert.equal(lines[1], `2026-11-05;09:05;'=Starszy;"Wyciskanie; leżąc";Klatka;Sztanga;R;Rozgrzewkowa;20;10;;;;"Mówił ""dobrze"""`);
  assert.equal(lines[2], `2026-11-05;09:05;'=Starszy;"Wyciskanie; leżąc";Klatka;Sztanga;1;Robocza;62,5;8;;8;;"Mówił ""dobrze"""`);
  assert.equal(lines[3], '2026-11-05;18:05;Nowszy;Plank;Brzuch;Masa ciała;1;Robocza;;;60;;;');
  assert.equal(lines[4], '');
});

test('legenda mapy mięśni pokazuje te same progi co kolory', () => {
  assert.deepEqual(MUSCLE_SCALES.map(({ name, levels }) => [name, levels.map(({ label }) => label)]), [
    ['Góra', ['1–5', '6–10', '11–15', '16+']],
    ['Nogi', ['1–2', '3–5', '6–7', '8+']],
  ]);
});

test('wiek rośnie dopiero w dniu urodzin', () => {
  assert.equal(ageOn('2000-06-15', new Date(2026, 5, 14)), 25);
  assert.equal(ageOn('2000-06-15', new Date(2026, 5, 15)), 26);
  assert.equal(ageOn('2000-06-15', new Date(2026, 11, 31)), 26);
  assert.equal(ageOn('2000-06-15', new Date(2027, 0, 1)), 26);
});

test('isDay odrzuca nieistniejące daty, a dayTime liczy dzień lokalnie', () => {
  assert.equal(isDay('2026-02-28'), true);
  assert.equal(isDay('2026-02-30'), false);
  assert.equal(isDay('2026-2-3'), false);
  assert.equal(isDay(null), false);
  assert.equal(dayKey(dayTime('2026-03-01')), '2026-03-01');
});

test('dziennik wagi: jeden wpis na dzień, od najnowszego', () => {
  let list = putWeight([], { day: '2026-11-01', kg: 80 });
  list = putWeight(list, { day: '2026-11-03', kg: 79.5 });
  list = putWeight(list, { day: '2026-11-02', kg: 80.2 });
  assert.deepEqual(list.map((w) => w.day), ['2026-11-03', '2026-11-02', '2026-11-01']);

  list = putWeight(list, { day: '2026-11-02', kg: 81 });
  assert.equal(list.length, 3);
  assert.equal(list[1].kg, 81);

  const moved = putWeight(list, { day: '2026-10-30', kg: 81 }, '2026-11-02');
  assert.deepEqual(moved.map((w) => w.day), ['2026-11-03', '2026-11-01', '2026-10-30']);

  assert.deepEqual(removeWeight(moved, '2026-11-01').map((w) => w.day), ['2026-11-03', '2026-10-30']);
});

test('zmiana wagi jest liczona do wcześniejszego wpisu i zaokrąglana', () => {
  const list = [{ day: '2026-11-03', kg: 80.3 }, { day: '2026-11-02', kg: 80.1 }];
  assert.equal(weightChange(list, 0), 0.2);
  assert.equal(weightChange(list, 1), null);
});

test('kopia zachowuje profil i dziennik wagi', () => {
  const data = {
    exercises: [],
    workouts: [],
    settings: {},
    profile: { birthDate: '2000-06-15', heightCm: 180 },
    bodyWeights: [{ day: '2026-11-01', kg: 80 }, { day: '2026-11-03', kg: 79.5 }],
  };
  const parsed = parseBackup(JSON.stringify(buildBackup(data)));
  assert.deepEqual(parsed.profile, data.profile);
  assert.deepEqual(parsed.bodyWeights.map((w) => w.day), ['2026-11-03', '2026-11-01']);
});

test('kopia bez profilu wczytuje się z pustymi danymi, a zły wpis wagi jest odrzucany', () => {
  const base = { app: 'krazek', version: 1, exercises: [], workouts: [] };
  const old = parseBackup(JSON.stringify(base));
  assert.deepEqual(old.profile, { birthDate: null, heightCm: null });
  assert.deepEqual(old.bodyWeights, []);
  assert.throws(() => parseBackup(JSON.stringify({ ...base, bodyWeights: [{ day: '2026-11-01', kg: 'dużo' }] })), /dziennik wagi/);
  assert.equal(cleanWeights([{ day: '2026-02-30', kg: 80 }]), null);
  assert.deepEqual(cleanProfile({ birthDate: 'wczoraj', heightCm: 180 }), { birthDate: null, heightCm: 180 });
});

test('rutyna z treningu pamięta ćwiczenia i rodzaje serii, ale nie ciężary', () => {
  const source = workout('a', '2026-11-01', { squat: [set(60, 10, { kind: 'warmup' }), set(100, 5), set(100, 5)] });
  const routine = routineFromWorkout(source, { id: 'r1', name: 'Dzień nóg' });
  assert.deepEqual(routine, { id: 'r1', name: 'Dzień nóg', exercises: [{ exerciseId: 'squat', sets: ['warmup', 'normal', 'normal'] }] });
  assert.equal(routineSetCount(routine), 3);
});

test('rutyny: edycja podmienia wpis, a nazwa nie może się powtórzyć', () => {
  const first = { id: 'r1', name: 'Dzień nóg', exercises: [] };
  const list = putRoutine(putRoutine([], first), { id: 'r2', name: 'Plecy', exercises: [] });
  assert.equal(list.length, 2);
  assert.equal(putRoutine(list, { ...first, name: 'Nogi' })[0].name, 'Nogi');
  assert.equal(isNameTaken(list, 'dzień NÓG'), true);
  assert.equal(isNameTaken(list, 'Dzień nóg', 'r1'), false);
  assert.equal(hasOwnName({ name: 'Trening poranny' }), false);
  assert.equal(hasOwnName({ name: 'Dzień nóg' }), true);
});

test('kopia zachowuje rutyny i odrzuca takie z nieznanym ćwiczeniem', () => {
  const exercises = SEED_EXERCISES.slice(0, 1);
  const routines = [{ id: 'r1', name: 'Dzień nóg', exercises: [{ exerciseId: exercises[0].id, sets: ['normal'] }] }];
  const parsed = parseBackup(JSON.stringify(buildBackup({ exercises, workouts: [], settings: {}, routines })));
  assert.deepEqual(parsed.routines, routines);

  const base = { app: 'krazek', version: 1, exercises: [], workouts: [] };
  assert.deepEqual(parseBackup(JSON.stringify(base)).routines, []);
  assert.throws(() => parseBackup(JSON.stringify({ ...base, routines })), /rutyny/);
  assert.equal(cleanRoutines([{ id: 'r', name: 'x', exercises: [{ exerciseId: 'a', sets: ['zła'] }] }], new Set(['a'])), null);
});

test('starsza kopia z usuniętym trybem dźwięku nadal się wczytuje', () => {
  const base = { app: 'krazek', version: 1, exercises: [], workouts: [] };
  const { settings } = parseBackup(JSON.stringify({ ...base, settings: { restSec: 90, lockedAudio: true } }));
  assert.deepEqual(settings, { restSec: 90 });
});

test('sklep: saldo, zakup, założenie, a poziom liczy się dalej z całego XP', () => {
  const start = cleanShop(undefined);
  assert.deepEqual(start, { owned: [], worn: {}, spent: 0, inscription: '', shields: 0, shieldedWeeks: [] });
  assert.equal(spendable(2000, start), 2000);
  assert.equal(buyItem(start, 'bar-copper', 1499), null, 'za mało XP');
  assert.equal(buyItem(start, 'nieznany', 99999), null);
  assert.equal(buyItem(start, 'bar-steel', 99999), null, 'podstawowy jest już Twój');

  const copper = buyItem(start, 'bar-copper', 2000);
  assert.equal(copper.spent, 1500);
  assert.equal(spendable(2000, copper), 500);
  assert.equal(wornItem(copper, 'bar').id, 'bar-copper');
  assert.equal(buyItem(copper, 'bar-copper', 99999), null, 'drugi raz nie kupisz');
  assert.equal(buyItem(copper, 'bar-black', 2000), null, 'wydane XP się nie liczy');

  const steel = wearItem(copper, 'bar-steel');
  assert.equal(wornItem(steel, 'bar').id, 'bar-steel');
  assert.equal(steel.spent, 1500, 'zmiana nie kosztuje');
  assert.equal(wornItem(wearItem(steel, 'bar-copper'), 'bar').id, 'bar-copper');
  assert.equal(wearItem(steel, 'bar-black'), null, 'nie założysz niekupionego');
  assert.deepEqual(wornLooks(copper), ['look-bar-copper', 'look-plates-colour', 'look-clamp-steel', 'look-theme-graphite', 'look-accent-blue']);
});

test('sklep: usunięty trening nie daje salda poniżej zera, a zakupy zostają', () => {
  const shop = buyItem(cleanShop(undefined), 'title-iron', 500);
  assert.equal(spendable(100, shop), 0);
  assert.equal(shownTitle(shop), 'Żelazny');
  assert.equal(shownTitle(cleanShop(undefined)), '');
});

test('sklep: napis widać dopiero po kupieniu i ma limit znaków', () => {
  const free = { ...cleanShop(undefined), inscription: 'Bez kupna' };
  assert.equal(shownInscription(free), '');
  const bought = buyItem(free, 'inscription', 1000);
  assert.equal(bought.worn.inscription, undefined);
  assert.equal(shownInscription(bought), 'Bez kupna');
  assert.equal(cleanInscription(`  ${'a'.repeat(30)}  `).length, INSCRIPTION_MAX);
  assert.equal(cleanInscription(7), '');
});

test('kopia zachowuje zakupy, a obce dane ze sklepu przepadają', () => {
  const shop = buyItem(buyItem(cleanShop(undefined), 'bar-copper', 5000), 'theme-black', 5000);
  const data = { exercises: SEED_EXERCISES, workouts: [], settings: {}, shop: { ...shop, inscription: 'Forma' } };
  assert.deepEqual(parseBackup(JSON.stringify(buildBackup(data))).shop, { ...shop, inscription: 'Forma' });
  assert.deepEqual(parseBackup(JSON.stringify(buildBackup({ ...data, shop: undefined }))).shop, cleanShop(undefined));
  assert.deepEqual(cleanShop({ owned: ['bar-copper', 'bar-copper', 'bar-steel', 'zmyslony'], worn: { bar: 'bar-black', plates: 'plates-gold', theme: 'theme-graphite', clamp: 'bar-copper' }, spent: -5 }), {
    owned: ['bar-copper'],
    worn: { theme: 'theme-graphite', bar: 'bar-copper' },
    spent: 0,
    inscription: '',
    shields: 0,
    shieldedWeeks: [],
  });
  assert.deepEqual(cleanShop({ shields: 2.5, shieldedWeeks: ['2026-11-02', 7, 'wczoraj'] }).shieldedWeeks, ['2026-11-02']);
  assert.equal(cleanShop({ shields: 2.5 }).shields, 0);
  assert.equal(cleanShop({ shields: 3 }).shields, 3);
});

test('tarcza: można kupić kilka, a każda zużywa się na jeden tydzień', () => {
  const one = buyItem(cleanShop(undefined), 'shield', 5000);
  const two = buyItem(one, 'shield', 5000);
  assert.deepEqual([two.shields, two.spent, two.owned], [2, 4000, []]);
  assert.equal(buyItem(two, 'shield', 5000), null, 'na trzecią brakuje XP');
  const used = useShields(two, ['2026-10-26']);
  assert.deepEqual([used.shields, used.shieldedWeeks], [1, ['2026-10-26']]);
});

test('tarcza: ratuje serię tylko wtedy, gdy jest co ratować i tarcz starczy', () => {
  const now = new Date(2026, 10, 6, 12);
  const inWeek = (monthDay, count) => Array.from({ length: count }, (_, i) => workout(`${monthDay}-${i}`, `2026-${monthDay}T10:0${i}:00`, { squat: [set(100, 5)] }));
  const earlier = [...inWeek('10-05', 2), ...inWeek('10-12', 2), ...inWeek('10-19', 2)];
  // Zeszły tydzień (26.10) bez celu, a wcześniej trzy tygodnie z rzędu.
  assert.deepEqual(weeksToShield(earlier, 2, [], 1, now), ['2026-10-26']);
  assert.deepEqual(weeksToShield(earlier, 2, [], 0, now), []);
  assert.deepEqual(weeksToShield(earlier, null, [], 3, now), [], 'bez celu tarcze nie działają');
  assert.equal(goalProgress(earlier, 2, now).streak, 0);
  assert.equal(goalProgress(earlier, 2, now, ['2026-10-26']).streak, 3, 'tydzień z tarczą nie dolicza się');
  assert.deepEqual(weeksToShield(earlier, 2, ['2026-10-26'], 1, now), [], 'druga tarcza nie schodzi na ten sam tydzień');
  // Bieżący tydzień z wykonanym celem dolicza się do serii.
  assert.equal(goalProgress([...earlier, ...inWeek('11-03', 2)], 2, now, ['2026-10-26']).streak, 4);
  // Zeszły tydzień udany: nie ma czego ratować.
  assert.deepEqual(weeksToShield(inWeek('10-27', 2), 2, [], 3, now), []);
  // Dwa tygodnie przerwy: jedna tarcza nie uratuje serii, więc nie przepada.
  const gap = [...inWeek('10-05', 2), ...inWeek('10-12', 2)];
  assert.deepEqual(weeksToShield(gap, 2, [], 1, now), []);
  assert.deepEqual(weeksToShield(gap, 2, [], 2, now), ['2026-10-26', '2026-10-19']);
  // Brak treningów w ogóle: tarcze zostają.
  assert.deepEqual(weeksToShield([], 2, [], 5, now), []);
});

test('katalog sklepu: każde miejsce ma darmowy start, a identyfikatory się nie powtarzają', () => {
  assert.equal(new Set(SHOP_ITEMS.map((item) => item.id)).size, SHOP_ITEMS.length);
  for (const { slot } of SHOP_SECTIONS.filter((section) => section.slot !== 'inscription' && section.slot !== 'shield')) {
    assert.equal(SHOP_ITEMS.filter((item) => item.slot === slot && item.price === 0).length, 1, slot);
  }
});

test('kopia zapasowa przechodzi w obie strony', () => {
  const data = {
    exercises: SEED_EXERCISES,
    workouts: [workout('a', '2026-10-01', { squat: [set(100, 5)] })],
    settings: { restSec: 150 },
  };
  const parsed = parseBackup(JSON.stringify(buildBackup(data)));
  assert.equal(parsed.exercises.length, SEED_EXERCISES.length);
  assert.equal(parsed.workouts[0].exercises[0].sets[0].weight, 100);
  assert.equal(parsed.settings.restSec, 150);
});

test('kopia zapasowa odrzuca obce i uszkodzone pliki', () => {
  assert.throws(() => parseBackup('nie json'), /nie jest kopią/);
  assert.throws(() => parseBackup('{"foo":1}'), /nie jest kopią/);
  const base = { app: 'krazek', version: 1, exercises: [], workouts: [] };
  assert.throws(() => parseBackup(JSON.stringify({ ...base, version: 99 })), /nowszej wersji/);
  assert.throws(() => parseBackup(JSON.stringify({ ...base, workouts: [{ id: 'x' }] })), /uszkodzona/);
  const orphan = { id: 'x', startedAt: 1, exercises: [{ exerciseId: 'brak', sets: [] }] };
  assert.throws(() => parseBackup(JSON.stringify({ ...base, workouts: [orphan] })), /nieznanego/);
});

test('baza ćwiczeń: unikalne identyfikatory, nazwy i poprawne kategorie', () => {
  assert.equal(new Set(SEED_EXERCISES.map((e) => e.id)).size, SEED_EXERCISES.length);
  assert.equal(new Set(SEED_EXERCISES.map((e) => e.name)).size, SEED_EXERCISES.length);
  for (const e of SEED_EXERCISES) {
    assert.ok(MUSCLES.includes(e.muscle), e.id);
    assert.ok(EQUIPMENT.includes(e.equipment), e.id);
  }
  assert.equal(nbsp(fmtVolume(10000)), '10 t');
});

const achieved = (workouts, lookup = levelLookup, options) => achievementProgress(workouts, lookup, options).filter((item) => item.done).map((item) => item.id);
const achievedOne = (exerciseId, weight, reps = 1, kind = 'normal') => achieved(
  [levelWorkout('a', new Date(2026, 10, 2, 9), exerciseId, [{ weight, reps, seconds: null, kind }])],
  seedLookup,
).filter((id) => id !== 'workouts-1');

test('osiągnięcia: lista ma poprawne grupy, stałe nagrody i kolory krążków', () => {
  assert.equal(new Set(ACHIEVEMENTS.map((item) => item.id)).size, ACHIEVEMENTS.length);
  assert.ok(ACHIEVEMENTS.every((item) => ACHIEVEMENT_GROUPS.includes(item.group) && item.xp > 0 && item.target > 0));
  assert.equal(ACHIEVEMENTS.reduce((sum, item) => sum + item.xp, 0), 40700);
  assert.equal(ACHIEVEMENTS.length, 42);
  assert.deepEqual([50, 200, 300, 800, 1000, 2000, 2500, 5000].map(rewardTier), ['green', 'green', 'yellow', 'yellow', 'blue', 'blue', 'red', 'red']);
});

test('osiągnięcia: trening liczy się tylko z serią roboczą, a nagroda wpada raz', () => {
  const warmup = [{ weight: 20, reps: 10, seconds: null, kind: 'warmup' }];
  assert.deepEqual(achieved([]), []);
  assert.deepEqual(achieved([levelWorkout('a', new Date(2026, 10, 2, 9), 'bench', warmup)]), []);
  const ten = Array.from({ length: 10 }, (_, i) => levelWorkout(`w${i}`, new Date(2026, 9, 1 + i, 9), 'bench', workSets(1)));
  assert.deepEqual(achieved(ten.slice(0, 9)), ['workouts-1']);
  assert.deepEqual(achieved(ten), ['workouts-1', 'workouts-10']);
  assert.equal(achievementXp(achievementProgress(ten, levelLookup)), 50 + 150);
});

test('osiągnięcia siły: prawdziwy ciężar z właściwego ćwiczenia, bez rozgrzewki', () => {
  assert.deepEqual(achievedOne('squat', 100), ['lift-100']);
  assert.deepEqual(achievedOne('deadlift', 150), ['lift-100', 'lift-150']);
  assert.deepEqual(achievedOne('sumo-deadlift', 100), ['lift-100']);
  assert.deepEqual(achievedOne('squat', 97.5, 5), []);
  assert.deepEqual(achievedOne('squat', 100, 1, 'warmup'), []);
  assert.deepEqual(achievedOne('hack-squat', 100), []);
  assert.deepEqual(achievedOne('bench-press', 100), ['bench-100']);
  assert.deepEqual(achievedOne('bench-press', 99), []);
  assert.deepEqual(achievedOne('incline-bench', 100), []);
  assert.deepEqual(achievedOne('db-bench', 30), ['dumbbell-30']);
  assert.deepEqual(achievedOne('db-row', 40), ['dumbbell-30', 'dumbbell-40']);
  assert.deepEqual(achievedOne('barbell-row', 40), []);
});

test('najdłuższa seria: przerwa jej nie zabiera, tarcza nie przerywa, a bez celu jej nie ma', () => {
  const on = (m, d) => levelWorkout(`${m}-${d}`, new Date(2026, m, d, 9), 'bench', workSets(1));
  const three = [on(9, 5), on(9, 12), on(9, 19)];
  const later = on(10, 2);
  assert.equal(bestStreak([], 1), 0);
  assert.equal(bestStreak(three, null), 0);
  assert.equal(bestStreak(three, 2), 0);
  assert.equal(bestStreak([...three, later], 1), 3);
  assert.equal(bestStreak([...three, later], 1, ['2026-10-26']), 4);
  assert.ok(achieved([...three, later], levelLookup, { weeklyGoal: 1, shieldedWeeks: ['2026-10-26'] }).includes('streak-4'));
  assert.ok(!achieved([...three, later], levelLookup, { weeklyGoal: 1 }).includes('streak-4'));
  assert.ok(!achieved([...three, later], levelLookup).includes('streak-4'));
});

test('osiągnięcia: tonaż, rekordy, wszystkie partie w tygodniu i pora treningu', () => {
  const heavy = levelWorkout('a', new Date(2026, 10, 2, 9), 'bench', [{ weight: 1000, reps: 100, seconds: null, kind: 'normal' }]);
  assert.ok(achieved([heavy]).includes('tonnage-100'));
  assert.ok(!achieved([heavy]).includes('tonnage-500'));
  assert.equal(achievementProgress([heavy], levelLookup).find((item) => item.id === 'tonnage-100').value, 100000);
  const tenRecords = Array.from({ length: 10 }, (_, i) => ({ workoutId: `r${i}` }));
  assert.ok(achieved([], levelLookup, { records: tenRecords }).includes('records-10'));
  assert.ok(!achieved([], levelLookup, { records: tenRecords }).includes('workout-records'));

  const muscles = ['Klatka', 'Plecy', 'Barki', 'Biceps', 'Triceps', 'Przedramiona', 'Czworogłowe', 'Dwugłowe uda', 'Pośladki', 'Łydki', 'Brzuch'];
  const lookup = (id) => ({ muscle: id, type: 'weight' });
  const workoutOn = (day, list) => ({ ...levelWorkout(`m${day}`, new Date(2026, 10, day, 9), list[0], workSets(1)), exercises: list.map((exerciseId) => ({ exerciseId, note: '', sets: workSets(1) })) });
  assert.ok(achieved([workoutOn(2, muscles.slice(0, 6)), workoutOn(5, muscles.slice(6))], lookup).includes('all-muscles'));
  // Ta sama lista rozbita na dwa tygodnie się nie liczy.
  assert.ok(!achieved([workoutOn(2, muscles.slice(0, 6)), workoutOn(9, muscles.slice(6))], lookup).includes('all-muscles'));

  const at = (hour, minute = 0) => achieved([levelWorkout('a', new Date(2026, 10, 2, hour, minute), 'bench', workSets(1))]);
  assert.ok(at(6, 59).includes('early'));
  assert.ok(!at(7).includes('early'));
  assert.ok(!at(21, 59).includes('late'));
  assert.ok(at(22).includes('late'));
});

test('osiągnięcia: nagroda bez mnożnika, a podsumowanie pokazuje tylko nowe', () => {
  const weeks = [5, 12, 19, 26].map((day, i) => levelWorkout(`w${i}`, new Date(2026, 9, day, 9), 'bench-press', workSets(1, 60)));
  const strong = levelWorkout('w4', new Date(2026, 10, 2, 9), 'bench-press', workSets(1, 100));
  const options = { weeklyGoal: 1 };
  const gain = workoutGain([...weeks, strong], strong, seedLookup, options);
  assert.deepEqual(gain.newAchievements.map((item) => item.id), ['bench-100']);
  // Trening, seria, cel i rekord są pod mnożnikiem ×1,1, a 1000 XP za ławkę już nie.
  assert.equal(gain.xp, Math.round((50 + 5 + 150 + 100) * 1.1) + 1000);
  const again = levelWorkout('w5', new Date(2026, 10, 9, 9), 'bench-press', workSets(1, 100));
  assert.deepEqual(workoutGain([...weeks, strong, again], again, seedLookup, options).newAchievements, []);
});

const dayWorkout = (id, date, list) => ({ id, name: 'T', startedAt: date.getTime(), endedAt: date.getTime() + 3600000, note: '', exercises: list.map(([exerciseId, sets]) => ({ exerciseId, note: '', sets })) });
const oneSet = (weight, reps = 1, kind = 'normal') => [{ weight, reps, seconds: null, kind }];
const has = (workouts, id, options, lookup = seedLookup) => achievementProgress(workouts, lookup, options).find((item) => item.id === id);

test('osiągnięcia względem wagi: waga z dnia treningu, a bez wpisu wagi nic nie wpada', () => {
  const bench = dayWorkout('a', new Date(2026, 10, 2, 9), [['bench-press', oneSet(80)]]);
  const weights = (kg) => ({ bodyWeights: [{ day: '2026-11-01', kg }] });
  assert.equal(has([bench], 'body-bench', weights(80)).done, true);
  assert.equal(has([bench], 'body-bench', weights(80)).value, 100);
  assert.equal(has([bench], 'body-bench', weights(81)).done, false);
  assert.equal(has([bench], 'body-bench').done, false);
  // Późniejsza zmiana wagi nie zabiera osiągnięcia.
  const later = { bodyWeights: [{ day: '2026-12-01', kg: 95 }, { day: '2026-11-01', kg: 80 }] };
  assert.equal(has([bench], 'body-bench', later).done, true);
  const squat = dayWorkout('b', new Date(2026, 10, 2, 9), [['squat', oneSet(120)]]);
  assert.equal(has([squat], 'body-squat', weights(80)).done, true);
  const deadlift = dayWorkout('c', new Date(2026, 10, 2, 9), [['sumo-deadlift', oneSet(160)]]);
  assert.equal(has([deadlift], 'body-deadlift', weights(80)).done, true);
  // Rozgrzewka się nie liczy.
  const warmup = dayWorkout('d', new Date(2026, 10, 2, 9), [['bench-press', oneSet(200, 1, 'warmup')]]);
  assert.equal(has([warmup], 'body-bench', weights(80)).done, false);
});

test('trzy boje: suma najlepszych ciężarów, a wyższe progi działają', () => {
  const workouts = [
    dayWorkout('a', new Date(2026, 10, 2, 9), [['squat', oneSet(130)], ['bench-press', oneSet(100)]]),
    dayWorkout('b', new Date(2026, 10, 3, 9), [['deadlift', oneSet(170)], ['sumo-deadlift', oneSet(150)], ['squat', oneSet(90)]]),
  ];
  assert.equal(has(workouts, 'total-400').value, 400);
  assert.equal(has(workouts, 'total-400').done, true);
  assert.equal(has(workouts, 'total-500').done, false);
  assert.equal(has(workouts, 'lift-200').done, false);
  assert.equal(has([dayWorkout('c', new Date(2026, 10, 2, 9), [['deadlift', oneSet(200)]])], 'lift-200').done, true);
  assert.equal(has([dayWorkout('d', new Date(2026, 10, 2, 9), [['bench-press', oneSet(120)]])], 'bench-120').done, true);
});

test('krążki i mapa: czerwony krążek, czerwona sztanga i zielona mapa', () => {
  const lookup = (id) => ({ id, muscle: id, type: 'weight' });
  const red = (id, date) => dayWorkout(id, date, [['Klatka', workSets(20)]]);
  const weaker = dayWorkout('w', new Date(2026, 10, 4, 9), [['Klatka', workSets(19)]]);
  assert.equal(has([weaker], 'red-plate', {}, lookup).done, false);
  assert.equal(has([weaker], 'red-plate', {}, lookup).value, 19);
  assert.equal(has([red('a', new Date(2026, 10, 2, 9))], 'red-plate', {}, lookup).done, true);

  const two = [red('a', new Date(2026, 10, 2, 9)), red('b', new Date(2026, 10, 3, 9))];
  assert.equal(has(two, 'red-bar', { weeklyGoal: 2 }, lookup).done, true);
  // Bez celu, przy niewykonanym celu albo z jednym słabszym krążkiem nie ma czerwonej sztangi.
  assert.equal(has(two, 'red-bar', {}, lookup).done, false);
  assert.equal(has(two, 'red-bar', { weeklyGoal: 3 }, lookup).done, false);
  assert.equal(has([...two, weaker], 'red-bar', { weeklyGoal: 2 }, lookup).done, false);

  const legs = new Set(['Czworogłowe', 'Dwugłowe uda', 'Pośladki', 'Łydki']);
  const muscles = ['Klatka', 'Plecy', 'Barki', 'Biceps', 'Triceps', 'Przedramiona', 'Czworogłowe', 'Dwugłowe uda', 'Pośladki', 'Łydki', 'Brzuch'];
  const greenWeek = (shortBy) => dayWorkout('g', new Date(2026, 10, 2, 9), muscles.map((muscle) => [muscle, workSets((legs.has(muscle) ? 8 : 16) - (muscle === 'Brzuch' ? shortBy : 0))]));
  assert.equal(has([greenWeek(0)], 'green-map', {}, lookup).done, true);
  assert.equal(has([greenWeek(1)], 'green-map', {}, lookup).done, false);
  assert.equal(has([greenWeek(1)], 'green-map', {}, lookup).value, 10);
});

test('jeden trening i wytrwałość: tonaż treningu, rekordy, godziny, serie i różne ćwiczenia', () => {
  const heavy = dayWorkout('a', new Date(2026, 10, 2, 9), [['bench', [{ weight: 100, reps: 100, seconds: null, kind: 'normal' }]]]);
  assert.equal(has([heavy], 'workout-10t', {}, levelLookup).done, true);
  const split = [dayWorkout('b', new Date(2026, 10, 2, 9), [['bench', [{ weight: 100, reps: 60, seconds: null, kind: 'normal' }]]]), dayWorkout('c', new Date(2026, 10, 3, 9), [['bench', [{ weight: 100, reps: 60, seconds: null, kind: 'normal' }]]])];
  assert.equal(has(split, 'workout-10t', {}, levelLookup).done, false);

  const inOne = Array.from({ length: 5 }, () => ({ workoutId: 'x' }));
  assert.equal(has([], 'workout-records', { records: inOne }, levelLookup).done, true);
  assert.equal(has([], 'workout-records', { records: inOne.slice(1) }, levelLookup).value, 4);

  const hour = dayWorkout('d', new Date(2026, 10, 2, 9), [['bench', workSets(1)]]);
  assert.equal(has([hour], 'hours-100', {}, levelLookup).value, 3600000);
  // Trening z samą rozgrzewką nie dolicza ani czasu, ani ćwiczenia.
  const warmup = dayWorkout('e', new Date(2026, 10, 3, 9), [['squat', oneSet(50, 5, 'warmup')]]);
  assert.equal(has([hour, warmup], 'hours-100', {}, levelLookup).value, 3600000);
  assert.equal(has([hour, warmup], 'exercises-25', {}, levelLookup).value, 1);
  assert.equal(has([hour, warmup], 'sets-1000', {}, levelLookup).value, 1);
});

test('okazje: powrót dopiero po 30 dniach przerwy, a Nowy Rok tylko 1 stycznia', () => {
  const at = (id, date) => dayWorkout(id, date, [['bench', workSets(1)]]);
  const first = at('a', new Date(2026, 9, 1, 9));
  assert.equal(has([first], 'comeback', {}, levelLookup).done, false);
  assert.equal(has([first, at('b', new Date(2026, 9, 30, 9))], 'comeback', {}, levelLookup).done, false);
  assert.equal(has([at('c', new Date(2026, 9, 31, 9)), first], 'comeback', {}, levelLookup).done, true);
  // Trening z samą rozgrzewką nie przerywa przerwy.
  const warmup = dayWorkout('d', new Date(2026, 9, 15, 9), [['bench', oneSet(20, 5, 'warmup')]]);
  assert.equal(has([first, warmup, at('e', new Date(2026, 9, 31, 9))], 'comeback', {}, levelLookup).done, true);
  assert.equal(has([at('f', new Date(2027, 0, 1, 10))], 'new-year', {}, levelLookup).done, true);
  assert.equal(has([at('g', new Date(2027, 0, 2, 10))], 'new-year', {}, levelLookup).done, false);
});

test('sklep: nowe przedmioty zakłada się jak pozostałe, a efekty można wyłączyć', () => {
  const empty = cleanShop(null);
  assert.equal(themeColor(empty), '#181C21');
  assert.equal(hasChalkDust(empty), false);
  assert.equal(hasRecordSparks(empty), false);

  const navy = buyItem(empty, 'theme-navy', 2000);
  assert.equal(navy.spent, 2000);
  assert.equal(themeColor(navy), '#101A2B');
  assert.ok(SHOP_ITEMS.filter((item) => item.slot === 'theme').every((item) => /^#[0-9A-F]{6}$/.test(item.themeColor)));

  const teal = buyItem(navy, 'accent-teal', 3500);
  assert.ok(wornLooks(teal).includes('look-accent-teal'));
  assert.ok(wornLooks(teal).includes('look-theme-navy'));

  const chalk = buyItem(empty, 'dust-chalk', 2500);
  assert.equal(hasChalkDust(chalk), true);
  assert.equal(hasChalkDust(wearItem(chalk, 'dust-none')), false);
  // Wyłączony efekt nadal jest kupiony, więc można go włączyć bez płacenia.
  assert.equal(hasChalkDust(wearItem(wearItem(chalk, 'dust-none'), 'dust-chalk')), true);
  assert.equal(hasRecordSparks(buyItem(empty, 'spark-on', 2500)), true);

  // Kopia zapasowa zachowuje nowe przedmioty.
  const restored = cleanShop(JSON.parse(JSON.stringify(teal)));
  assert.deepEqual(restored.owned, ['theme-navy', 'accent-teal']);
  assert.ok(wornLooks(restored).includes('look-accent-teal'));
});
