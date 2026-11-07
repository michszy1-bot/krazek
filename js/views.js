// Ekrany aplikacji poza treningiem: start, dziennik, postępy, ćwiczenia i ustawienia.

import { actionSheet, ask, emptyState, h, icon, iconButton, openSheet, pageHeader, particles, recordChip, segmented, toast } from './ui.js';
import { addDays, countOf, dayKey, fmtClock, fmtDayLong, fmtDayMedium, fmtDayShort, fmtDuration, fmtMonth, fmtMultiplier, fmtNum, fmtSet, fmtTime, fmtUnit, fmtVolume, plural, startOfWeek } from './format.js';
import { columnChart, lineChart, rankedBars } from './chart.js';
import { backupStatus, exerciseSessions, flagRecords, isWorking, loadBar, METRICS, muscleSets, neglectedMuscles, PLATE_TIERS, plateHeight, plateTier, plateTravel, plateWidth, RECORD_TYPES, recordsFor, recordTimeline, sessionEffort, SET_KINDS, setLabels, streakStatus, summarizeSets, weekDays, weeklyTotals, workingSetCount, workoutRecords, workoutVolume } from './stats.js';
import { bodyWeightChart, weightsFrom } from './profile.js';
import { dayTime, weightOn } from './body.js';
import { clearMedia, downloadMedia, isDownloadingMedia, mediaStatus } from './media.js';
import { backupText, deleteExercise, deleteWorkout, dismissShieldNote, exerciseById, isExerciseUsed, markBackedUp, previewBackup, restoreBackup, saveSettings, state, visibleExercises, wipeAll } from './store.js';
import { workoutsCsv } from './csv.js';
import { L, LANGUAGES, language, setLanguage } from './i18n.js';
import { equipmentName, MUSCLES, muscleName } from './exercises.js';
import { muscleMap } from './muscle-map.js';
import { hasChalkDust, shownInscription } from './shop.js';
import { applyFilter, exerciseFilter, exerciseForm, favoriteButton, stickyNoteSheet } from './picker.js';
import { addPastWorkout, editWorkout, repeatWorkout, resumeWorkout, startRoutine, startWorkout, stat } from './workout.js';
import { routinesSection, saveWorkoutAsRoutine } from './routine-views.js';
import { exerciseDemo, exerciseThumb } from './demo.js';
import * as sound from './sound.js';

const DAY_LETTERS = L(['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'], ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);

const workoutRecordsOf = (workout) => workoutRecords(workout, state.workouts, exerciseById);

// --- Start ---

const PLATE_EMPTY_HEIGHT = 92;

/** Numer na krążku maleje razem z nim, a na bardzo wąskim się nie mieści. */
const plateFont = (width) => (width >= 18 ? 17 : width >= 14 ? 14 : width >= 11 ? 12 : 0);

function barSide(side, { plates, empty }, { met, arrival, hadSlot }) {
  const width = plateWidth(plates.length + empty);
  const font = plateFont(width);
  const plate = (sets, extra = '', style = '') => h(`span.bar-plate.tier-${plateTier(sets)}${extra}`,
    { style: `width:${width}px;height:${plateHeight(sets)}px;font-size:${font}px;${style}` },
    font > 0 && String(sets));
  return h(`span.bar-side.bar-side-${side}`,
    plates.map((sets, i) => {
      if (!arrival) return plate(sets);
      if (i < plates.length - 1) return plate(sets, '.arrive.bar-plate-hit');
      return h('span.bar-slot', { style: `width:${width}px;height:${plateHeight(sets)}px` },
        hadSlot && h('span.bar-plate.bar-plate-empty.arrive.bar-plate-leaving', { style: `width:${width}px;height:${PLATE_EMPTY_HEIGHT}px` }),
        plate(sets, '.arrive.bar-plate-new', `--from:${plateTravel(i, width)}px`),
        hasChalkDust(state.shop) && h('span.chalk-puff', { 'aria-hidden': 'true' }, particles('chalk.arrive', 18, 42)));
    }),
    Array.from({ length: empty }, () => h('span.bar-plate.bar-plate-empty', { style: `width:${width}px;height:${PLATE_EMPTY_HEIGHT}px` })),
    met && (arrival
      ? h('span.bar-clamp.arrive', { style: `--from:${plateTravel(plates.length + empty, width)}px` })
      : h('span.bar-clamp')));
}

/** Tekst podmieniany w chwili uderzenia krążka. */
function swapText(tag, before, after, arrival) {
  if (!arrival || before === after) return h(tag, after);
  return h('span.bar-swap', h(`${tag}.arrive.bar-was`, before), h(`${tag}.arrive.bar-now`, after));
}

/** Tydzień narysowany jak ładowana sztanga: każdy trening to para krążków, a cel to pełny gryf. */
function loadedBar(weekWorkouts, arrival) {
  const goal = state.settings.weeklyGoal;
  const done = weekWorkouts.length;
  const before = arrival ? done - 1 : done;
  const load = loadBar(weekWorkouts, goal);
  const met = goal != null && done >= goal;
  const unitFor = (n) => (goal == null ? plural(n, 'trening', 'treningi', 'treningów', 'workout', 'workouts') : goal === 1 ? L('treningu', 'workout') : L('treningów', 'workouts'));
  const countFor = (n) => (goal == null ? String(n) : L(`${n} z ${goal}`, `${n} of ${goal}`));
  const sides = { met, arrival, hadSlot: goal != null && done <= goal };
  return h(`button.loaded-bar${met ? '.goal-met' : ''}`,
    { type: 'button', onclick: goalSheet, 'aria-label': goal == null ? L(`${countOf(done, 'trening', 'treningi', 'treningów')}. Ustaw cel tygodniowy`, `${countOf(done, '', '', '', 'workout', 'workouts')}. Set a weekly goal`) : L(`Cel tygodniowy: ${done} z ${goal} ${unitFor(done)}. Zmień`, `Weekly goal: ${done} of ${goal} ${unitFor(done)}. Change`) },
    barSide('left', load, sides),
    h('span.bar-collar'),
    h('span.bar-middle',
      swapText('span.bar-count', countFor(before), countFor(done), arrival),
      swapText('span.bar-unit', unitFor(before), unitFor(done), arrival),
      shownInscription(state.shop) && h('span.bar-inscription', shownInscription(state.shop))),
    h('span.bar-collar'),
    barSide('right', load, sides));
}

/** Kreska dnia: kolor jak krążek, a w dniu nowego treningu nowy kolor rozlewa się po starym. */
function weekMark(day, arrival) {
  const tier = (sets, count) => (count ? `.tier-${plateTier(sets)}` : '');
  if (!arrival || !day.workouts.includes(arrival.workout)) return h(`span.week-mark${tier(day.sets, day.workouts.length)}`);
  const setsBefore = day.sets - workingSetCount(arrival.workout);
  return h(`span.week-mark${tier(setsBefore, day.workouts.length - 1)}`,
    h(`span.week-mark-fill.arrive${tier(day.sets, 1)}`));
}

