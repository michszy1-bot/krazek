// Ekrany aplikacji poza treningiem: start, dziennik, postępy, ćwiczenia i ustawienia.

import { actionSheet, ask, emptyState, h, icon, iconButton, openSheet, pageHeader, recordChip, segmented, toast } from './ui.js';
import { addDays, countOf, dayKey, fmtClock, fmtDayLong, fmtDayMedium, fmtDayShort, fmtDuration, fmtMonth, fmtNum, fmtSet, fmtTime, fmtUnit, fmtVolume, startOfWeek } from './format.js';
import { columnChart, lineChart, rankedBars } from './chart.js';
import { exerciseSessions, flagRecords, isWorking, METRICS, muscleSets, RECORD_TYPES, recordsFor, summarizeSets, weekDays, weeklyTotals, workingSetCount, workoutRecords, workoutVolume } from './stats.js';
import { backupText, deleteExercise, deleteWorkout, exerciseById, isExerciseUsed, markBackedUp, previewBackup, restoreBackup, saveSettings, state, visibleExercises, wipeAll } from './store.js';
import { applyFilter, exerciseFilter, exerciseForm } from './picker.js';
import { addPastWorkout, editWorkout, resumeWorkout, startWorkout, stat } from './workout.js';
import { exerciseDemo } from './demo.js';
import * as sound from './sound.js';

const BACKUP_REMINDER_DAYS = 30;
const DAY_LETTERS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

const workoutRecordsOf = (workout) => workoutRecords(workout, state.workouts, exerciseById);

// --- Start ---

/** Tydzień narysowany jak sztanga: każdy dzień treningowy to krążek, tym wyższy, im więcej serii. */
function weekBarbell(days) {
  const plates = days.map((day, i) => {
    const hasRecord = day.workouts.some((w) => workoutRecordsOf(w).length > 0);
    const height = day.sets ? Math.round(28 + Math.min(1, day.sets / 24) * 60) : 0;
    const plate = day.sets
      ? h(`span.plate${hasRecord ? '.plate-record' : ''}`, { style: `height:${height}px` })
      : h('span.collar');
    const label = h(`span.day-letter${day.isToday ? '.today' : ''}`, DAY_LETTERS[i]);
    const name = `${fmtDayLong(day.date)}: ${day.sets ? countOf(day.sets, 'seria', 'serie', 'serii') : 'bez treningu'}${hasRecord ? ', nowy rekord' : ''}`;
    return day.workouts.length
      ? h('a.day', { href: `#/dziennik/${day.workouts[0].id}`, 'aria-label': name }, h('span.day-slot', plate), label)
      : h('div.day', { 'aria-label': name, role: 'img' }, h('span.day-slot', plate), label);
  });
  return h('div.barbell', plates);
}

