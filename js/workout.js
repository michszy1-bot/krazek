// Ekran treningu: trwającego (zapis na bieżąco, minutnik) oraz edycji zapisanego.

import { actionSheet, ask, h, icon, iconButton, openSheet, recordChip, toast } from './ui.js';
import { countOf, fmtClock, fmtDuration, fmtSet, fmtUnit, fmtVolume, inputValue, parseNum, pastWorkoutStart, toLocalInput } from './format.js';
import { exerciseSessions, flagRecords, isComplete, recordsFor, SET_KINDS, setLabels, workingSetCount, workoutRecords, workoutVolume } from './stats.js';
import { exerciseById, flushActive, newId, saveActiveSoon, saveExercise, saveWorkout, setActive, state } from './store.js';
import { pickExercises } from './picker.js';
import { demoUrl, exerciseDemo, hasDemo } from './demo.js';
import { saveWorkoutAsRoutine } from './routine-views.js';
import * as sound from './sound.js';

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
const MAX_WEIGHT = 1500;
const MAX_REPS = 1000;
const MAX_SECONDS = 36000;

let ctx = null; // { draft, mode: 'live' | 'edit', layer, cards, onSaved }
let tickTimer = null;
let restEndedTimer = null;
let wakeLock = null;

const emptySet = (kind = 'normal') => ({ weight: null, reps: null, seconds: null, kind, done: false });

function defaultName(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Trening poranny';
  if (hour < 18) return 'Trening popołudniowy';
  return 'Trening wieczorny';
}

export const isWorkoutOpen = () => Boolean(ctx);

export async function startWorkout() {
  const now = Date.now();
  await setActive({ id: newId(), name: defaultName(), startedAt: now, note: '', exercises: [], restEndAt: null, restTotal: 0 });
  resumeWorkout();
}

/** Nowy trening z rutyny: ma jej nazwę, ćwiczenia i liczbę serii. Ciężary podpowiada historia. */
export async function startRoutine(routine) {
  if (state.active) {
    toast('Masz trening w toku. Zakończ go, żeby zacząć rutynę.', { actionLabel: 'Wróć', onAction: resumeWorkout });
    return;
  }
  const exercises = routine.exercises
    .filter((item) => exerciseById(item.exerciseId))
    .map((item) => ({ exerciseId: item.exerciseId, note: '', sets: item.sets.map((kind) => emptySet(kind)) }));
  await setActive({ id: newId(), name: routine.name, startedAt: Date.now(), note: '', exercises, restEndAt: null, restTotal: 0 });
  resumeWorkout();
}

export function resumeWorkout() {
  if (!state.active || ctx) return;
  mount({ draft: state.active, mode: 'live' });
}

export function editWorkout(workout, onSaved) {
  const draft = structuredClone(workout);
  draft.exercises.forEach((item) => item.sets.forEach((set) => { set.done = true; }));
  mount({ draft, mode: 'edit', onSaved });
}

/** Trening zrobiony wcześniej, np. zanim powstała aplikacja. `day` to dzień wybrany w kalendarzu. */
export function addPastWorkout(day) {
  const startedAt = pastWorkoutStart(day);
  mount({
    draft: { id: newId(), name: 'Trening', startedAt, endedAt: startedAt + 3600000, note: '', exercises: [] },
    mode: 'edit',
    isNew: true,
  });
}

// --- Budowa ekranu ---