/** Pasek dni pod sztangą: kolor jak krążek tego dnia, gwiazdka za rekord. */
function weekTrack(days, arrival) {
  return h('div.week-track', days.map((day, i) => {
    const hasRecord = day.workouts.some((w) => workoutRecordsOf(w).length > 0);
    const name = `${fmtDayLong(day.date)}: ${day.workouts.length ? countOf(day.sets, 'seria', 'serie', 'serii', 'set', 'sets') : L('bez treningu', 'no workout')}${hasRecord ? L(', nowy rekord', ', new record') : ''}`;
    const content = [
      h('span.week-star', hasRecord && icon('star', 14)),
      weekMark(day, arrival),
      h(`span.day-letter${day.isToday ? '.today' : ''}`, DAY_LETTERS[i]),
    ];
    return day.workouts.length
      ? h('a.week-day', { href: `#/dziennik/${day.workouts[0].id}`, 'aria-label': name }, content)
      : h('div.week-day', { 'aria-label': name, role: 'img' }, content);
  }));
}

/**
 * Krążek świeżo zakończonego treningu. Pod podsumowaniem czeka w miejscu startu,
 * a po jego zamknięciu wjeżdża raz, dlatego wpis znika przy tym samym rysowaniu.
 */
function takeArrival(weekWorkouts) {
  const { arriving } = state;
  if (!arriving) return null;
  if (arriving.ready) state.arriving = null;
  const workout = weekWorkouts.find((w) => w.id === arriving.id);
  const isNewest = workout && weekWorkouts.every((w) => w.startedAt <= workout.startedAt);
  return isNewest ? { workout, waiting: !arriving.ready } : null;
}

function plateKey(anyRecord) {
  return h('p.plate-key',
    PLATE_TIERS.map(({ tier, label }) => h('span', h(`i.tier-${tier}`), label)),
    anyRecord && h('span', icon('star', 14), L('rekord', 'record')));
}

/** Wybór celu tygodniowego, wspólny dla ekranu startowego i ustawień. */
function goalSheet() {
  const current = state.settings.weeklyGoal;
  actionSheet(L('Cel tygodniowy', 'Weekly goal'), [
    ...[1, 2, 3, 4, 5, 6, 7].map((goal) => ({
      label: L(`${countOf(goal, 'trening', 'treningi', 'treningów')} w tygodniu`, `${countOf(goal, '', '', '', 'workout', 'workouts')} a week`),
      selected: goal === current,
      onClick: () => saveSettings({ weeklyGoal: goal }),
    })),
    { label: L('Bez celu', 'No goal'), selected: current == null, onClick: () => saveSettings({ weeklyGoal: null }) },
  ]);
}

/** Wynik tygodnia nad sztangą, razem z serią tygodni, w których cel się udał. */
function weekLine(weekWorkouts, weekSets, weekVolume) {
  const status = streakStatus(state.workouts, state.settings.weeklyGoal, state.shop.shieldedWeeks);
  return [
    weekWorkouts.length ? `${countOf(weekSets, 'seria', 'serie', 'serii', 'set', 'sets')} · ${fmtVolume(weekVolume)}` : L('Jeszcze bez treningu', 'No workouts yet'),
    status?.streak > 0 && L(`${countOf(status.streak, 'tydzień', 'tygodnie', 'tygodni')} z rzędu`, `${countOf(status.streak, '', '', '', 'week', 'weeks')} in a row`),
    status?.multiplier > 1 && `XP ${fmtMultiplier(status.multiplier)}`,
  ].filter(Boolean).join(' · ');
}

function workoutRow(workout) {
  const records = workoutRecordsOf(workout);
  const names = workout.exercises.map((i) => exerciseById(i.exerciseId)?.name).filter(Boolean).join(', ');
  return h('a.workout-row', { href: `#/dziennik/${workout.id}` },
    h('div.workout-top',
      h('span.workout-name', workout.name),
      records.length > 0 && recordChip()),
    h('p.workout-meta', `${fmtDayMedium(workout.startedAt)} · ${fmtDuration(workout.endedAt - workout.startedAt)} · ${countOf(workingSetCount(workout), 'seria', 'serie', 'serii', 'set', 'sets')} · ${fmtVolume(workoutVolume(workout))}`),
    h('p.workout-names', names));
}

export function homeView() {
  const now = new Date();
  const days = weekDays(state.workouts, now);
  const weekWorkouts = days.flatMap((d) => d.workouts);
  const weekSets = days.reduce((sum, d) => sum + d.sets, 0);
  const weekVolume = weekWorkouts.reduce((sum, w) => sum + workoutVolume(w), 0);
  const last = state.workouts[0];
  const anyRecord = weekWorkouts.some((w) => workoutRecordsOf(w).length > 0);
  const arrival = takeArrival(weekWorkouts);

  const backup = backupStatus(state.workouts, state.lastBackupAt);

  return h('div.page',
    h('header.page-head',
      h('p.eyebrow', fmtDayLong(now)),
      h('div.page-actions',
        h('a.icon-btn', { href: '#/profil', 'aria-label': L('Profil', 'Profile'), title: L('Profil', 'Profile') }, icon('person')),
        h('a.icon-btn', { href: '#/ustawienia', 'aria-label': L('Ustawienia', 'Settings'), title: L('Ustawienia', 'Settings') }, icon('gear')))),
    h(`section.week${arrival?.waiting ? '.week-waiting' : ''}`,
      h('h1.page-title', L("Ten tydzień", "This week")),
      h('p.week-line', weekLine(weekWorkouts, weekSets, weekVolume)),
      state.settings.weeklyGoal == null && h('button.goal-line.goal-empty', { type: 'button', onclick: goalSheet }, L('Ustaw cel tygodniowy', 'Set a weekly goal')),
      loadedBar(weekWorkouts, arrival),
      weekTrack(days, arrival),
      weekWorkouts.length > 0 && plateKey(anyRecord)),
    state.shieldNote && h('button.shield-note', { type: 'button', onclick: dismissShieldNote, 'aria-label': L('Tarcza uratowała serię. Ukryj', 'A shield saved your streak. Hide') },
      icon('shield', 26),
      h('span',
        h('strong', L('Tarcza uratowała serię', 'A shield saved your streak')),
        L(`${state.shieldNote.used > 1 ? `Tygodnie bez celu: ${state.shieldNote.used}` : 'Zeszły tydzień był bez celu'}, a licznik dalej biegnie. Zostało: ${countOf(state.shop.shields, 'tarcza', 'tarcze', 'tarcz')}.`, `${state.shieldNote.used > 1 ? `Weeks without the goal: ${state.shieldNote.used}` : 'Last week missed the goal'}, but the streak goes on. Shields left: ${state.shop.shields}.`))),
    state.active
      ? h('button.btn.btn-primary.btn-hero', { type: 'button', onclick: resumeWorkout }, L('Wróć do treningu', 'Back to workout'), h('span.hero-time', { dataset: { elapsedFrom: state.active.startedAt } }, fmtClock((Date.now() - state.active.startedAt) / 1000)))
      : h('button.btn.btn-primary.btn-hero', { type: 'button', onclick: startWorkout }, L('Rozpocznij trening', 'Start workout')),
    backup.due && h('button.notice', { type: 'button', onclick: exportBackup },
      h('strong', state.lastBackupAt ? L('Czas na kopię zapasową', 'Time for a backup') : L('Zrób pierwszą kopię zapasową', 'Make your first backup')),
      h('span', L(`Poza kopią: ${countOf(backup.unsaved, 'trening', 'treningi', 'treningów')}. Stuknij, żeby ją zapisać.`, `Not backed up: ${countOf(backup.unsaved, '', '', '', 'workout', 'workouts')}. Tap to save a backup.`))),
    routinesSection(startRoutine),
    last
      ? h('section.block', h('h2.block-title', L('Ostatni trening', 'Last workout')), workoutRow(last))
      : h('p.first-hint', L('Po pierwszym treningu zobaczysz tu podsumowanie i pierwszy krążek na sztandze.', 'After your first workout you’ll see a summary here and the first plate on the bar.')));
}

