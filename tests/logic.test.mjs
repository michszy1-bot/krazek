import { test } from 'node:test';
import assert from 'node:assert/strict';

import { addDays, dayKey, fmtClock, fmtDuration, fmtSet, fmtVolume, inputValue, parseNum, pastWorkoutStart, plural, startOfWeek } from '../js/format.js';
import { backupStatus, estimate1RM, flagRecords, goalProgress, isComplete, MUSCLE_SCALES, muscleLevel, muscleSets, neglectedMuscles, niceTicks, recordsFor, recordTimeline, restAfterSet, setLabels, stepBaseWeight, steppedWeight, suggestNextWeight, summarizeSets, swapExercise, warmupSets, weekDays, weeklyTotals, weightStep, workoutRecords, workoutVolume } from '../js/stats.js';
import { workoutsCsv } from '../js/csv.js';
import { applyFilter } from '../js/picker.js';
import { SHAPE_TO_MUSCLE } from '../js/muscle-map.js';
import { BODY_BACK, BODY_FRONT } from '../js/muscle-shapes.js';
import { buildBackup, parseBackup } from '../js/backup.js';
import { ageOn, cleanProfile, cleanWeights, dayTime, isDay, putWeight, removeWeight, weightChange, weightOn } from '../js/body.js';
import { cleanRoutines, hasOwnName, isNameTaken, moveItem, parseRepRange, putRoutine, routineDiffers, routineFromWorkout, routineSetCount } from '../js/routines.js';
import { SEED_EXERCISES, MUSCLES, EQUIPMENT, RETIRED_EXERCISES, syncExercises } from '../js/exercises.js';
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
  ]);
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
  assert.equal(suggestNextWeight([set(60, 12), set(60, 12)], range, 'Sztanga'), 62.5);
  assert.equal(suggestNextWeight([set(20, 12)], range, 'Hantle'), 22);
  assert.equal(suggestNextWeight([set(60, 12), set(60, 11)], range, 'Sztanga'), null);
  assert.equal(suggestNextWeight([set(60, 12)], null, 'Sztanga'), null);
  assert.equal(suggestNextWeight([], range, 'Sztanga'), null);
  assert.equal(suggestNextWeight([set(0, 12)], range, 'Sztanga'), null);
  const mixed = [set(20, 5, { kind: 'warmup' }), set(60, 12), set(60, 13, { kind: 'failure' }), set(40, 6, { kind: 'drop' })];
  assert.equal(suggestNextWeight(mixed, range, 'Sztanga'), 62.5);
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
      { weight: 62.5, reps: 8, seconds: null, kind: 'normal' },
    ] }] },
  ];
  const lines = workoutsCsv(workouts, (id) => exercises.get(id)).split('\r\n');
  assert.ok(lines[0].startsWith('﻿Data;Godzina;Trening;'));
  assert.equal(lines[1], `2026-11-05;09:05;'=Starszy;"Wyciskanie; leżąc";Klatka;Sztanga;R;Rozgrzewkowa;20;10;;;"Mówił ""dobrze"""`);
  assert.equal(lines[2], `2026-11-05;09:05;'=Starszy;"Wyciskanie; leżąc";Klatka;Sztanga;1;Robocza;62,5;8;;;"Mówił ""dobrze"""`);
  assert.equal(lines[3], '2026-11-05;18:05;Nowszy;Plank;Brzuch;Masa ciała;1;Robocza;;;60;;');
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