function mount({ draft, mode, onSaved, isNew = false }) {
  ctx = { draft, mode, onSaved, isNew, cards: new Map() };
  const live = mode === 'live';

  const cardsHost = h('div.wk-cards');
  ctx.cardsHost = cardsHost;
  ctx.restBar = live ? buildRestBar() : null;

  const head = live
    ? h('header.wk-head',
      iconButton('down', 'Zwiń trening', collapse),
      h('p.wk-clock', { 'aria-label': 'Czas treningu' }, h('span', { id: 'wk-elapsed' }, elapsedText())),
      h('button.btn.btn-finish', { type: 'button', onclick: finishLive }, 'Zakończ'))
    : h('header.wk-head',
      iconButton('close', isNew ? 'Anuluj dodawanie' : 'Anuluj edycję', cancelEdit),
      h('p.wk-head-title', isNew ? 'Wcześniejszy trening' : 'Edycja treningu'),
      h('button.btn.btn-finish', { type: 'button', onclick: saveEdit }, 'Zapisz'));

  const nameInput = h('input.wk-name', {
    type: 'text',
    value: draft.name,
    maxLength: 60,
    'aria-label': 'Nazwa treningu',
    oninput: () => { draft.name = nameInput.value; touch(); },
  });

  const noteInput = h('textarea.wk-note', {
    rows: 2,
    placeholder: 'Jak poszło? Samopoczucie, sen, ból…',
    'aria-label': 'Notatka do treningu',
    value: draft.note ?? '',
    oninput: () => { draft.note = noteInput.value; touch(); },
  });

  const scroll = h('div.wk-scroll',
    nameInput,
    !live && editTimeFields(),
    cardsHost,
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: addExercises }, icon('plus', 20), 'Dodaj ćwiczenie'),
    h('label.field', h('span.field-label', 'Notatka do treningu'), noteInput),
    live && h('button.btn.btn-text-danger.btn-block', { type: 'button', onclick: discardLive }, 'Odrzuć trening'));

  const layerLabel = live ? 'Trening w toku' : (isNew ? 'Wcześniejszy trening' : 'Edycja treningu');
  ctx.layer = h('div.layer', { role: 'dialog', 'aria-modal': 'true', 'aria-label': layerLabel }, head, scroll, ctx.restBar);
  document.body.append(ctx.layer);
  document.body.classList.add('layer-open');
  renderCards();

  if (live) {
    tickTimer = setInterval(tick, 250);
    tick();
    requestWakeLock();
  }
}

function unmount() {
  clearInterval(tickTimer);
  tickTimer = null;
  ctx?.layer.remove();
  ctx = null;
  document.body.classList.remove('layer-open');
  releaseWakeLock();
}

function collapse() {
  flushActive();
  unmount();
  document.dispatchEvent(new CustomEvent('workout-collapsed'));
}

const elapsedText = () => fmtClock((Date.now() - ctx.draft.startedAt) / 1000);

function touch() {
  if (ctx?.mode === 'live') saveActiveSoon();
}

function editTimeFields() {
  const { draft } = ctx;
  const start = h('input', {
    type: 'datetime-local',
    value: toLocalInput(draft.startedAt),
    max: toLocalInput(Date.now()),
    onchange: () => {
      const value = new Date(start.value).getTime();
      if (!Number.isFinite(value)) return;
      const length = draft.endedAt - draft.startedAt;
      draft.startedAt = value;
      draft.endedAt = value + length;
      // "Poprzednio" i rekordy zależą od daty, więc karty muszą się przeliczyć.
      renderCards();
    },
  });
  const minutes = h('input', {
    type: 'text',
    inputMode: 'numeric',
    value: String(Math.round((draft.endedAt - draft.startedAt) / 60000)),
    oninput: () => {
      const value = parseNum(minutes.value, { integer: true, max: 1440 });
      if (value != null) draft.endedAt = draft.startedAt + value * 60000;
    },
  });
  return h('div.field-row',
    h('label.field', h('span.field-label', 'Początek'), start),
    h('label.field.field-narrow', h('span.field-label', 'Czas (min)'), minutes));
}

// --- Karty ćwiczeń ---

function renderCards() {
  ctx.cardsHost.replaceChildren(...ctx.draft.exercises.map(buildCard));
  if (!ctx.draft.exercises.length) {
    ctx.cardsHost.append(h('p.wk-hint', ctx.isNew
      ? 'Ustaw datę, dodaj ćwiczenia i wpisz serie z tamtego treningu.'
      : 'Dodaj pierwsze ćwiczenie, a potem odhaczaj kolejne serie.'));
  }
}