// --- Dziennik ---

let journalMonth = null;

function monthCalendar(month, byDay) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = startOfWeek(first);
  const today = dayKey(new Date());
  const cells = [];
  for (let date = start; cells.length < 42; date = addDays(date, 1)) {
    if (date.getMonth() !== month.getMonth() && cells.length % 7 === 0 && date > first) break;
    const key = dayKey(date);
    const inMonth = date.getMonth() === month.getMonth();
    const list = inMonth ? byDay.get(key) ?? [] : [];
    const label = `${fmtDayLong(date)}${list.length ? `: ${countOf(list.length, 'trening', 'treningi', 'treningów', 'workout', 'workouts')}` : ''}`;
    const content = [h('span.cal-num', String(date.getDate())), list.length > 0 && h('span.cal-plate')];
    const cls = `cal-day${inMonth ? '' : ' outside'}${key === today ? ' today' : ''}${list.length ? ' trained' : ''}`;
    const canAdd = inMonth && !list.length && key <= today;
    if (list.length) {
      cells.push(h('a', { class: cls, href: `#/dziennik/${list[0].id}`, 'aria-label': label }, content));
    } else if (canAdd) {
      cells.push(h('button', { class: cls, type: 'button', 'aria-label': L(`Dodaj trening: ${label}`, `Add workout: ${label}`), onclick: () => addPastWorkout(date) }, content));
    } else {
      cells.push(h('div', { class: cls, 'aria-label': inMonth ? label : null }, content));
    }
  }
  return h('div.calendar',
    DAY_LETTERS.map((d) => h('span.cal-head', d)),
    cells);
}

export function journalView() {
  const now = new Date();
  journalMonth ??= new Date(now.getFullYear(), now.getMonth(), 1);
  const host = h('div.page');

  const render = () => {
    const month = journalMonth;
    const inMonth = state.workouts.filter((w) => {
      const d = new Date(w.startedAt);
      return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    });
    const byDay = new Map();
    for (const w of [...inMonth].reverse()) {
      const key = dayKey(w.startedAt);
      byDay.set(key, [...(byDay.get(key) ?? []), w]);
    }
    const shift = (delta) => {
      journalMonth = new Date(month.getFullYear(), month.getMonth() + delta, 1);
      render();
    };
    const atCurrent = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();

    host.replaceChildren(
      pageHeader(L('Dziennik', 'History')),
      h('div.month-nav',
        iconButton('back', L('Poprzedni miesiąc', 'Previous month'), () => shift(-1)),
        h('h2.month-title', fmtMonth(month)),
        h('button.icon-btn.flip', { type: 'button', 'aria-label': L('Następny miesiąc', 'Next month'), title: L('Następny miesiąc', 'Next month'), disabled: atCurrent, onclick: () => shift(1) }, icon('back'))),
      monthCalendar(month, byDay),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => addPastWorkout() }, L('Dodaj wcześniejszy trening', 'Add a past workout')),
      inMonth.length
        ? h('section.block',
          h('h2.block-title', countOf(inMonth.length, 'trening', 'treningi', 'treningów', 'workout', 'workouts')),
          h('div.rows', inMonth.map(workoutRow)))
        : emptyState(
          state.workouts.length ? L('W tym miesiącu nie ma treningów', 'No workouts this month') : L('Dziennik jest pusty', 'Your history is empty'),
          state.workouts.length ? L('Wybierz inny miesiąc strzałkami.', 'Pick another month with the arrows.') : L('Zapisane treningi pojawią się tutaj.', 'Saved workouts will show up here.'),
        ),
    );
  };
  render();
  return host;
}

export function workoutDetailView(id) {
  const workout = state.workouts.find((w) => w.id === id);
  if (!workout) {
    return h('div.page', pageHeader(L('Trening', 'Workout'), { back: '#/dziennik' }),
      emptyState(L('Nie ma takiego treningu', 'Workout not found'), L('Mógł zostać usunięty.', 'It may have been deleted.'), h('a.btn.btn-ghost', { href: '#/dziennik' }, L('Wróć do dziennika', 'Back to history'))));
  }

  const remove = async () => {
    const confirmed = await ask({
      title: L('Usunąć ten trening?', 'Delete this workout?'),
      text: L(`${workout.name}, ${fmtDayMedium(workout.startedAt)}. Tego nie da się cofnąć.`, `${workout.name}, ${fmtDayMedium(workout.startedAt)}. This can’t be undone.`),
      confirm: L('Usuń trening', 'Delete workout'),
      danger: true,
    });
    if (!confirmed) return;
    await deleteWorkout(workout.id);
    location.hash = '#/dziennik';
    toast(L('Usunięto trening.', 'Workout deleted.'));
  };

  return h('div.page',
    pageHeader(workout.name, { back: '#/dziennik' }),
    h('p.detail-date', `${fmtDayLong(workout.startedAt)}, ${fmtTime(workout.startedAt)}`),
    h('div.stats',
      stat(L('Czas', 'Time'), fmtDuration(workout.endedAt - workout.startedAt)),
      stat(L('Objętość', 'Volume'), fmtVolume(workoutVolume(workout))),
      stat(L('Serie', 'Sets'), String(workingSetCount(workout)))),
    workout.note && h('p.detail-note', workout.note),
    workout.exercises.map((item) => {
      const exercise = exerciseById(item.exerciseId);
      if (!exercise) return null;
      const baseline = recordsFor(state.workouts, item.exerciseId, { beforeTs: workout.startedAt, excludeId: workout.id });
      const flags = flagRecords(item.sets, exercise.type, baseline);
      const labels = setLabels(item.sets);
      return h('section.detail-card',
        h('a.detail-ex', { href: `#/cwiczenie/${exercise.id}` }, exercise.name),
        item.note && h('p.detail-note', item.note),
        h('table.detail-sets', h('tbody', item.sets.map((set, i) => {
          const kind = SET_KINDS[set.kind];
          return h('tr',
            h('th', { scope: 'row', 'aria-label': kind?.mark ? kind.name : L(`Seria ${labels[i]}`, `Set ${labels[i]}`) }, labels[i]),
            h('td', fmtSet(set, exercise.type), set.rpe && h('span.detail-rpe', `RPE ${set.rpe}`)),
            h('td.right', flags[i].length > 0 && recordChip()));
        }))));
    }),
    h('div.detail-actions',
      h('button.btn.btn-primary.btn-block', { type: 'button', onclick: () => repeatWorkout(workout) }, L('Powtórz trening', 'Repeat workout')),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => saveWorkoutAsRoutine(workout) }, L('Zapisz jako rutynę', 'Save as routine')),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => editWorkout(workout) }, L('Edytuj trening', 'Edit workout')),
      h('button.btn.btn-text-danger.btn-block', { type: 'button', onclick: remove }, L('Usuń trening', 'Delete workout'))));
}