function workoutRow(workout) {
  const records = workoutRecordsOf(workout);
  const names = workout.exercises.map((i) => exerciseById(i.exerciseId)?.name).filter(Boolean).join(', ');
  return h('a.workout-row', { href: `#/dziennik/${workout.id}` },
    h('div.workout-top',
      h('span.workout-name', workout.name),
      records.length > 0 && recordChip()),
    h('p.workout-meta', `${fmtDayMedium(workout.startedAt)} · ${fmtDuration(workout.endedAt - workout.startedAt)} · ${countOf(workingSetCount(workout), 'seria', 'serie', 'serii')} · ${fmtVolume(workoutVolume(workout))}`),
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

  const stale = state.lastBackupAt == null || Date.now() - state.lastBackupAt > BACKUP_REMINDER_DAYS * 86400000;

  return h('div.page',
    h('header.page-head',
      h('p.eyebrow', fmtDayLong(now)),
      h('div.page-actions', h('a.icon-btn', { href: '#/ustawienia', 'aria-label': 'Ustawienia', title: 'Ustawienia' }, icon('gear')))),
    h('section.week',
      h('h1.page-title', 'Ten tydzień'),
      h('p.week-line', weekWorkouts.length
        ? `${countOf(weekWorkouts.length, 'trening', 'treningi', 'treningów')} · ${countOf(weekSets, 'seria', 'serie', 'serii')} · ${fmtVolume(weekVolume)}`
        : 'Jeszcze bez treningu'),
      weekBarbell(days),
      anyRecord && h('p.week-legend', h('span.legend-plate'), 'Dzień z nowym rekordem')),
    state.active
      ? h('button.btn.btn-primary.btn-hero', { type: 'button', onclick: resumeWorkout }, 'Wróć do treningu', h('span.hero-time', { dataset: { elapsedFrom: state.active.startedAt } }, fmtClock((Date.now() - state.active.startedAt) / 1000)))
      : h('button.btn.btn-primary.btn-hero', { type: 'button', onclick: startWorkout }, 'Rozpocznij trening'),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => addPastWorkout() }, 'Dodaj wcześniejszy trening'),
    last
      ? h('section.block', h('h2.block-title', 'Ostatni trening'), workoutRow(last))
      : h('p.first-hint', 'Po pierwszym treningu zobaczysz tu podsumowanie i pierwszy krążek na sztandze.'),
    last && stale && h('a.notice', { href: '#/ustawienia' },
      h('strong', state.lastBackupAt ? 'Czas na kopię zapasową' : 'Zrób pierwszą kopię zapasową'),
      h('span', 'Treningi są tylko na tym telefonie. Kopia chroni je na wypadek jego utraty.')));
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
    const label = `${fmtDayLong(date)}${list.length ? `: ${countOf(list.length, 'trening', 'treningi', 'treningów')}` : ''}`;
    const content = [h('span.cal-num', String(date.getDate())), list.length > 0 && h('span.cal-plate')];
    const cls = `cal-day${inMonth ? '' : ' outside'}${key === today ? ' today' : ''}${list.length ? ' trained' : ''}`;
    const canAdd = inMonth && !list.length && key <= today;
    if (list.length) {
      cells.push(h('a', { class: cls, href: `#/dziennik/${list[0].id}`, 'aria-label': label }, content));
    } else if (canAdd) {
      cells.push(h('button', { class: cls, type: 'button', 'aria-label': `Dodaj trening: ${label}`, onclick: () => addPastWorkout(date) }, content));
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
      pageHeader('Dziennik'),
      h('div.month-nav',
        iconButton('back', 'Poprzedni miesiąc', () => shift(-1)),
        h('h2.month-title', fmtMonth(month)),
        h('button.icon-btn.flip', { type: 'button', 'aria-label': 'Następny miesiąc', title: 'Następny miesiąc', disabled: atCurrent, onclick: () => shift(1) }, icon('back'))),
      monthCalendar(month, byDay),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => addPastWorkout() }, 'Dodaj wcześniejszy trening'),
      inMonth.length
        ? h('section.block',
          h('h2.block-title', countOf(inMonth.length, 'trening', 'treningi', 'treningów')),
          h('div.rows', inMonth.map(workoutRow)))
        : emptyState(
          state.workouts.length ? 'W tym miesiącu nie ma treningów' : 'Dziennik jest pusty',
          state.workouts.length ? 'Wybierz inny miesiąc strzałkami.' : 'Zapisane treningi pojawią się tutaj.',
        ),
    );
  };
  render();
  return host;
}

export function workoutDetailView(id) {
  const workout = state.workouts.find((w) => w.id === id);
  if (!workout) {
    return h('div.page', pageHeader('Trening', { back: '#/dziennik' }),
      emptyState('Nie ma takiego treningu', 'Mógł zostać usunięty.', h('a.btn.btn-ghost', { href: '#/dziennik' }, 'Wróć do dziennika')));
  }

  const remove = async () => {
    const confirmed = await ask({
      title: 'Usunąć ten trening?',
      text: `${workout.name}, ${fmtDayMedium(workout.startedAt)}. Tego nie da się cofnąć.`,
      confirm: 'Usuń trening',
      danger: true,
    });
    if (!confirmed) return;
    await deleteWorkout(workout.id);
    location.hash = '#/dziennik';
    toast('Usunięto trening.');
  };

  return h('div.page',
    pageHeader(workout.name, { back: '#/dziennik' }),
    h('p.detail-date', `${fmtDayLong(workout.startedAt)}, ${fmtTime(workout.startedAt)}`),
    h('div.stats',
      stat('Czas', fmtDuration(workout.endedAt - workout.startedAt)),
      stat('Objętość', fmtVolume(workoutVolume(workout))),
      stat('Serie', String(workingSetCount(workout)))),
    workout.note && h('p.detail-note', workout.note),
    workout.exercises.map((item) => {
      const exercise = exerciseById(item.exerciseId);
      if (!exercise) return null;
      const baseline = recordsFor(state.workouts, item.exerciseId, { beforeTs: workout.startedAt, excludeId: workout.id });
      const flags = flagRecords(item.sets, exercise.type, baseline);
      let number = 0;
      return h('section.detail-card',
        h('a.detail-ex', { href: `#/cwiczenie/${exercise.id}` }, exercise.name),
        item.note && h('p.detail-note', item.note),
        h('table.detail-sets', h('tbody', item.sets.map((set, i) => {
          if (isWorking(set)) number += 1;
          return h('tr',
            h('th', { scope: 'row', 'aria-label': isWorking(set) ? `Seria ${number}` : 'Seria rozgrzewkowa' }, isWorking(set) ? String(number) : 'R'),
            h('td', fmtSet(set, exercise.type)),
            h('td.right', flags[i].length > 0 && recordChip()));
        }))));
    }),
    h('div.detail-actions',
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => editWorkout(workout) }, 'Edytuj trening'),
      h('button.btn.btn-text-danger.btn-block', { type: 'button', onclick: remove }, 'Usuń trening')));
}