function addExercises() {
  pickExercises((ids) => {
    const present = new Set(ctx.draft.exercises.map((i) => i.exerciseId));
    const fresh = ids.filter((id) => !present.has(id));
    if (fresh.length < ids.length) toast('Ćwiczenia, które już są w treningu, zostały pominięte.');
    for (const id of fresh) {
      const previous = previousSets(id);
      const sets = previous.length ? previous.map((s) => emptySet(s.kind)) : [emptySet()];
      ctx.draft.exercises.push({ exerciseId: id, note: '', sets });
    }
    renderCards();
    touch();
  });
}

/** Serie z ostatniego wcześniejszego treningu z tym ćwiczeniem. */
function previousSets(exerciseId) {
  const sessions = exerciseSessions(state.workouts, exerciseId)
    .filter((session) => session.date < ctx.draft.startedAt && session.workoutId !== ctx.draft.id);
  return sessions.at(-1)?.sets ?? [];
}

const restFor = (exercise) => exercise.restSec ?? state.settings.restSec;
const restLabel = (seconds) => (seconds ? fmtClock(seconds) : 'wył.');

function buildCard(item) {
  const exercise = exerciseById(item.exerciseId);
  const { type } = exercise;
  const previous = previousSets(item.exerciseId);
  const baseline = recordsFor(state.workouts, item.exerciseId, { beforeTs: ctx.draft.startedAt, excludeId: ctx.draft.id });
  const rows = [];

  const refreshFlags = () => {
    const flags = flagRecords(item.sets, type, baseline);
    rows.forEach((row, i) => row.setRecord(flags[i].length > 0));
  };

  const rebuild = () => {
    const fresh = buildCard(item);
    card.replaceWith(fresh);
    touch();
  };

  /** Podpowiedź serii: to samo miejsce z poprzedniego treningu, a gdy go brak, seria powyżej. */
  const hintFor = (index) => {
    const set = item.sets[index];
    const position = item.sets.slice(0, index).filter((s) => s.kind === set.kind).length;
    const fromHistory = previous.filter((s) => s.kind === set.kind)[position];
    if (fromHistory) return { ...fromHistory, fromHistory: true };
    for (let i = index - 1; i >= 0; i -= 1) {
      if (isComplete(item.sets[i], type)) return item.sets[i];
    }
    return null;
  };

  const numberLabel = (index) => setLabels(item.sets)[index];

  const deleteSet = (set) => {
    const index = item.sets.indexOf(set);
    if (index < 0) return;
    const { draft } = ctx;
    item.sets.splice(index, 1);
    rebuild();
    toast('Usunięto serię.', {
      actionLabel: 'Cofnij',
      onAction: () => {
        if (ctx?.draft !== draft || !draft.exercises.includes(item)) return;
        item.sets.splice(Math.min(index, item.sets.length), 0, set);
        renderCards();
        touch();
      },
    });
  };

  const setMenu = (index) => {
    const set = item.sets[index];
    actionSheet(`Seria ${numberLabel(index)}`, [
      ...Object.entries(SET_KINDS).map(([kind, { label, hint }]) => ({
        label,
        hint,
        selected: (set.kind ?? 'normal') === kind,
        onClick: () => { set.kind = kind; rebuild(); },
      })),
      {
        label: 'Usuń serię',
        danger: true,
        onClick: () => deleteSet(set),
      },
    ]);
  };

  const rowsHost = h('div.set-rows');
  item.sets.forEach((set, index) => {
    const row = buildSetRow({ set, type, hint: hintFor(index), label: numberLabel(index), onMenu: () => setMenu(index), onChange: refreshFlags, onDelete: () => deleteSet(set), exercise });
    rows.push(row);
    rowsHost.append(row.node);
  });
  refreshFlags();

  const moveTo = (delta) => {
    const list = ctx.draft.exercises;
    const from = list.indexOf(item);
    list.splice(from, 1);
    list.splice(from + delta, 0, item);
    renderCards();
    touch();
  };

  const removeExercise = async () => {
    const hasDone = item.sets.some((s) => s.done);
    if (hasDone) {
      const confirmed = await ask({
        title: `Usunąć ${exercise.name}?`,
        text: 'Odhaczone serie tego ćwiczenia znikną z treningu.',
        confirm: 'Usuń ćwiczenie',
        danger: true,
      });
      if (!confirmed) return;
    }
    ctx.draft.exercises.splice(ctx.draft.exercises.indexOf(item), 1);
    renderCards();
    touch();
  };

  const noteField = h('textarea.ex-note', {
    rows: 1,
    placeholder: 'Notatka do ćwiczenia',
    'aria-label': `Notatka do ćwiczenia ${exercise.name}`,
    value: item.note ?? '',
    hidden: !item.note,
    oninput: () => { item.note = noteField.value; touch(); },
  });

  const chooseRest = () => actionSheet(`Przerwa: ${exercise.name}`, REST_OPTIONS.map((seconds) => ({
    label: seconds ? fmtClock(seconds) : 'Bez minutnika',
    selected: restFor(exercise) === seconds,
    onClick: async () => {
      await saveExercise({ ...exercise, restSec: seconds });
      card.replaceWith(buildCard(item));
    },
  })));

  const openMenu = () => {
    const position = ctx.draft.exercises.indexOf(item);
    actionSheet(exercise.name, [
      { label: item.note || !noteField.hidden ? 'Edytuj notatkę' : 'Dodaj notatkę', onClick: () => { noteField.hidden = false; noteField.focus(); } },
      position > 0 && { label: 'Przesuń wyżej', onClick: () => moveTo(-1) },
      position < ctx.draft.exercises.length - 1 && { label: 'Przesuń niżej', onClick: () => moveTo(1) },
      { label: 'Usuń z treningu', danger: true, onClick: removeExercise },
    ].filter(Boolean));
  };

  const addSet = () => {
    const last = item.sets.at(-1);
    item.sets.push(emptySet(last?.kind === 'warmup' ? 'normal' : 'normal'));
    rebuild();
  };

  const columns = type === 'time'
    ? [h('span', 'Sekundy')]
    : [h('span', type === 'bodyweight' ? '+kg' : 'kg'), h('span', 'Powt.')];

  const showDemo = () => openSheet((close) => h('div.sheet-body',
    h('div.sheet-head.sheet-head-flush', h('h2.sheet-title', exercise.name), iconButton('close', 'Zamknij', close)),
    exerciseDemo(exercise),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, 'Wróć do treningu')),
  { label: exercise.name });

  const card = h(`section.ex-card${type === 'time' ? '.type-time' : ''}`,
    h('div.ex-head',
      hasDemo(exercise.id) && h('button.ex-thumb', { type: 'button', onclick: showDemo, 'aria-label': `Pokaż animację: ${exercise.name}` },
        h('img', { src: demoUrl(exercise.id), alt: '', width: 48, height: 48, loading: 'lazy', referrerPolicy: 'no-referrer', onerror: (event) => { event.currentTarget.parentElement.hidden = true; } })),
      h('div.ex-title', h('h2', exercise.name), h('p', exercise.muscle)),
      iconButton('more', `Opcje: ${exercise.name}`, openMenu)),
    noteField,
    ctx.mode === 'live' && h('button.rest-chip', { type: 'button', onclick: chooseRest, 'aria-label': `Przerwa ${restLabel(restFor(exercise))}. Zmień` },
      icon('timer', 16), `Przerwa ${restLabel(restFor(exercise))}`),
    h('div.set-head', { 'aria-hidden': 'true' }, h('span', 'Seria'), h('span', 'Poprzednio'), columns, h('span')),
    rowsHost,
    h('button.btn.btn-ghost.btn-block.btn-small', { type: 'button', onclick: addSet }, icon('plus', 18), 'Dodaj serię'));
  return card;
}