// --- Postępy ---

const RANGES_WEEKS = [
  { value: 4, label: L('4 tyg.', '4 wk') },
  { value: 12, label: L('12 tyg.', '12 wk') },
  { value: 26, label: L('6 mies.', '6 mo') },
  { value: 52, label: L('Rok', 'Year') },
];
let progressWeeks = 12;

const volumeTick = (value, max) => (max >= 10000 ? `${fmtNum(value / 1000)} t` : fmtNum(value));

/** Tabela pod wykresem, żeby każdą wartość dało się odczytać bez dymka. */
const dataTable = (summary, headers, rows) => h('details.data-table',
  h('summary', summary),
  h('table',
    h('thead', h('tr', headers.map((text) => h('th', { scope: 'col' }, text)))),
    h('tbody', rows.map((cells) => h('tr', cells.map((text) => h('td', text)))))));

const RECORDS_PREVIEW = 8;

function recordRow(entry) {
  const exercise = exerciseById(entry.exerciseId);
  return h('a.link-row.record-row', { href: `#/dziennik/${entry.workoutId}` },
    recordChip(),
    h('span.link-text',
      h('span.link-name', exercise.name),
      h('span.link-meta', entry.records.map((record) => `${record.label}: ${fmtUnit(record.value, record.unit)}`).join(' · ')),
      h('span.record-row-date', fmtDayMedium(entry.date))),
    h('span.flip', icon('back', 20)));
}

/** Pobite rekordy z wybranego okresu, od najnowszego. */
function recordsTimelineSection(from) {
  const entries = recordTimeline(state.workouts, exerciseById).filter((entry) => entry.date >= from);
  const rows = h('div.rows', entries.slice(0, RECORDS_PREVIEW).map(recordRow));
  const hiddenCount = entries.length - RECORDS_PREVIEW;
  const more = hiddenCount > 0 && h('button.btn.btn-ghost.btn-block', {
    type: 'button',
    onclick: (event) => {
      rows.append(...entries.slice(RECORDS_PREVIEW).map(recordRow));
      event.currentTarget.remove();
    },
  }, L(`Pokaż jeszcze ${fmtNum(hiddenCount)}`, `Show ${fmtNum(hiddenCount)} more`));
  return h('section.block',
    h('h2.block-title', L('Historia rekordów', 'Record history')),
    entries.length ? rows : h('p.muted', L('W tym okresie nie ma nowych rekordów.', 'No new records in this period.')),
    more);
}

const MAP_DAYS = 7;
const WHOLE_BODY = 'Całe ciało';

const neglectText = ({ muscle, days }) => (days === null
  ? L(`${muscle}: jeszcze bez serii`, `${muscleName(muscle)}: no sets yet`)
  : L(`${muscle}: ${countOf(days, 'dzień', 'dni', 'dni')} temu`, `${muscleName(muscle)}: ${countOf(days, '', '', '', 'day', 'days')} ago`));

/** Mapa i zaniedbane partie zawsze z ostatnich dni, bo to podpowiedź, co robić dalej. */
function musclesSection() {
  const rows = muscleSets(state.workouts, exerciseById, Date.now() - MAP_DAYS * 86400000);
  const wholeBody = rows.find((row) => row.muscle === WHOLE_BODY)?.sets ?? 0;
  const neglected = neglectedMuscles(state.workouts, exerciseById, MUSCLES.filter((m) => m !== WHOLE_BODY), new Date(), MAP_DAYS);
  return h('section.block',
    h('h2.block-title', L(`Mapa mięśni z ${MAP_DAYS} dni`, `Muscle map, last ${MAP_DAYS} days`)),
    muscleMap(rows),
    h('p.settings-text', L('Ćwiczenia złożone na nogi liczą się też w połowie do pozostałych partii nóg. Np. seria przysiadu to cała seria na czworogłowe oraz po pół na pośladki i dwugłowe. Góra ciała liczy się tylko do partii głównej.', 'Compound leg exercises also count as half a set for the other leg muscles. For example, a squat set is a full set for quads and half a set for glutes and hamstrings. Upper body counts only for the main muscle.')),
    wholeBody > 0 && h('p.settings-text', L(`Ćwiczenia na całe ciało: ${countOf(wholeBody, 'seria', 'serie', 'serii')}. Nie ma ich na mapie.`, `Full-body exercises: ${countOf(wholeBody, '', '', '', 'set', 'sets')}. They aren’t on the map.`)),
    h('h2.block-title.chart-second-title', L('Zaniedbane partie', 'Neglected muscles')),
    neglected.length
      ? h('ul.neglected', neglected.map((row) => h('li', neglectText(row))))
      : h('p.settings-text', L(`Każda partia była trenowana w ostatnich ${MAP_DAYS} dniach.`, `Every muscle was trained in the last ${MAP_DAYS} days.`)));
}

/** Waga ciała z tego samego okresu co wykresy powyżej. */
function progressWeightSection(from) {
  const entries = weightsFrom(from);
  return h('section.block',
    h('h2.block-title', L('Waga ciała', 'Body weight')),
    entries.length
      ? bodyWeightChart(entries, { xDomain: [from, Date.now()], height: 180 })
      : h('p.muted', L('W tym okresie nie ma wpisów wagi.', 'No weight entries in this period.')),
    h('a.btn.btn-ghost.btn-block', { href: '#/profil' }, entries.length ? L('Otwórz dziennik wagi', 'Open the weight log') : L('Dodaj wagę w profilu', 'Add your weight in Profile')));
}