// --- Postępy ---

const RANGES_WEEKS = [
  { value: 4, label: '4 tyg.' },
  { value: 12, label: '12 tyg.' },
  { value: 26, label: '6 mies.' },
  { value: 52, label: 'Rok' },
];
let progressWeeks = 12;

const volumeTick = (value, max) => (max >= 10000 ? `${fmtNum(value / 1000)} t` : fmtNum(value));

/** Tabela pod wykresem, żeby każdą wartość dało się odczytać bez dymka. */
const dataTable = (summary, headers, rows) => h('details.data-table',
  h('summary', summary),
  h('table',
    h('thead', h('tr', headers.map((text) => h('th', { scope: 'col' }, text)))),
    h('tbody', rows.map((cells) => h('tr', cells.map((text) => h('td', text)))))));

export function progressView() {
  const host = h('div.page');
  if (!state.workouts.length) {
    host.append(pageHeader('Postępy'), emptyState('Nie ma jeszcze czego pokazać', 'Wykresy pojawią się po pierwszym zapisanym treningu.'));
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
        stat('Treningi', String(inRange.length)),
        stat('Objętość', fmtVolume(volume)),
        stat('Serie', fmtNum(inRange.reduce((sum, w) => sum + workingSetCount(w), 0)))),
      h('section.block',
        h('h2.block-title', 'Objętość tygodniowa'),
        hasVolume
          ? columnChart({
            items: weeks.map((w) => ({
              tickLabel: fmtDayShort(w.weekStart),
              value: w.volume,
              tipValue: fmtVolume(w.volume),
              tipLabel: `Tydzień od ${fmtDayShort(w.weekStart)}`,
            })),
            formatTick: volumeTick,
            label: `Objętość tygodniowa z ostatnich ${weeks.length} tygodni. Dane są też w tabeli poniżej.`,
          })
          : h('p.muted', 'W tym okresie nie ma serii z ciężarem.'),
        dataTable('Pokaż tabelę', ['Tydzień od', 'Treningi', 'Objętość'], [...weeks].reverse().map((w) => [fmtDayShort(w.weekStart), String(w.workouts), fmtVolume(w.volume)]))),
      h('section.block',
        h('h2.block-title', 'Serie na partię'),
        muscles.length
          ? rankedBars(muscles.map((m) => ({ label: m.muscle, value: m.sets })), (v) => fmtNum(v))
          : h('p.muted', 'W tym okresie nie ma zapisanych serii.')),
      h('section.block',
        h('h2.block-title', 'Ćwiczenia'),
        h('div.rows', [...exercises.entries()].map(([id, entry]) => {
          const exercise = exerciseById(id);
          if (!exercise) return null;
          return h('a.link-row', { href: `#/cwiczenie/${id}` },
            h('span.link-text',
              h('span.link-name', exercise.name),
              h('span.link-meta', `${countOf(entry.sessions, 'sesja', 'sesje', 'sesji')} · ostatnio ${fmtDayShort(entry.last)}`)),
            h('span.flip', icon('back', 20)));
        }))),
    );
  };

  host.append(
    pageHeader('Postępy'),
    h('div.filters', segmented(RANGES_WEEKS, progressWeeks, (value) => { progressWeeks = value; render(); }, 'Zakres czasu')),
    content,
  );
  render();
  return host;
}

// --- Szczegóły ćwiczenia ---

const DETAIL_RANGES = [
  { value: 90, label: '3 mies.' },
  { value: 180, label: '6 mies.' },
  { value: 365, label: 'Rok' },
  { value: 0, label: 'Całość' },
];
const metricChoice = new Map();
let detailRange = 0;