/**
 * Przesunięcie wiersza z prawej do lewej usuwa serię. Ruch pionowy zostaje przewijaniem,
 * a kierunek rozstrzyga się po pierwszych pikselach, żeby przewijanie niczego nie skasowało.
 */
function attachSwipeToDelete(row, wrapper, onDelete) {
  const LOCK_PX = 10;
  const threshold = () => Math.min(120, row.offsetWidth * 0.35);
  let start = null;
  let swiping = false;

  const finish = () => {
    start = null;
    swiping = false;
    row.classList.remove('swiping');
    wrapper.classList.remove('armed');
  };
  const reset = () => {
    finish();
    row.style.transform = '';
    wrapper.classList.remove('active');
  };

  row.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    swiping = false;
  });

  row.addEventListener('pointermove', (event) => {
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!swiping) {
      if (Math.abs(dy) > LOCK_PX && Math.abs(dy) >= Math.abs(dx)) {
        start = null;
        return;
      }
      if (dx > -LOCK_PX || Math.abs(dx) <= Math.abs(dy)) return;
      swiping = true;
      row.setPointerCapture(event.pointerId);
      row.classList.add('swiping');
      wrapper.classList.add('active');
    }
    const x = Math.min(0, dx);
    row.style.transform = `translateX(${x}px)`;
    wrapper.classList.toggle('armed', -x >= threshold());
  });

  row.addEventListener('pointerup', (event) => {
    if (!start || event.pointerId !== start.id) return;
    if (!swiping) {
      start = null;
      return;
    }
    // Stuknięcie kończące gest nie może jeszcze odhaczyć serii ani otworzyć pola.
    const swallow = (click) => { click.stopPropagation(); click.preventDefault(); };
    row.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => row.removeEventListener('click', swallow, { capture: true }), 300);

    const passed = start.x - event.clientX >= threshold();
    if (!passed) {
      reset();
      return;
    }
    finish();
    wrapper.classList.add('active');
    row.style.transform = 'translateX(-100%)';
    setTimeout(onDelete, 150);
  });

  row.addEventListener('pointercancel', reset);
}

