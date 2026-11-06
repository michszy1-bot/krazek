import { test } from 'node:test';
import assert from 'node:assert/strict';

import { addDays, dayKey, fmtClock, fmtDuration, fmtSet, fmtVolume, inputValue, parseNum, pastWorkoutStart, plural, startOfWeek } from '../js/format.js';
import { estimate1RM, flagRecords, isComplete, muscleSets, niceTicks, recordsFor, summarizeSets, weekDays, weeklyTotals, workoutRecords, workoutVolume } from '../js/stats.js';
import { buildBackup, parseBackup } from '../js/backup.js';
import { buildTrack } from '../js/sound.js';
import { SEED_EXERCISES, MUSCLES, EQUIPMENT } from '../js/exercises.js';

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

test('nagranie przerwy: poprawny WAV, cisza do końca odliczania, potem sygnał', () => {
  const rate = 8000;
  const track = buildTrack(3, rate);
  const view = new DataView(track.buffer);
  const text = (from, to) => String.fromCharCode(...track.slice(from, to));
  assert.equal(text(0, 4), 'RIFF');
  assert.equal(text(8, 12), 'WAVE');
  assert.equal(view.getUint32(24, true), rate);
  assert.equal(view.getUint32(40, true), track.length - 44);
  assert.equal(view.getUint32(4, true), track.length - 8);
  const silence = track.slice(44, 44 + 3 * rate);
  assert.ok(silence.every((v) => v === 128), 'przed sygnałem ma być sama cisza');
  const signal = track.slice(44 + 3 * rate);
  assert.ok(Math.max(...signal) > 220, 'sygnał ma być głośny');
  assert.ok(Math.min(...signal) < 36, 'sygnał ma być głośny');
});

test('kopia zapasowa zachowuje tryb dźwięku i odrzuca złą wartość', () => {
  const base = { app: 'krazek', version: 1, exercises: [], workouts: [] };
  assert.equal(parseBackup(JSON.stringify({ ...base, settings: { lockedAudio: true } })).settings.lockedAudio, true);
  assert.equal('lockedAudio' in parseBackup(JSON.stringify({ ...base, settings: { lockedAudio: 'tak' } })).settings, false);
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