export function exerciseView(id, backTo) {
  const exercise = exerciseById(id);
  if (!exercise) {
    return h('div.page', pageHeader('Ćwiczenie', { back: backTo }),
      emptyState('Nie ma takiego ćwiczenia', 'Mogło zostać usunięte.'));
  }

  const sessions = exerciseSessions(state.workouts, id)
    .map((session) => ({ ...session, summary: summarizeSets(session.sets) }))
    .filter((session) => session.summary.setCount > 0);
  const { type } = exercise;
  const records = recordsFor(state.workouts, id);

  const actions = exercise.custom || !exercise.archived
    ? iconButton('more', 'Opcje ćwiczenia', () => exerciseMenu(exercise, backTo))
    : null;

  const host = h('div.page',
    pageHeader(exercise.name, { back: backTo, actions }),
    h('p.detail-date', `${exercise.muscle} · ${exercise.equipment}`),
    exerciseDemo(exercise));

  if (!sessions.length) {
    host.append(emptyState('Brak zapisanych serii', 'Wykres i rekordy pojawią się po pierwszym treningu z tym ćwiczeniem.'));
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
      chartHost.replaceChildren(h('p.muted.chart-empty', `Brak danych dla: ${metric.title.toLocaleLowerCase('pl')} w tym okresie.`));
      return;
    }

    const maxValue = Math.max(...visible.map((session) => session.summary[metricKey]));
    const formatTick = (value) => {
      if (metric.unit === 'seconds') return fmtClock(value);
      if (metric.unit === 'volume') return volumeTick(value, maxValue);
      return fmtNum(value);
    };
    chartHost.replaceChildren(
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
        label: `${metric.title}, ${exercise.name}. Dane są też w historii poniżej.`,
      }),
    );
  };

  host.append(
    recordsSection(type, records),
    h('div.filters',
      segmented(DETAIL_RANGES, detailRange, (value) => { detailRange = value; render(); }, 'Zakres czasu'),
      metrics.length > 1 && segmented(metrics.map((m) => ({ value: m.key, label: m.label })), metricKey, (value) => {
        metricKey = value;
        metricChoice.set(id, value);
        render();
      }, 'Wskaźnik')),
    h('section.block', chartHost),
    h('section.block',
      h('h2.block-title', 'Historia'),
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
    actions.push({ label: 'Edytuj ćwiczenie', onClick: () => exerciseForm(exercise) });
  }
  actions.push({
    label: 'Usuń z listy',
    hint: isExerciseUsed(exercise.id) ? 'Historia i wykresy zostaną' : null,
    danger: true,
    onClick: async () => {
      const used = isExerciseUsed(exercise.id);
      const confirmed = await ask({
        title: `Usunąć ${exercise.name}?`,
        text: used
          ? 'Ćwiczenie zniknie z listy wyboru. Zapisane treningi i wykresy zostaną.'
          : 'Ćwiczenie zniknie z listy wyboru.',
        confirm: 'Usuń z listy',
        danger: true,
      });
      if (!confirmed) return;
      await deleteExercise(exercise.id);
      location.hash = backTo;
      toast('Usunięto ćwiczenie z listy.');
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
      list.replaceChildren(emptyState('Nie ma takiego ćwiczenia', null,
        h('button.btn.btn-ghost', { type: 'button', onclick: () => exerciseForm({ name: filter.query.trim() }) }, 'Dodaj własne ćwiczenie')));
      return;
    }
    list.replaceChildren(...found.map((exercise) => h('a.link-row', { href: `#/cwiczenie/${exercise.id}` },
      h('span.link-text',
        h('span.link-name', exercise.name),
        h('span.link-meta', `${exercise.muscle} · ${exercise.equipment}${exercise.custom ? ' · własne' : ''}`)),
      h('span.flip', icon('back', 20)))));
  };
  const controls = exerciseFilter(render);
  render(controls.filter);
  return h('div.page',
    pageHeader('Ćwiczenia', { actions: iconButton('plus', 'Dodaj własne ćwiczenie', () => exerciseForm({})) }),
    controls.node,
    list);
}

// --- Ustawienia ---

const REST_CHOICES = [30, 45, 60, 90, 120, 150, 180, 240, 300];
const SOUND_TEST_SECONDS = 15;
const oneDecimalSeconds = (seconds) => `${seconds.toFixed(1).replace('.', ',')} s`;

async function exportBackup() {
  const name = `krazek-kopia-${dayKey(new Date())}.json`;
  const file = new File([backupText()], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Kopia zapasowa Krążka' });
    } else {
      const url = URL.createObjectURL(file);
      h('a', { href: url, download: name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  } catch (error) {
    if (error.name === 'AbortError') return; // anulowanie w arkuszu udostępniania
    toast('Nie udało się zapisać kopii. Spróbuj ponownie.');
    return;
  }
  await markBackedUp();
  toast('Kopia gotowa. Trzymaj ją poza telefonem, np. w iCloud Drive.');
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
        title: 'Zastąpić dane tą kopią?',
        text: `Kopia ma ${countOf(parsed.workouts.length, 'trening', 'treningi', 'treningów')}. Obecne ${countOf(state.workouts.length, 'trening', 'treningi', 'treningów')} i trening w toku zostaną zastąpione.`,
        confirm: 'Zastąp dane',
        danger: true,
      });
      if (!confirmed) return;
      await restoreBackup(parsed);
      location.hash = '#/';
      toast('Wczytano kopię.');
    },
  });
  input.click();
}