function buildSetRow({ set, type, hint, label, onMenu, onChange, onDelete, exercise }) {
  const fieldFor = (key, { max, integer, inputMode, name }) => {
    const input = h('input.set-input', {
      type: 'text',
      inputMode,
      autocomplete: 'off',
      enterKeyHint: 'done',
      'aria-label': `${name}, seria ${label}`,
      value: inputValue(set[key]),
      placeholder: hint?.[key] != null ? inputValue(hint[key]) : '',
      oninput: () => {
        set[key] = parseNum(input.value, { max, integer });
        input.classList.remove('invalid');
        onChange();
        touch();
      },
      onfocus: () => input.select(),
    });
    return { key, input };
  };

  const fields = type === 'time'
    ? [fieldFor('seconds', { max: MAX_SECONDS, integer: true, inputMode: 'numeric', name: 'Sekundy' })]
    : [
      fieldFor('weight', { max: MAX_WEIGHT, inputMode: 'decimal', name: type === 'bodyweight' ? 'Dociążenie w kg' : 'Ciężar w kg' }),
      fieldFor('reps', { max: MAX_REPS, integer: true, inputMode: 'numeric', name: 'Powtórzenia' }),
    ];

  const prevText = hint?.fromHistory ? fmtSet(hint, type, { compact: true }) : '';
  const prevCell = h('span.set-prev', prevText || '–');

  const disc = h('button.disc', {
    type: 'button',
    'aria-pressed': String(Boolean(set.done)),
    'aria-label': `Odhacz serię ${label}`,
    onclick: () => toggleDone(),
  }, icon('check', 22));

  const node = h(`div.set-row${set.done ? '.done' : ''}${set.kind && set.kind !== 'normal' ? `.${set.kind}` : ''}`,
    h('button.set-num', { type: 'button', onclick: onMenu, 'aria-label': `Opcje serii ${label}` }, label),
    prevCell,
    fields.map((f) => f.input),
    disc);

  const wrapper = h('div.set-swipe', h('div.set-swipe-bg', { 'aria-hidden': 'true' }, 'Usuń'), node);
  attachSwipeToDelete(node, wrapper, onDelete);

  function toggleDone() {
    if (set.done) {
      set.done = false;
    } else {
      // Puste pole przejmuje podpowiedź, więc powtórzenie zeszłej serii to jedno dotknięcie.
      for (const { key, input } of fields) {
        if (set[key] == null && input.value.trim() === '' && hint?.[key] != null) {
          set[key] = hint[key];
          input.value = inputValue(hint[key]);
        }
      }
      if (!isComplete(set, type)) {
        const missing = fields.find(({ key }) => !(set[key] > 0) && !(key === 'weight' && (type === 'bodyweight' || set.weight === 0)));
        (missing ?? fields[0]).input.classList.add('invalid');
        (missing ?? fields[0]).input.focus();
        toast(type === 'time' ? 'Wpisz czas serii w sekundach.' : 'Wpisz ciężar i powtórzenia.');
        return;
      }
      set.done = true;
      if (ctx.mode === 'live') startRest(restFor(exercise));
    }
    node.classList.toggle('done', set.done);
    disc.setAttribute('aria-pressed', String(set.done));
    onChange();
    touch();
  }

  return {
    node: wrapper,
    setRecord(isRecord) {
      prevCell.replaceChildren(isRecord ? recordChip() : (prevText || '–'));
    },
  };
}