export function progressView() {
  const host = h('div.page');
  if (!state.workouts.length) {
    host.append(pageHeader(L('Postępy', 'Progress')), emptyState(L('Nie ma jeszcze czego pokazać', 'Nothing to show yet'), L('Wykresy pojawią się po pierwszym zapisanym treningu.', 'Charts will appear after your first saved workout.')));
    return host;
  }

  const content = h('div.progress-content');
  const render = () => {
    const weeks = weeklyTotals(state.workouts, progressWeeks);
    const from = weeks[0].weekStart.getTime();
    const inRange = state.workouts.filter((w) => w.startedAt >= from);
    const volume = inRange.reduce((sum, w) => sum + workoutVolume(w), 0);
    const muscles = muscleSets(state.workouts, exerciseById, from);
    const hasVolume = weeks.some((w) => w.volume > 0);

    const exercises = new Map();
    for (const workout of state.workouts) {
      for (const item of workout.exercises) {
        const entry = exercises.get(item.exerciseId) ?? { last: workout.startedAt, sessions: 0 };
        entry.sessions += 1;
        exercises.set(item.exerciseId, entry);
      }
    }

    content.replaceChildren(
      h('div.stats',
        stat(L('Treningi', 'Workouts'), String(inRange.length)),
        stat(L('Objętość', 'Volume'), fmtVolume(volume)),
        stat(L('Serie', 'Sets'), fmtNum(inRange.reduce((sum, w) => sum + workingSetCount(w), 0)))),
      h('section.block',
        h('h2.block-title', L('Objętość tygodniowa', 'Weekly volume')),
        hasVolume
          ? columnChart({
            items: weeks.map((w) => ({
              tickLabel: fmtDayShort(w.weekStart),
              value: w.volume,
              tipValue: fmtVolume(w.volume),
              tipLabel: L(`Tydzień od ${fmtDayShort(w.weekStart)}`, `Week of ${fmtDayShort(w.weekStart)}`),
            })),
            formatTick: volumeTick,
            label: L(`Objętość tygodniowa z ostatnich ${weeks.length} tygodni. Dane są też w tabeli poniżej.`, `Weekly volume over the last ${weeks.length} weeks. The data is also in the table below.`),
          })
          : h('p.muted', L('W tym okresie nie ma serii z ciężarem.', 'No weighted sets in this period.')),
        dataTable(L('Pokaż tabelę', 'Show table'), L(['Tydzień od', 'Treningi', 'Objętość'], ['Week of', 'Workouts', 'Volume']), [...weeks].reverse().map((w) => [fmtDayShort(w.weekStart), String(w.workouts), fmtVolume(w.volume)]))),
      h('section.block',
        h('h2.block-title', L('Serie na partię', 'Sets per muscle')),
        muscles.length
          ? rankedBars(muscles.map((m) => ({ label: muscleName(m.muscle), value: m.sets })), (v) => fmtNum(v))
          : h('p.muted', L('W tym okresie nie ma zapisanych serii.', 'No sets logged in this period.'))),
      musclesSection(),
      progressWeightSection(from),
      recordsTimelineSection(from),
      h('section.block',
        h('h2.block-title', L('Ćwiczenia', 'Exercises')),
        h('div.rows', [...exercises.entries()].map(([id, entry]) => {
          const exercise = exerciseById(id);
          if (!exercise) return null;
          return h('a.link-row', { href: `#/cwiczenie/${id}` },
            h('span.link-text',
              h('span.link-name', exercise.name),
              h('span.link-meta', L(`${countOf(entry.sessions, 'sesja', 'sesje', 'sesji')} · ostatnio ${fmtDayShort(entry.last)}`, `${countOf(entry.sessions, '', '', '', 'session', 'sessions')} · last ${fmtDayShort(entry.last)}`))),
            h('span.flip', icon('back', 20)));
        }))),
    );
  };

  host.append(
    pageHeader(L('Postępy', 'Progress')),
    h('div.filters', segmented(RANGES_WEEKS, progressWeeks, (value) => { progressWeeks = value; render(); }, L('Zakres czasu', 'Time range'))),
    content,
  );
  render();
  return host;
}

// --- Szczegóły ćwiczenia ---

const DETAIL_RANGES = [
  { value: 90, label: L('3 mies.', '3 mo') },
  { value: 180, label: L('6 mies.', '6 mo') },
  { value: 365, label: L('Rok', 'Year') },
  { value: 0, label: L('Całość', 'All') },
];
const metricChoice = new Map();
let detailRange = 0;

export function exerciseView(id, backTo) {
  const exercise = exerciseById(id);
  if (!exercise) {
    return h('div.page', pageHeader(L('Ćwiczenie', 'Exercise'), { back: backTo }),
      emptyState(L('Nie ma takiego ćwiczenia', 'Exercise not found'), L('Mogło zostać usunięte.', 'It may have been deleted.')));
  }

  const sessions = exerciseSessions(state.workouts, id)
    .map((session) => ({ ...session, summary: summarizeSets(session.sets) }))
    .filter((session) => session.summary.setCount > 0);
  const { type } = exercise;
  const records = recordsFor(state.workouts, id);

  const actions = exercise.custom || !exercise.archived
    ? iconButton('more', L('Opcje ćwiczenia', 'Exercise options'), () => exerciseMenu(exercise, backTo))
    : null;

  const noteHost = h('div');
  const drawNote = () => {
    const note = exerciseById(id)?.stickyNote;
    noteHost.replaceChildren(note
      ? h('button.sticky-note', { type: 'button', onclick: () => stickyNoteSheet(exercise, drawNote), 'aria-label': L(`Stała notatka: ${note}. Edytuj`, `Pinned note: ${note}. Edit`) }, icon('pin', 16), h('span', note))
      : h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => stickyNoteSheet(exercise, drawNote) }, icon('pin', 18), L('Dodaj stałą notatkę', 'Add a pinned note')));
  };
  drawNote();

  const host = h('div.page',
    pageHeader(exercise.name, { back: backTo, actions: [!exercise.archived && favoriteButton(exercise), actions] }),
    h('p.detail-date', `${muscleName(exercise.muscle)} · ${equipmentName(exercise.equipment)}`),
    exerciseDemo(exercise),
    noteHost);

  if (!sessions.length) {
    host.append(emptyState(L('Brak zapisanych serii', 'No sets logged'), L('Wykres i rekordy pojawią się po pierwszym treningu z tym ćwiczeniem.', 'The chart and records will appear after your first workout with this exercise.')));
    return host;
  }

  const metrics = METRICS[type];
  let metricKey = metricChoice.get(id) ?? metrics[0].key;
  const chartHost = h('div');

  const render = () => {
    const metric = metrics.find((m) => m.key === metricKey);
    const from = detailRange ? Date.now() - detailRange * 86400000 : 0;
    const visible = sessions.filter((session) => session.date >= from && session.summary[metricKey] > 0);
    const format = (value) => fmtUnit(value, metric.unit);

    if (!visible.length) {
      chartHost.replaceChildren(h('p.muted.chart-empty', L(`Brak danych dla: ${metric.title.toLocaleLowerCase('pl')} w tym okresie.`, `No data for ${metric.title.toLowerCase()} in this period.`)));
      return;
    }

    const maxValue = Math.max(...visible.map((session) => session.summary[metricKey]));
    const formatTick = (value) => {
      if (metric.unit === 'seconds') return fmtClock(value);
      if (metric.unit === 'volume') return volumeTick(value, maxValue);
      return fmtNum(value);
    };
    // Waga ciała i wysiłek pod wynikami, z tymi samymi datami, żeby dało się porównać wykresy.
    const weights = weightsFrom(from);
    const efforts = sessions
      .filter((session) => session.date >= from)
      .map((session) => ({ date: session.date, effort: sessionEffort(session.sets) }))
      .filter((item) => item.effort);
    const times = [...visible.map((session) => session.date), ...weights.map((item) => dayTime(item.day)), ...efforts.map((item) => item.date)];
    const xDomain = weights.length || efforts.length ? [Math.min(...times), Math.max(...times)] : null;
    // Natywne replaceChildren wpisałoby false i null jako tekst, więc puste pozycje odpadają tutaj.
    chartHost.replaceChildren(...[
      h('h2.block-title', metric.title),
      lineChart({
        points: visible.map((session) => ({
          x: session.date,
          y: session.summary[metricKey],
          label: fmtDayMedium(session.date),
          value: format(session.summary[metricKey]),
        })),
        formatTick,
        formatEnd: (point) => point.value,
        formatDate: fmtDayShort,
        minStep: metric.unit === 'reps' || metric.unit === 'seconds' ? 1 : 0,
        label: L(`${metric.title}, ${exercise.name}. Dane są też w historii poniżej.`, `${metric.title}, ${exercise.name}. The data is also in the history below.`),
        xDomain,
      }),
      weights.length > 0 && h('h2.block-title.chart-second-title', L('Waga ciała', 'Body weight')),
      weights.length > 0 && bodyWeightChart(weights, { xDomain, height: 160 }),
      effortChart(efforts, sessions, exercise.name, xDomain),
      relativeStrength(visible, type),
    ].flat().filter(Boolean));
  };

  host.append(
    recordsSection(type, records),
    h('div.filters',
      segmented(DETAIL_RANGES, detailRange, (value) => { detailRange = value; render(); }, L('Zakres czasu', 'Time range')),
      metrics.length > 1 && segmented(metrics.map((m) => ({ value: m.key, label: m.label })), metricKey, (value) => {
        metricKey = value;
        metricChoice.set(id, value);
        render();
      }, L('Wskaźnik', 'Metric'))),
    h('section.block', chartHost),
    h('section.block',
      h('h2.block-title', L('Historia', 'History')),
      h('div.rows', [...sessions].reverse().map((session) => {
        const working = session.sets.filter(isWorking);
        return h('a.history-row', { href: `#/dziennik/${session.workoutId}` },
          h('span.history-date', fmtDayMedium(session.date)),
          h('span.history-sets', working.map((set) => fmtSet(set, type, { compact: true })).join(', ')));
      }))),
  );
  render();
  return host;
}