async function wipeData() {
  const confirmed = await ask({
    title: 'Usunąć wszystkie dane?',
    text: `Znikną wszystkie treningi (${state.workouts.length}) i własne ćwiczenia. Tego nie da się cofnąć bez kopii zapasowej.`,
    confirm: 'Usuń wszystko',
    danger: true,
  });
  if (!confirmed) return;
  await wipeAll();
  location.hash = '#/';
  toast('Usunięto wszystkie dane.');
}

export function settingsView() {
  const rest = state.settings.restSec;
  const soundLine = h('p.sound-status', { role: 'status', hidden: true });
  let soundTimer = null;
  const showSound = () => {
    const s = sound.status();
    soundLine.hidden = false;
    soundLine.textContent = `Stan: ${s.state}, ${oneDecimalSeconds(s.time)} z ${oneDecimalSeconds(s.duration)}, tryb ${s.session}, zapas ${s.backup}${s.error ? `, błąd ${s.error}` : ''}`;
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
    pageHeader('Ustawienia', { back: '#/' }),
    h('section.block',
      h('h2.block-title', 'Minutnik przerwy'),
      h('button.link-row.wide', {
        type: 'button',
        onclick: () => actionSheet('Domyślna przerwa', REST_CHOICES.map((seconds) => ({
          label: fmtClock(seconds),
          selected: seconds === rest,
          onClick: () => saveSettings({ restSec: seconds }),
        }))),
      },
      h('span.link-text',
        h('span.link-name', 'Domyślna przerwa'),
        h('span.link-meta', 'Każde ćwiczenie może mieć własną, ustawianą na ekranie treningu')),
      h('span.setting-value', fmtClock(rest)))),
    h('section.block',
      h('h2.block-title', 'Dźwięk końca przerwy'),
      segmented(
        [{ value: false, label: 'Przy muzyce' }, { value: true, label: 'Na blokadzie' }],
        state.settings.lockedAudio,
        (value) => saveSettings({ lockedAudio: value }),
        'Tryb dźwięku końca przerwy',
      ),
      h('p.settings-text', state.settings.lockedAudio
        ? 'Sygnał zagra też na zablokowanym ekranie, ale muzyka zatrzymuje się na czas przerwy.'
        : 'Muzyka gra dalej, a sygnał nakłada się na nią. Zostaw aplikację otwartą i ekran włączony, bo po zablokowaniu telefonu sygnał nie zagra.'),
      h('button.btn.btn-ghost.btn-block', {
        type: 'button',
        onclick: () => {
          sound.playNow({ takeOver: state.settings.lockedAudio });
          watchSound();
        },
      }, 'Zagraj sygnał teraz'),
      state.settings.lockedAudio && h('button.btn.btn-ghost.btn-block', {
        type: 'button',
        onclick: () => {
          sound.startRest(SOUND_TEST_SECONDS, { takeOver: state.settings.lockedAudio });
          watchSound();
          toast(`Zablokuj telefon. Sygnał zagra za ${SOUND_TEST_SECONDS} sekund.`);
        },
      }, 'Sprawdź przy zablokowanym ekranie'),
      soundLine),
    h('section.block',
      h('h2.block-title', 'Kopia zapasowa'),
      h('p.settings-text', 'Treningi są zapisane tylko na tym telefonie. Bez kopii utrata telefonu albo usunięcie aplikacji z ekranu początkowego oznacza utratę danych.'),
      h('p.settings-text', state.lastBackupAt ? `Ostatnia kopia: ${fmtDayMedium(state.lastBackupAt)}.` : 'Nie masz jeszcze kopii.'),
      h('button.btn.btn-primary.btn-block', { type: 'button', onclick: exportBackup }, 'Zapisz kopię'),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: importBackup }, 'Wczytaj kopię')),
    h('section.block',
      h('h2.block-title', 'Dane'),
      h('button.btn.btn-text-danger.btn-block', { type: 'button', onclick: wipeData }, 'Usuń wszystkie dane')));
}

export { openSheet };