// --- Minutnik przerwy ---

function buildRestBar() {
  const time = h('strong.rest-time');
  const progress = h('span.rest-progress');
  const shift = (delta) => {
    const { draft } = ctx;
    if (!draft.restEndAt) return;
    draft.restEndAt += delta * 1000;
    draft.restTotal = Math.max(1, draft.restTotal + delta);
    sound.syncRest((draft.restEndAt - Date.now()) / 1000);
    touch();
    tick();
  };
  const bar = h('div.rest-bar', { hidden: true, role: 'timer', 'aria-label': 'Przerwa' },
    h('span.rest-track', progress),
    h('div.rest-row',
      time,
      h('button.btn.btn-chip', { type: 'button', onclick: () => shift(-15), 'aria-label': 'Skróć przerwę o 15 sekund' }, '−15'),
      h('button.btn.btn-chip', { type: 'button', onclick: () => shift(15), 'aria-label': 'Wydłuż przerwę o 15 sekund' }, '+15'),
      h('button.btn.btn-chip', { type: 'button', onclick: stopRest }, 'Pomiń')));
  bar.time = time;
  bar.progress = progress;
  return bar;
}

function startRest(seconds) {
  clearTimeout(restEndedTimer);
  if (!seconds) {
    stopRest();
    return;
  }
  ctx.draft.restEndAt = Date.now() + seconds * 1000;
  ctx.draft.restTotal = seconds;
  ctx.restBar.classList.remove('ended');
  sound.startRest();
  tick();
}

function stopRest() {
  clearTimeout(restEndedTimer);
  sound.stopRest();
  if (!ctx?.restBar) return;
  ctx.draft.restEndAt = null;
  ctx.restBar.hidden = true;
  ctx.restBar.classList.remove('ended');
  touch();
}