/** Średnia ocena wysiłku (RPE) z każdego treningu na stałej skali od 6 do 10. */
function effortChart(efforts, sessions, name, xDomain) {
  const title = h('h2.block-title.chart-second-title', L('Wysiłek (RPE)', 'Effort (RPE)'));
  if (!efforts.length) {
    const everRated = sessions.some((session) => sessionEffort(session.sets));
    return [title, h('p.settings-text', everRated
      ? L('Brak ocen wysiłku w tym okresie.', 'No effort ratings in this period.')
      : L('Oceniaj serie po odhaczeniu (RPE), a tu pojawi się wykres wysiłku.', 'Rate your sets after ticking them (RPE) and an effort chart will appear here.'))];
  }
  return [
    title,
    lineChart({
      points: efforts.map(({ date, effort }) => ({
        x: date,
        y: effort.average,
        label: L(`${fmtDayMedium(date)} · ocenione ${effort.rated} z ${effort.total}`, `${fmtDayMedium(date)} · ${effort.rated} of ${effort.total} rated`),
        value: `RPE ${fmtNum(effort.average)}`,
      })),
      formatTick: fmtNum,
      formatEnd: (point) => point.value,
      formatDate: fmtDayShort,
      yTicks: [6, 7, 8, 9, 10],
      height: 160,
      label: L(`Średnia ocena wysiłku, ${name}. Dane są też w historii poniżej.`, `Average effort rating, ${name}. The data is also in the history below.`),
      xDomain,
    }),
    h('p.settings-text', L('Średnia ocena serii roboczych z treningu: 10 to nic w zapasie, 6 to cztery powtórzenia i więcej. Niższa ocena przy tym samym ciężarze znaczy, że robisz się silniejszy.', 'Average rating of your working sets per workout: 10 means nothing left, 6 means four or more reps left. A lower rating at the same weight means you’re getting stronger.')),
  ];
}

/** Ostatni szacowany 1RM względem wagi ciała z tamtego dnia, np. 1,3 × masa ciała. */
function relativeStrength(sessions, type) {
  const last = sessions.at(-1);
  const body = weightOn(state.bodyWeights, dayKey(last.date));
  if (type !== 'weight' || !body || !(last.summary.est1RM > 0)) return null;
  const ratio = fmtNum(Number((last.summary.est1RM / body.kg).toFixed(2)));
  return h('p.settings-text', L(`Ostatni szacowany 1RM to ${ratio} × waga ciała (${fmtUnit(body.kg, 'kg')}).`, `Your latest estimated 1RM is ${ratio} × body weight (${fmtUnit(body.kg, 'kg')}).`));
}

function recordsSection(type, records) {
  const rows = RECORD_TYPES[type]
    .map((record) => ({ ...record, entry: records.values[record.key] }))
    .filter((record) => record.entry);
  const [hero, ...rest] = rows;
  if (!hero) return null;
  return h('section.records',
    h('p.record-hero-label', hero.label),
    h('p.record-hero', fmtUnit(hero.entry.value, hero.unit)),
    h('p.record-hero-date', fmtDayMedium(hero.entry.date)),
    rest.length > 0 && h('dl.record-grid', rest.map((record) => h('div',
      h('dt', record.label),
      h('dd', fmtUnit(record.entry.value, record.unit)),
      record.key === 'est1RM' && h('dd.record-source', fmtSet(record.entry.set, type))))));
}

function exerciseMenu(exercise, backTo) {
  const actions = [];
  if (exercise.custom) {
    actions.push({ label: L('Edytuj ćwiczenie', 'Edit exercise'), onClick: () => exerciseForm(exercise) });
  }
  actions.push({
    label: L('Usuń z listy', 'Remove from list'),
    hint: isExerciseUsed(exercise.id) ? L('Historia i wykresy zostaną', 'History and charts stay') : null,
    danger: true,
    onClick: async () => {
      const used = isExerciseUsed(exercise.id);
      const confirmed = await ask({
        title: L(`Usunąć ${exercise.name}?`, `Remove ${exercise.name}?`),
        text: used
          ? L('Ćwiczenie zniknie z listy wyboru. Zapisane treningi i wykresy zostaną.', 'The exercise will disappear from the picker. Saved workouts and charts stay.')
          : L('Ćwiczenie zniknie z listy wyboru.', 'The exercise will disappear from the picker.'),
        confirm: L('Usuń z listy', 'Remove from list'),
        danger: true,
      });
      if (!confirmed) return;
      await deleteExercise(exercise.id);
      location.hash = backTo;
      toast(L('Usunięto ćwiczenie z listy.', 'Exercise removed from the list.'));
    },
  });
  actionSheet(exercise.name, actions);
}

// --- Biblioteka ćwiczeń ---

export function libraryView() {
  const list = h('div.rows.library');
  const render = (filter) => {
    const found = applyFilter(visibleExercises(), filter);
    if (!found.length) {
      list.replaceChildren(emptyState(L('Nie ma takiego ćwiczenia', 'No matching exercise'), null,
        h('button.btn.btn-ghost', { type: 'button', onclick: () => exerciseForm({ name: filter.query.trim() }) }, L('Dodaj własne ćwiczenie', 'Add a custom exercise'))));
      return;
    }
    const rowFor = (exercise) => h('div.library-row',
      h('a.link-row', { href: `#/cwiczenie/${exercise.id}` },
        exerciseThumb(exercise),
        h('span.link-text',
          h('span.link-name', exercise.name),
          h('span.link-meta', `${muscleName(exercise.muscle)} · ${equipmentName(exercise.equipment)}${exercise.custom ? L(' · własne', ' · custom') : ''}`))),
      favoriteButton(exercise, () => render(controls.filter)));
    const favorites = found.filter((e) => e.favorite);
    const rest = found.filter((e) => !e.favorite);
    list.replaceChildren(
      ...(favorites.length ? [h('h3.list-label', L('Ulubione', 'Favourites')), ...favorites.map(rowFor)] : []),
      ...(favorites.length && rest.length ? [h('h3.list-label', L('Wszystkie', 'All'))] : []),
      ...rest.map(rowFor),
    );
  };
  const controls = exerciseFilter(render);
  render(controls.filter);
  return h('div.page',
    pageHeader(L('Ćwiczenia', 'Exercises'), { actions: iconButton('plus', L('Dodaj własne ćwiczenie', 'Add a custom exercise'), () => exerciseForm({})) }),
    controls.node,
    list);
}