function tick() {
  if (!ctx || ctx.mode !== 'live') return;
  const elapsed = document.getElementById('wk-elapsed');
  if (elapsed) elapsed.textContent = elapsedText();
  const { draft, restBar } = ctx;
  if (!draft.restEndAt) return;
  const left = (draft.restEndAt - Date.now()) / 1000;
  if (left > 0) {
    restBar.hidden = false;
    restBar.time.textContent = fmtClock(Math.ceil(left));
    restBar.progress.style.transform = `scaleX(${Math.min(1, left / draft.restTotal)})`;
    return;
  }
  // Po powrocie z tła spóźniony sygnał tylko by zaskakiwał, więc grany jest tylko na bieżąco.
  const onTime = left > -3;
  draft.restEndAt = null;
  touch();
  if (!onTime) {
    restBar.hidden = true;
    return;
  }
  restBar.time.textContent = 'Koniec przerwy';
  restBar.progress.style.transform = 'scaleX(0)';
  restBar.classList.add('ended');
  sound.beepNow();
  navigator.vibrate?.([200, 100, 200]);
  restEndedTimer = setTimeout(stopRest, 5000);
}

// --- Ekran nie gaśnie w trakcie treningu ---

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch {
    wakeLock = null;
  }
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (ctx?.mode === 'live') {
      requestWakeLock();
      tick();
    }
  } else if (state.active) {
    flushActive();
  }
});
window.addEventListener('pagehide', () => { if (state.active) flushActive(); });

// --- Zakończenie i zapis ---

const countSets = (draft, test) => draft.exercises.reduce((sum, item) => sum + item.sets.filter((s) => test(s, exerciseById(item.exerciseId).type)).length, 0);

/** Zapisywany trening ma tylko zaliczone serie i ćwiczenia, które jakieś mają. */
function finalize(draft) {
  const { restEndAt, restTotal, ...rest } = draft;
  return {
    ...rest,
    name: draft.name.trim() || 'Trening',
    note: draft.note?.trim() ?? '',
    exercises: draft.exercises
      .map((item) => ({
        exerciseId: item.exerciseId,
        note: item.note?.trim() ?? '',
        sets: item.sets.filter((s) => s.done).map(({ done, ...set }) => set),
      }))
      .filter((item) => item.sets.length),
  };
}

/** Pyta o wypełnione, ale nieodhaczone serie. Zwraca false, gdy wybrano powrót do treningu. */
function resolvePending(draft) {
  const pending = countSets(draft, (s, type) => !s.done && isComplete(s, type));
  const partial = countSets(draft, (s, type) => !s.done && !isComplete(s, type) && (s.weight != null || s.reps != null || s.seconds != null));
  if (!pending && !partial) return Promise.resolve(true);
  const title = pending
    ? `Masz ${countOf(pending, 'nieodhaczoną serię', 'nieodhaczone serie', 'nieodhaczonych serii')}`
    : `Masz ${countOf(partial, 'niedokończoną serię', 'niedokończone serie', 'niedokończonych serii')}`;
  const partialNote = partial ? `Bez kompletu danych nie da się zapisać: ${countOf(partial, 'seria', 'serie', 'serii')}.` : null;
  return new Promise((resolve) => {
    let answer = false;
    openSheet((close) => h('div.sheet-body',
      h('h2.sheet-title', title),
      pending > 0 && h('p.sheet-text', 'Są wypełnione, ale nie zostały odhaczone.'),
      partialNote && h('p.sheet-text', partialNote),
      pending > 0 && h('button.btn.btn-primary.btn-block', {
        type: 'button',
        onclick: () => {
          draft.exercises.forEach((item) => {
            const { type } = exerciseById(item.exerciseId);
            item.sets.forEach((s) => { if (isComplete(s, type)) s.done = true; });
          });
          answer = true;
          close();
        },
      }, 'Zalicz je i zapisz'),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => { answer = true; close(); } }, pending ? 'Pomiń je i zapisz' : 'Pomiń i zapisz'),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, 'Wróć do treningu')),
    { label: 'Nieodhaczone serie', onClose: () => resolve(answer) });
  });
}

async function finishLive() {
  const { draft } = ctx;
  const anything = countSets(draft, (s, type) => s.done || isComplete(s, type));
  if (!anything) {
    const confirmed = await ask({
      title: 'Ten trening nie ma żadnej serii',
      text: 'Nie ma czego zapisać. Możesz go odrzucić albo wrócić i dodać serie.',
      confirm: 'Odrzuć trening',
      danger: true,
      cancel: 'Wróć do treningu',
    });
    if (confirmed) await closeLive();
    return;
  }
  if (!(await resolvePending(draft))) return;
  const workout = finalize(draft);
  if (!workout.exercises.length) {
    toast('Odhacz choć jedną serię, żeby zapisać trening.');
    return;
  }
  workout.endedAt = Date.now();
  await saveWorkout(workout);
  const records = workoutRecords(workout, state.workouts, exerciseById);
  await closeLive();
  showSummary(workout, records);
}

async function discardLive() {
  const confirmed = await ask({
    title: 'Odrzucić ten trening?',
    text: 'Wpisane serie nie zostaną zapisane.',
    confirm: 'Odrzuć trening',
    danger: true,
    cancel: 'Wróć do treningu',
  });
  if (confirmed) await closeLive();
}

async function closeLive() {
  clearTimeout(restEndedTimer);
  sound.stopRest();
  unmount();
  await setActive(null);
}

async function cancelEdit() {
  if (ctx.isNew && countSets(ctx.draft, (s) => s.done || s.weight != null || s.reps != null || s.seconds != null) > 0) {
    const confirmed = await ask({
      title: 'Porzucić ten trening?',
      text: 'Wpisane serie nie zostaną zapisane.',
      confirm: 'Porzuć trening',
      danger: true,
      cancel: 'Wróć do wpisywania',
    });
    if (!confirmed) return;
  }
  unmount();
}

async function saveEdit() {
  const { draft, onSaved, isNew } = ctx;
  if (draft.startedAt > Date.now()) {
    toast('Początek treningu nie może być w przyszłości.');
    return;
  }
  // Przy wpisywaniu z pamięci każda pełna seria się liczy, więc odhaczanie jest tu opcjonalne.
  if (isNew) {
    draft.exercises.forEach((item) => {
      const { type } = exerciseById(item.exerciseId);
      item.sets.forEach((s) => { if (isComplete(s, type)) s.done = true; });
    });
  }
  if (!(await resolvePending(draft))) return;
  const workout = finalize(draft);
  if (!workout.exercises.length) {
    toast(isNew
      ? 'Wpisz choć jedną serię, żeby zapisać trening.'
      : 'Trening musi mieć choć jedną serię. Żeby go skasować, użyj „Usuń trening”.');
    return;
  }
  await saveWorkout(workout);
  unmount();
  // Zapis nastąpił przy otwartym edytorze, więc ekran pod spodem trzeba odświeżyć dopiero teraz.
  document.dispatchEvent(new CustomEvent('workout-collapsed'));
  if (isNew) location.hash = `#/dziennik/${workout.id}`;
  toast(isNew ? 'Zapisano trening.' : 'Zapisano zmiany.');
  onSaved?.();
}

function showSummary(workout, records) {
  openSheet((close) => h('div.sheet-body',
    h('h2.sheet-title', 'Trening zapisany'),
    h('div.stats',
      stat('Czas', fmtDuration(workout.endedAt - workout.startedAt)),
      stat('Objętość', fmtVolume(workoutVolume(workout))),
      stat('Serie', String(workingSetCount(workout)))),
    records.length > 0 && h('div.summary-records',
      h('h3.list-label', 'Nowe rekordy'),
      h('ul.record-list', records.map((record) => h('li',
        recordChip(),
        h('span.record-text',
          h('span.record-name', exerciseById(record.exerciseId).name),
          h('span.record-meta', `${record.label}: ${fmtUnit(record.value, record.unit)}`)))))),
    h('button.btn.btn-primary.btn-block', { type: 'button', onclick: close }, 'Gotowe'),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => { close(); saveWorkoutAsRoutine(workout); } }, 'Zapisz jako rutynę')),
  { label: 'Trening zapisany' });
}

export const stat = (label, value) => h('div.stat', h('span.stat-value', value), h('span.stat-label', label));