// --- Ustawienia ---

const REST_CHOICES = [30, 45, 60, 90, 120, 150, 180, 240, 300];

/** Otwiera arkusz udostępniania, a bez niego pobiera plik. Zwraca false po anulowaniu albo błędzie. */
async function shareFile(name, text, type, title) {
  const file = new File([text], name, { type });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
    } else {
      const url = URL.createObjectURL(file);
      h('a', { href: url, download: name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') toast(L('Nie udało się zapisać pliku. Spróbuj ponownie.', 'Couldn’t save the file. Try again.'));
    return false;
  }
}

// Stała nazwa, żeby nowa kopia mogła zastąpić poprzednią zamiast tworzyć kolejny plik.
async function exportBackup() {
  if (!(await shareFile(L('forma-kopia.json', 'forma-backup.json'), backupText(), 'application/json', L('Kopia zapasowa Formy', 'Forma backup')))) return;
  await markBackedUp();
  // Ekran pod spodem pokazuje stan kopii, więc musi się przeliczyć.
  document.dispatchEvent(new CustomEvent('workout-collapsed'));
  toast(L('Kopia gotowa. Trzymaj ją poza telefonem, np. w iCloud Drive.', 'Backup ready. Keep it off your phone, e.g. in iCloud Drive.'));
}

async function exportCsv() {
  if (!state.workouts.length) {
    toast(L('Nie masz jeszcze zapisanych treningów.', 'You have no saved workouts yet.'));
    return;
  }
  if (await shareFile(L('forma-treningi.csv', 'forma-workouts.csv'), workoutsCsv(state.workouts, exerciseById), 'text/csv', L('Treningi z Formy', 'Workouts from Forma'))) {
    toast(L('Plik z treningami gotowy.', 'Workout file ready.'));
  }
}

function importBackup() {
  const input = h('input', {
    type: 'file',
    accept: '.json,application/json',
    onchange: async () => {
      const file = input.files?.[0];
      if (!file) return;
      let parsed;
      try {
        parsed = previewBackup(await file.text());
      } catch (error) {
        toast(error.message);
        return;
      }
      const confirmed = await ask({
        title: L('Zastąpić dane tą kopią?', 'Replace your data with this backup?'),
        text: L(`Kopia ma ${countOf(parsed.workouts.length, 'trening', 'treningi', 'treningów')} i ${countOf(parsed.bodyWeights.length, 'wpis', 'wpisy', 'wpisów')} wagi. Obecne ${countOf(state.workouts.length, 'trening', 'treningi', 'treningów')}, rutyny, profil, dziennik wagi i trening w toku zostaną zastąpione.`, `The backup has ${countOf(parsed.workouts.length, '', '', '', 'workout', 'workouts')} and ${countOf(parsed.bodyWeights.length, '', '', '', 'weight entry', 'weight entries')}. Your current ${countOf(state.workouts.length, '', '', '', 'workout', 'workouts')}, routines, profile, weight log and any workout in progress will be replaced.`),
        confirm: L('Zastąp dane', 'Replace data'),
        danger: true,
      });
      if (!confirmed) return;
      await restoreBackup(parsed);
      location.hash = '#/';
      toast(L('Wczytano kopię.', 'Backup restored.'));
    },
  });
  input.click();
}

async function wipeData() {
  const confirmed = await ask({
    title: L('Usunąć wszystkie dane?', 'Delete all data?'),
    text: L(`Znikną wszystkie treningi (${state.workouts.length}), własne ćwiczenia, rutyny, profil i dziennik wagi. Tego nie da się cofnąć bez kopii zapasowej.`, `All workouts (${state.workouts.length}), custom exercises, routines, your profile and weight log will be deleted. This can’t be undone without a backup.`),
    confirm: L('Usuń wszystko', 'Delete everything'),
    danger: true,
  });
  if (!confirmed) return;
  await wipeAll();
  location.hash = '#/';
  toast(L('Usunięto wszystkie dane.', 'All data deleted.'));
}

/** Sekcja pobierania animacji, żeby działały na siłowni bez zasięgu. */
function mediaSection() {
  const line = h('p.settings-text', { role: 'status' }, L('Sprawdzam zapisane animacje…', 'Checking saved animations…'));
  const button = h('button.btn.btn-ghost.btn-block', { type: 'button', disabled: true }, L('Pobierz wszystkie', 'Download all'));
  const clearButton = h('button.btn.btn-text-danger.btn-block', { type: 'button', hidden: true }, L('Usuń zapisane animacje', 'Delete saved animations'));
  const showProgress = ({ done, total }) => { line.textContent = L(`Pobieranie: ${done} z ${total}`, `Downloading: ${done} of ${total}`); };

  const refresh = async () => {
    const status = await mediaStatus();
    if (!status) {
      line.textContent = L('Ta przeglądarka nie może zapisać animacji.', 'This browser can’t save animations.');
      button.hidden = true;
      return;
    }
    line.textContent = L(`Zapisane na telefonie: ${status.saved} z ${status.total}.`, `Saved on this phone: ${status.saved} of ${status.total}.`);
    button.disabled = status.saved >= status.total;
    button.textContent = status.saved >= status.total ? L('Wszystkie są zapisane', 'All saved') : L('Pobierz wszystkie', 'Download all');
    clearButton.hidden = status.saved === 0;
  };

  const start = async () => {
    button.disabled = true;
    clearButton.hidden = true;
    button.textContent = L('Pobieranie…', 'Downloading…');
    const { failed, noRoom } = await downloadMedia(showProgress);
    await refresh();
    if (noRoom) toast(L('Za mało miejsca na telefonie. Część animacji nie została zapisana.', 'Not enough space on the phone. Some animations weren’t saved.'));
    else toast(failed ? L(`Nie udało się pobrać: ${failed}. Spróbuj ponownie przy dobrym zasięgu.`, `Failed to download: ${failed}. Try again with a good connection.`) : L('Wszystkie animacje są zapisane.', 'All animations are saved.'));
  };
  button.addEventListener('click', start);
  clearButton.addEventListener('click', async () => {
    const confirmed = await ask({
      title: L('Usunąć zapisane animacje?', 'Delete saved animations?'),
      text: L('Treningi zostaną. Animacje znów będą wymagały internetu, dopóki nie zapiszą się ponownie.', 'Your workouts stay. Animations will need the internet again until they’re saved again.'),
      confirm: L('Usuń animacje', 'Delete animations'),
      danger: true,
    });
    if (!confirmed) return;
    await clearMedia();
    await refresh();
    toast(L('Usunięto zapisane animacje.', 'Saved animations deleted.'));
  });

  if (isDownloadingMedia()) start();
  else refresh();

  return h('section.block',
    h('h2.block-title', L('Animacje bez internetu', 'Offline animations')),
    h('p.settings-text', L('Obejrzane animacje zapisują się same. Możesz też pobrać wszystkie od razu: około 24 MB, najlepiej na Wi-Fi.', 'Animations you watch are saved automatically. You can also download them all now: about 24 MB, best on Wi-Fi.')),
    line,
    button,
    clearButton);
}

export function settingsView() {
  const rest = state.settings.restSec;
  const goal = state.settings.weeklyGoal;
  const soundLine = h('p.sound-status', { role: 'status', hidden: true });
  let soundTimer = null;
  const showSound = () => {
    const s = sound.status();
    soundLine.hidden = false;
    soundLine.textContent = L(`Stan: silnik ${s.engine}, tryb ${s.session}${s.error ? `, błąd ${s.error}` : ''}`, `Status: engine ${s.engine}, mode ${s.session}${s.error ? `, error ${s.error}` : ''}`);
  };
  const watchSound = () => {
    clearInterval(soundTimer);
    let ticks = 0;
    showSound();
    soundTimer = setInterval(() => {
      showSound();
      ticks += 1;
      if (ticks >= 40 || !soundLine.isConnected) clearInterval(soundTimer);
    }, 500);
  };
  return h('div.page',
    pageHeader(L('Ustawienia', 'Settings'), { back: '#/' }),
    h('section.block',
      h('h2.block-title', L('Język', 'Language')),
      h('div.filters', segmented(LANGUAGES.map(({ id, label }) => ({ value: id, label })), language(), setLanguage, L('Język aplikacji', 'App language')))),
    h('section.block',
      h('h2.block-title', L('Minutnik przerwy', 'Rest timer')),
      h('button.link-row.wide', {
        type: 'button',
        onclick: () => actionSheet(L('Domyślna przerwa', 'Default rest'), REST_CHOICES.map((seconds) => ({
          label: fmtClock(seconds),
          selected: seconds === rest,
          onClick: () => saveSettings({ restSec: seconds }),
        }))),
      },
      h('span.link-text',
        h('span.link-name', L('Domyślna przerwa', 'Default rest')),
        h('span.link-meta', L('Każde ćwiczenie może mieć własną, ustawianą na ekranie treningu', 'Each exercise can have its own, set on the workout screen'))),
      h('span.setting-value', fmtClock(rest)))),
    h('section.block',
      h('h2.block-title', L('Cel tygodniowy', 'Weekly goal')),
      h('button.link-row.wide', { type: 'button', onclick: goalSheet },
        h('span.link-text',
          h('span.link-name', L('Treningi w tygodniu', 'Workouts per week')),
          h('span.link-meta', L('Liczy tygodnie z rzędu z wykonanym celem', 'Counts weeks in a row with the goal met'))),
        h('span.setting-value', goal == null ? '–' : String(goal)))),
    h('section.block',
      h('h2.block-title', L('Ocena wysiłku (RPE)', 'Effort rating (RPE)')),
      h('p.settings-text', L('Po odhaczeniu serii możesz jednym dotknięciem zaznaczyć, ile powtórzeń zostało w zapasie: 10 to nic w zapasie, 9 to jedno, 8 to dwa, 7 to trzy, a 6 to cztery i więcej. Ocena nie jest obowiązkowa i nie zmienia rekordów ani poziomów.', 'After ticking a set you can mark with one tap how many reps you had left: 10 means none, 9 one, 8 two, 7 three and 6 four or more. Rating is optional and doesn’t change records or levels.')),
      h('button.link-row.wide', {
        type: 'button',
        role: 'switch',
        'aria-checked': String(state.settings.askRpe),
        onclick: () => saveSettings({ askRpe: !state.settings.askRpe }),
      },
      h('span.link-text',
        h('span.link-name', L('Pytaj po każdej serii', 'Ask after every set')),
        h('span.link-meta', L('Bez rozgrzewek', 'Not for warm-ups'))),
      h('span.setting-value', state.settings.askRpe ? L('Wł.', 'On') : L('Wył.', 'Off')))),
    h('section.block',
      h('h2.block-title', L('Dźwięk końca przerwy', 'End-of-rest sound')),
      h('p.settings-text', L('Muzyka gra dalej, a sygnał nakłada się na nią. Zostaw aplikację otwartą i ekran włączony, bo po zablokowaniu telefonu lub przejściu do innej aplikacji sygnał nie zagra.', 'Your music keeps playing and the beep plays over it. Keep the app open and the screen on: the beep won’t play once the phone locks or you switch apps.')),
      h('button.btn.btn-ghost.btn-block', {
        type: 'button',
        onclick: () => {
          sound.playNow();
          watchSound();
        },
      }, L('Zagraj sygnał teraz', 'Play the beep now')),
      soundLine),
    mediaSection(),
    h('section.block',
      h('h2.block-title', L('Kopia zapasowa', 'Backup')),
      h('p.settings-text', L('Treningi, rutyny, profil i dziennik wagi są zapisane tylko na tym telefonie. Bez kopii utrata telefonu albo usunięcie aplikacji z ekranu początkowego oznacza utratę danych.', 'Workouts, routines, your profile and weight log are stored only on this phone. Without a backup, losing the phone or removing the app from the Home Screen means losing your data.')),
      h('p.settings-text', L('Plik ma zawsze tę samą nazwę. Zapisuj go w tym samym folderze i zgódź się na zastąpienie, a zostanie jedna, najnowsza kopia.', 'The file always has the same name. Save it in the same folder and agree to replace it, so you keep one, latest backup.')),
      h('p.settings-text', state.lastBackupAt ? L(`Ostatnia kopia: ${fmtDayMedium(state.lastBackupAt)}. Poza kopią: ${countOf(backupStatus(state.workouts, state.lastBackupAt).unsaved, 'trening', 'treningi', 'treningów')}.`, `Last backup: ${fmtDayMedium(state.lastBackupAt)}. Not backed up: ${countOf(backupStatus(state.workouts, state.lastBackupAt).unsaved, '', '', '', 'workout', 'workouts')}.`) : L('Nie masz jeszcze kopii.', 'You have no backup yet.')),
      h('button.btn.btn-primary.btn-block', { type: 'button', onclick: exportBackup }, L('Zapisz kopię', 'Save backup')),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: importBackup }, L('Wczytaj kopię', 'Restore backup'))),
    h('section.block',
      h('h2.block-title', L('Dane', 'Data')),
      h('p.settings-text', L('Plik CSV otworzysz w Excelu albo Numbers. Służy do przeglądania, kopii zapasowej z niego nie wczytasz.', 'Open the CSV file in Excel or Numbers. It’s for viewing only: you can’t restore a backup from it.')),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: exportCsv }, L('Eksportuj treningi do CSV', 'Export workouts to CSV')),
      h('button.btn.btn-text-danger.btn-block', { type: 'button', onclick: wipeData }, L('Usuń wszystkie dane', 'Delete all data'))));
}

export { openSheet };
