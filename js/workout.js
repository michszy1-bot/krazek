// Ekran treningu: trwającego (zapis na bieżąco, minutnik) oraz edycji zapisanego.

import { actionSheet, ask, h, icon, iconButton, openSheet, particles, recordChip, toast } from './ui.js';
import { hasRecordSparks } from './shop.js';
import { countOf, fmtClock, fmtDuration, fmtNum, fmtSet, fmtSetChange, fmtUnit, fmtVolume, inputValue, parseNum, pastWorkoutStart, toLocalInput } from './format.js';
import { emptySet, exerciseSessions, flagRecords, isComplete, isWorking, recordsFor, restAfterSet, RPE_SCALE, SET_KINDS, setLabels, stepBaseWeight, steppedWeight, suggestNextWeight, swapExercise, warmupSets, weightStep, workingSetCount, workoutComparison, workoutRecords, workoutVolume } from './stats.js';
import { exerciseById, flushActive, holdPlate, newId, releasePlate, saveActiveSoon, saveExercise, saveRoutines, saveWorkout, setActive, state } from './store.js';
import { pickExercises, stickyNoteSheet } from './picker.js';
import { hasOwnName, putRoutine, routineDiffers, routineFromWorkout } from './routines.js';
import { demoUrl, exerciseDemo, hasDemo } from './demo.js';
import { workoutGain } from './level.js';
import { levelGainBlock, levelOptions } from './level-views.js';
import { saveWorkoutAsRoutine } from './routine-views.js';
import * as sound from './sound.js';
import { L } from './i18n.js';
import { muscleName } from './exercises.js';

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
const MAX_WEIGHT = 1500;
const MAX_REPS = 1000;
const MAX_SECONDS = 36000;

let ctx = null; // { draft, mode: 'live' | 'edit', layer, cards, onSaved }
let tickTimer = null;
let restEndedTimer = null;
let wakeLock = null;

function defaultName(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return L('Trening poranny', 'Morning workout');
  if (hour < 18) return L('Trening popołudniowy', 'Afternoon workout');
  return L('Trening wieczorny', 'Evening workout');
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
    toast(L('Masz trening w toku. Zakończ go, żeby zacząć rutynę.', 'You have a workout in progress. Finish it to start a routine.'), { actionLabel: L('Wróć', 'Back'), onAction: resumeWorkout });
    return;
  }
  const exercises = routine.exercises
    .filter((item) => exerciseById(item.exerciseId))
    .map((item) => ({
      exerciseId: item.exerciseId,
      note: '',
      sets: item.sets.map((kind) => emptySet(kind)),
      ...(item.repRange ? { repRange: item.repRange } : {}),
    }));
  await setActive({ id: newId(), name: routine.name, routineId: routine.id, startedAt: Date.now(), note: '', exercises, restEndAt: null, restTotal: 0 });
  resumeWorkout();
}

/** Nowy trening na wzór zapisanego: te same ćwiczenia i serie, a ciężary jako podpowiedzi. */
export function repeatWorkout(workout) {
  const name = hasOwnName(workout) ? workout.name : defaultName();
  return startRoutine(routineFromWorkout(workout, { id: null, name }));
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
    draft: { id: newId(), name: L('Trening', 'Workout'), startedAt, endedAt: startedAt + 3600000, note: '', exercises: [] },
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
      iconButton('down', L('Zwiń trening', 'Minimise workout'), collapse),
      h('p.wk-clock', { 'aria-label': L('Czas treningu', 'Workout time') }, h('span', { id: 'wk-elapsed' }, elapsedText())),
      h('button.btn.btn-finish', { type: 'button', onclick: finishLive }, L('Zakończ', 'Finish')))
    : h('header.wk-head',
      iconButton('close', isNew ? L('Anuluj dodawanie', 'Cancel adding') : L('Anuluj edycję', 'Cancel editing'), cancelEdit),
      h('p.wk-head-title', isNew ? L('Wcześniejszy trening', 'Past workout') : L('Edycja treningu', 'Edit workout')),
      h('button.btn.btn-finish', { type: 'button', onclick: saveEdit }, L('Zapisz', 'Save')));

  const nameInput = h('input.wk-name', {
    type: 'text',
    value: draft.name,
    maxLength: 60,
    'aria-label': L('Nazwa treningu', 'Workout name'),
    oninput: () => { draft.name = nameInput.value; touch(); },
  });

  const noteInput = h('textarea.wk-note', {
    rows: 2,
    placeholder: L('Jak poszło? Samopoczucie, sen, ból…', 'How did it go? Mood, sleep, pain…'),
    'aria-label': L('Notatka do treningu', 'Workout note'),
    value: draft.note ?? '',
    oninput: () => { draft.note = noteInput.value; touch(); },
  });

  const scroll = h('div.wk-scroll',
    nameInput,
    !live && editTimeFields(),
    cardsHost,
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: addExercises }, icon('plus', 20), L('Dodaj ćwiczenie', 'Add exercise')),
    h('label.field', h('span.field-label', L('Notatka do treningu', 'Workout note')), noteInput),
    live && h('button.btn.btn-text-danger.btn-block', { type: 'button', onclick: discardLive }, L('Odrzuć trening', 'Discard workout')));

  const layerLabel = live ? L('Trening w toku', 'Workout in progress') : (isNew ? L('Wcześniejszy trening', 'Past workout') : L('Edycja treningu', 'Edit workout'));
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
    h('label.field', h('span.field-label', L('Początek', 'Start')), start),
    h('label.field.field-narrow', h('span.field-label', L('Czas (min)', 'Length (min)')), minutes));
}

// --- Karty ćwiczeń ---

function renderCards() {
  ctx.cardsHost.replaceChildren(...ctx.draft.exercises.map(buildCard));
  if (!ctx.draft.exercises.length) {
    ctx.cardsHost.append(h('p.wk-hint', ctx.isNew
      ? L('Ustaw datę, dodaj ćwiczenia i wpisz serie z tamtego treningu.', 'Set the date, add exercises and enter the sets from that workout.')
      : L('Dodaj pierwsze ćwiczenie, a potem odhaczaj kolejne serie.', 'Add your first exercise, then tick off each set.')));
  }
}

function addExercises() {
  pickExercises((ids) => {
    const present = new Set(ctx.draft.exercises.map((i) => i.exerciseId));
    const fresh = ids.filter((id) => !present.has(id));
    if (fresh.length < ids.length) toast(L('Ćwiczenia, które już są w treningu, zostały pominięte.', 'Exercises already in the workout were skipped.'));
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
const restLabel = (seconds) => (seconds ? fmtClock(seconds) : L('wył.', 'off'));

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
    // Rozgrzewka nie podpowiada ciężaru serii roboczej.
    for (let i = index - 1; i >= 0; i -= 1) {
      if (isWorking(item.sets[i]) === isWorking(set) && isComplete(item.sets[i], type)) return item.sets[i];
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
    toast(L('Usunięto serię.', 'Set deleted.'), {
      actionLabel: L('Cofnij', 'Undo'),
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
    actionSheet(L(`Seria ${numberLabel(index)}`, `Set ${numberLabel(index)}`), [
      ...Object.entries(SET_KINDS).map(([kind, { label, hint }]) => ({
        label,
        hint,
        selected: (set.kind ?? 'normal') === kind,
        onClick: () => { set.kind = kind; rebuild(); },
      })),
      set.done && isWorking(set) && {
        label: L('Oceń wysiłek (RPE)', 'Rate effort (RPE)'),
        hint: set.rpe ? L(`Teraz: ${set.rpe}`, `Now: ${set.rpe}`) : L('Ile powtórzeń zostało w zapasie', 'How many reps you had left'),
        onClick: () => rows[index].openRpe(),
      },
      {
        label: L('Usuń serię', 'Delete set'),
        danger: true,
        onClick: () => deleteSet(set),
      },
    ]);
  };

  const rowsHost = h('div.set-rows');
  item.sets.forEach((set, index) => {
    const onChange = () => { refreshFlags(); refreshWeightBar(); };
    const row = buildSetRow({ set, type, hint: hintFor(index), label: numberLabel(index), onMenu: () => setMenu(index), onChange, onDelete: () => deleteSet(set), exercise });
    rows.push(row);
    rowsHost.append(row.node);
  });
  refreshFlags();

  // Szybka zmiana ciężaru bez klawiatury. Działa na pierwszą nieodhaczoną serię, żeby karta nie była ciasna.
  const step = weightStep(exercise.equipment);
  const stepText = fmtNum(step);
  const barLabel = h('strong.weight-bar-value', { 'aria-live': 'polite' });
  const activeIndex = () => item.sets.findIndex((s) => !s.done);
  const changeWeight = (delta) => {
    const index = activeIndex();
    if (index < 0) return;
    const value = steppedWeight(stepBaseWeight(item.sets, index, hintFor(index)?.weight), delta);
    item.sets[index].weight = value;
    rows[index].setValue('weight', value);
    refreshFlags();
    refreshWeightBar();
    touch();
  };
  const minus = h('button.btn.btn-chip', { type: 'button', 'aria-label': L(`Zmniejsz ciężar o ${stepText} kg`, `Decrease weight by ${stepText} kg`), onclick: () => changeWeight(-step) }, `−${stepText}`);
  const plus = h('button.btn.btn-chip', { type: 'button', 'aria-label': L(`Zwiększ ciężar o ${stepText} kg`, `Increase weight by ${stepText} kg`), onclick: () => changeWeight(step) }, `+${stepText}`);
  const weightBar = type === 'time' ? null : h('div.weight-bar', minus, barLabel, plus);
  function refreshWeightBar() {
    if (!weightBar) return;
    const index = activeIndex();
    weightBar.hidden = index < 0;
    if (index < 0) return;
    const base = stepBaseWeight(item.sets, index, hintFor(index)?.weight);
    barLabel.textContent = L(`Seria ${numberLabel(index)}: ${fmtUnit(base, 'kg')}`, `Set ${numberLabel(index)}: ${fmtUnit(base, 'kg')}`);
    minus.disabled = base <= 0;
  }
  refreshWeightBar();

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
        title: L(`Usunąć ${exercise.name}?`, `Remove ${exercise.name}?`),
        text: L('Odhaczone serie tego ćwiczenia znikną z treningu.', 'Ticked sets of this exercise will be removed from the workout.'),
        confirm: L('Usuń ćwiczenie', 'Remove exercise'),
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
    placeholder: L('Notatka do ćwiczenia', 'Exercise note'),
    'aria-label': L(`Notatka do ćwiczenia ${exercise.name}`, `Note for ${exercise.name}`),
    value: item.note ?? '',
    hidden: !item.note,
    oninput: () => { item.note = noteField.value; touch(); },
  });

  const chooseRest = () => actionSheet(L(`Przerwa: ${exercise.name}`, `Rest: ${exercise.name}`), REST_OPTIONS.map((seconds) => ({
    label: seconds ? fmtClock(seconds) : L('Bez minutnika', 'No timer'),
    selected: restFor(exercise) === seconds,
    onClick: async () => {
      await saveExercise({ ...exercise, restSec: seconds });
      card.replaceWith(buildCard(item));
    },
  })));

  const editStickyNote = () => stickyNoteSheet(exercise, () => card.replaceWith(buildCard(item)));

  // Propozycja większego ciężaru znika po użyciu albo po odhaczeniu pierwszej serii.
  const nextWeight = ctx.mode === 'live' && type === 'weight' && !item.suggestionUsed && !item.sets.some((s) => s.done)
    ? suggestNextWeight(previous, item.repRange, exercise.equipment)
    : null;
  const useNextWeight = () => {
    item.sets.forEach((set) => {
      if (set.kind !== 'warmup' && set.kind !== 'drop' && !set.done) set.weight = nextWeight.weight;
    });
    item.suggestionUsed = true;
    rebuild();
  };

  const swapTo = ([id]) => {
    const { draft } = ctx;
    const list = draft.exercises;
    if (list.some((other) => other.exerciseId === id)) {
      toast(L('To ćwiczenie już jest w treningu.', 'This exercise is already in the workout.'));
      return;
    }
    const { kept, fresh } = swapExercise(item, id);
    const replacement = kept ? [kept, fresh] : [fresh];
    list.splice(list.indexOf(item), 1, ...replacement);
    renderCards();
    touch();
    toast(L(`Zamieniono na: ${exerciseById(id).name}.`, `Swapped for: ${exerciseById(id).name}.`), {
      actionLabel: L('Cofnij', 'Undo'),
      onAction: () => {
        if (ctx?.draft !== draft || !replacement.every((part) => list.includes(part))) return;
        list.splice(list.indexOf(replacement[0]), replacement.length, item);
        renderCards();
        touch();
      },
    });
  };

  const swapOption = () => {
    if (ctx.mode !== 'live' || item.sets.every((s) => s.done)) return null;
    return {
      label: L('Zamień ćwiczenie', 'Swap exercise'),
      hint: item.sets.some((s) => s.done) ? L('Odhaczone serie zostają przy tym ćwiczeniu', 'Ticked sets stay with this exercise') : L('Liczba serii zostaje', 'The number of sets stays'),
      onClick: () => pickExercises(swapTo, { single: true, title: L(`Zamień: ${exercise.name}`, `Swap: ${exercise.name}`), muscle: exercise.muscle }),
    };
  };

  const warmupOption = () => {
    // Rozgrzewka ma sens przed pierwszą serią, więc opcja znika po odhaczeniu serii albo gdy rozgrzewka już jest.
    if (ctx.mode !== 'live' || type !== 'weight' || !item.sets.length || item.sets.some((s) => s.done || !isWorking(s))) return null;
    const base = stepBaseWeight(item.sets, 0, hintFor(0)?.weight);
    const sets = warmupSets(base, exercise.equipment);
    if (sets.length) {
      return {
        label: L('Dodaj rozgrzewkę', 'Add warm-up'),
        hint: sets.map((set) => `${fmtUnit(set.weight, 'kg')} × ${set.reps}`).join(', '),
        onClick: () => { item.sets.unshift(...sets); rebuild(); },
      };
    }
    if (base > 0) return null; // Ciężar jest za mały, żeby go jeszcze dzielić.
    return { label: L('Dodaj rozgrzewkę', 'Add warm-up'), hint: L('Najpierw wpisz ciężar pierwszej serii', 'Enter the weight of the first set first'), onClick: () => toast(L('Wpisz ciężar pierwszej serii, a wyliczę rozgrzewkę.', 'Enter the weight of the first set and the warm-up will be worked out.')) };
  };

  const openMenu = () => {
    const position = ctx.draft.exercises.indexOf(item);
    actionSheet(exercise.name, [
      swapOption(),
      warmupOption(),
      { label: item.note || !noteField.hidden ? L('Edytuj notatkę', 'Edit note') : L('Dodaj notatkę', 'Add note'), hint: L('Tylko w tym treningu', 'Only in this workout'), onClick: () => { noteField.hidden = false; noteField.focus(); } },
      { label: exercise.stickyNote ? L('Edytuj stałą notatkę', 'Edit pinned note') : L('Dodaj stałą notatkę', 'Add pinned note'), hint: L('Przy każdym treningu', 'In every workout'), onClick: editStickyNote },
      position > 0 && { label: L('Przesuń wyżej', 'Move up'), onClick: () => moveTo(-1) },
      position < ctx.draft.exercises.length - 1 && { label: L('Przesuń niżej', 'Move down'), onClick: () => moveTo(1) },
      { label: L('Usuń z treningu', 'Remove from workout'), danger: true, onClick: removeExercise },
    ].filter(Boolean));
  };

  const addSet = () => {
    const last = item.sets.at(-1);
    item.sets.push(emptySet(last?.kind === 'warmup' ? 'normal' : 'normal'));
    rebuild();
  };

  const columns = type === 'time'
    ? [h('span', L('Sekundy', 'Seconds'))]
    : [h('span', type === 'bodyweight' ? '+kg' : 'kg'), h('span', L('Powt.', 'Reps'))];

  const showDemo = () => openSheet((close) => h('div.sheet-body',
    h('div.sheet-head.sheet-head-flush', h('h2.sheet-title', exercise.name), iconButton('close', L('Zamknij', 'Close'), close)),
    exerciseDemo(exercise),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L('Wróć do treningu', 'Back to workout'))),
  { label: exercise.name });

  const card = h(`section.ex-card${type === 'time' ? '.type-time' : ''}`,
    h('div.ex-head',
      hasDemo(exercise.id) && h('button.ex-thumb', { type: 'button', onclick: showDemo, 'aria-label': L(`Pokaż animację: ${exercise.name}`, `Show animation: ${exercise.name}`) },
        h('img', { src: demoUrl(exercise.id), alt: '', width: 48, height: 48, loading: 'lazy', referrerPolicy: 'no-referrer', onerror: (event) => { event.currentTarget.parentElement.hidden = true; } })),
      h('div.ex-title', h('h2', exercise.name), h('p', muscleName(exercise.muscle))),
      iconButton('more', L(`Opcje: ${exercise.name}`, `Options: ${exercise.name}`), openMenu)),
    exercise.stickyNote && h('button.sticky-note', { type: 'button', onclick: editStickyNote, 'aria-label': L(`Stała notatka: ${exercise.stickyNote}. Edytuj`, `Pinned note: ${exercise.stickyNote}. Edit`) },
      icon('pin', 16), h('span', exercise.stickyNote)),
    item.repRange && h('p.rep-range', L(`Zakres: ${item.repRange.min === item.repRange.max ? item.repRange.min : `${item.repRange.min}–${item.repRange.max}`} powt.`, `Target: ${item.repRange.min === item.repRange.max ? item.repRange.min : `${item.repRange.min}–${item.repRange.max}`} reps`)),
    nextWeight && h('div.next-weight',
      h('span', L(`${nextWeight.reason === 'rpe' ? 'Ostatnio było lekko: co najmniej 3 powtórzenia w zapasie.' : 'Ostatnio wszystkie serie w górze zakresu.'} Spróbuj ${fmtUnit(nextWeight.weight, 'kg')}.`, `${nextWeight.reason === 'rpe' ? 'Last time felt light: 3 or more reps left.' : 'Last time every set hit the top of the range.'} Try ${fmtUnit(nextWeight.weight, 'kg')}.`)),
      h('button.btn.btn-chip', { type: 'button', onclick: useNextWeight }, L('Użyj', 'Use'))),
    noteField,
    ctx.mode === 'live' && h('button.rest-chip', { type: 'button', onclick: chooseRest, 'aria-label': L(`Przerwa ${restLabel(restFor(exercise))}. Zmień`, `Rest ${restLabel(restFor(exercise))}. Change`) },
      icon('timer', 16), L(`Przerwa ${restLabel(restFor(exercise))}`, `Rest ${restLabel(restFor(exercise))}`)),
    h('div.set-head', { 'aria-hidden': 'true' }, h('span', L('Seria', 'Set')), h('span', L('Poprzednio', 'Previous')), columns, h('span')),
    rowsHost,
    weightBar,
    h('button.btn.btn-ghost.btn-block.btn-small', { type: 'button', onclick: addSet }, icon('plus', 18), L('Dodaj serię', 'Add set')));
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

/** Pokazuje na środku ekranu następną nieodhaczoną serię, także w kolejnym ćwiczeniu. */
function scrollToNextSet(row) {
  const next = [...ctx.cardsHost.querySelectorAll('.set-row:not(.done)')]
    .find((other) => row.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING);
  if (!next) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  next.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
}

let closeRpeStrip = null;

function buildSetRow({ set, type, hint, label, onMenu, onChange, onDelete, exercise }) {
  const fieldFor = (key, { max, integer, inputMode, name }) => {
    const input = h('input.set-input', {
      type: 'text',
      inputMode,
      autocomplete: 'off',
      enterKeyHint: 'done',
      'aria-label': L(`${name}, seria ${label}`, `${name}, set ${label}`),
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
    ? [fieldFor('seconds', { max: MAX_SECONDS, integer: true, inputMode: 'numeric', name: L('Sekundy', 'Seconds') })]
    : [
      fieldFor('weight', { max: MAX_WEIGHT, inputMode: 'decimal', name: type === 'bodyweight' ? L('Dociążenie w kg', 'Added weight in kg') : L('Ciężar w kg', 'Weight in kg') }),
      fieldFor('reps', { max: MAX_REPS, integer: true, inputMode: 'numeric', name: L('Powtórzenia', 'Reps') }),
    ];

  const prevText = hint?.fromHistory ? fmtSet(hint, type, { compact: true }) : '';
  const prevCell = h('span.set-prev', prevText || '–');
  let showRecord = false;

  // Odhaczona seria z oceną pokazuje swoją ocenę zamiast wyniku z poprzedniego treningu.
  const renderPrev = () => {
    const parts = [];
    if (showRecord) parts.push(recordChip());
    if (set.rpe) parts.push(h('span.set-rpe', `RPE ${set.rpe}`));
    prevCell.replaceChildren(...(parts.length ? parts : [prevText || '–']));
  };

  const disc = h('button.disc', {
    type: 'button',
    'aria-pressed': String(Boolean(set.done)),
    'aria-label': L(`Odhacz serię ${label}`, `Tick off set ${label}`),
    onclick: () => toggleDone(),
  }, icon('check', 22));

  const node = h(`div.set-row${set.done ? '.done' : ''}${set.kind && set.kind !== 'normal' ? `.${set.kind}` : ''}`,
    h('button.set-num', { type: 'button', onclick: onMenu, 'aria-label': L(`Opcje serii ${label}`, `Set ${label} options`) }, label),
    prevCell,
    fields.map((f) => f.input),
    disc);

  const wrapper = h('div.set-swipe', h('div.set-swipe-bg', { 'aria-hidden': 'true' }, L('Usuń', 'Delete')), node);
  attachSwipeToDelete(node, wrapper, onDelete);

  /** Skala pod odhaczoną serią. Jedno dotknięcie zapisuje ocenę, a następna seria chowa skalę bez oceny. */
  function openRpe() {
    closeRpeStrip?.();
    const strip = h('div.rpe-strip',
      h('p.rpe-title', L('RPE: ile powtórzeń zostało w zapasie?', 'RPE: how many reps did you have left?')),
      h('div.rpe-choices', RPE_SCALE.map(({ value, left }) => h(`button.rpe-choice${set.rpe === value ? '.selected' : ''}`, {
        type: 'button',
        'aria-pressed': String(set.rpe === value),
        'aria-label': L(`RPE ${value}, w zapasie ${left}`, `RPE ${value}, ${left} left`),
        onclick: () => {
          if (set.rpe === value) delete set.rpe;
          else set.rpe = value;
          renderPrev();
          touch();
          closeRpeStrip?.();
        },
      }, h('strong', String(value)), h('span', L(`zapas ${left}`, `${left} left`))))));
    wrapper.after(strip);
    closeRpeStrip = () => { strip.remove(); closeRpeStrip = null; };
  }

  function toggleDone() {
    closeRpeStrip?.();
    if (set.done) {
      set.done = false;
      delete set.rpe;
      renderPrev();
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
        toast(type === 'time' ? L('Wpisz czas serii w sekundach.', 'Enter the set time in seconds.') : L('Wpisz ciężar i powtórzenia.', 'Enter weight and reps.'));
        return;
      }
      set.done = true;
      if (ctx.mode === 'live') startRest(restAfterSet(set, restFor(exercise)));
      if (state.settings.askRpe && isWorking(set)) openRpe();
    }
    node.classList.toggle('done', set.done);
    disc.setAttribute('aria-pressed', String(set.done));
    onChange();
    touch();
    if (set.done && ctx.mode === 'live') scrollToNextSet(node);
  }

  return {
    node: wrapper,
    setValue(key, value) {
      const field = fields.find((f) => f.key === key);
      field.input.value = inputValue(value);
      field.input.classList.remove('invalid');
    },
    setRecord(isRecord) {
      showRecord = isRecord;
      renderPrev();
    },
    openRpe,
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
  const bar = h('div.rest-bar', { hidden: true, role: 'timer', 'aria-label': L('Przerwa', 'Rest') },
    h('span.rest-track', progress),
    h('div.rest-row',
      time,
      h('button.btn.btn-chip', { type: 'button', onclick: () => shift(-15), 'aria-label': L('Skróć przerwę o 15 sekund', 'Shorten rest by 15 seconds') }, '−15'),
      h('button.btn.btn-chip', { type: 'button', onclick: () => shift(15), 'aria-label': L('Wydłuż przerwę o 15 sekund', 'Extend rest by 15 seconds') }, '+15'),
      h('button.btn.btn-chip', { type: 'button', onclick: stopRest }, L('Pomiń', 'Skip'))));
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
  restBar.time.textContent = L('Koniec przerwy', 'Rest over');
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
  const { restEndAt, restTotal, routineId, ...rest } = draft;
  return {
    ...rest,
    name: draft.name.trim() || L('Trening', 'Workout'),
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
    ? L(`Masz ${countOf(pending, 'nieodhaczoną serię', 'nieodhaczone serie', 'nieodhaczonych serii')}`, `You have ${countOf(pending, '', '', '', 'unticked set', 'unticked sets')}`)
    : L(`Masz ${countOf(partial, 'niedokończoną serię', 'niedokończone serie', 'niedokończonych serii')}`, `You have ${countOf(partial, '', '', '', 'unfinished set', 'unfinished sets')}`);
  const partialNote = partial ? L(`Bez kompletu danych nie da się zapisać: ${countOf(partial, 'seria', 'serie', 'serii')}.`, `Can’t be saved without complete data: ${countOf(partial, '', '', '', 'set', 'sets')}.`) : null;
  return new Promise((resolve) => {
    let answer = false;
    openSheet((close) => h('div.sheet-body',
      h('h2.sheet-title', title),
      pending > 0 && h('p.sheet-text', L('Są wypełnione, ale nie zostały odhaczone.', 'They’re filled in but not ticked off.')),
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
      }, L('Zalicz je i zapisz', 'Count them and save')),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => { answer = true; close(); } }, pending ? L('Pomiń je i zapisz', 'Skip them and save') : L('Pomiń i zapisz', 'Skip and save')),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L('Wróć do treningu', 'Back to workout'))),
    { label: L('Nieodhaczone serie', 'Unticked sets'), onClose: () => resolve(answer) });
  });
}

async function finishLive() {
  const { draft } = ctx;
  const anything = countSets(draft, (s, type) => s.done || isComplete(s, type));
  if (!anything) {
    const confirmed = await ask({
      title: L('Ten trening nie ma żadnej serii', 'This workout has no sets'),
      text: L('Nie ma czego zapisać. Możesz go odrzucić albo wrócić i dodać serie.', 'There’s nothing to save. You can discard it or go back and add sets.'),
      confirm: L('Odrzuć trening', 'Discard workout'),
      danger: true,
      cancel: L('Wróć do treningu', 'Back to workout'),
    });
    if (confirmed) await closeLive();
    return;
  }
  if (!(await resolvePending(draft))) return;
  const workout = finalize(draft);
  if (!workout.exercises.length) {
    toast(L('Odhacz choć jedną serię, żeby zapisać trening.', 'Tick off at least one set to save the workout.'));
    return;
  }
  workout.endedAt = Date.now();
  holdPlate(workout.id);
  await saveWorkout(workout);
  const records = workoutRecords(workout, state.workouts, exerciseById);
  const gain = workoutGain(state.workouts, workout, exerciseById, levelOptions());
  // Porównanie z planem z treningu, a nie z zapisem, bo pominięta seria to jeszcze nie zmiana rutyny.
  const routine = state.routines.find((r) => r.id === draft.routineId) ?? null;
  const planned = routine ? routineFromWorkout(draft, routine) : null;
  await closeLive();
  showSummary(workout, records, gain, routine, planned?.exercises.length && routineDiffers(routine, planned) ? planned : null);
}

async function discardLive() {
  const confirmed = await ask({
    title: L('Odrzucić ten trening?', 'Discard this workout?'),
    text: L('Wpisane serie nie zostaną zapisane.', 'The sets you entered won’t be saved.'),
    confirm: L('Odrzuć trening', 'Discard workout'),
    danger: true,
    cancel: L('Wróć do treningu', 'Back to workout'),
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
      title: L('Porzucić ten trening?', 'Abandon this workout?'),
      text: L('Wpisane serie nie zostaną zapisane.', 'The sets you entered won’t be saved.'),
      confirm: L('Porzuć trening', 'Abandon workout'),
      danger: true,
      cancel: L('Wróć do wpisywania', 'Keep editing'),
    });
    if (!confirmed) return;
  }
  unmount();
}

async function saveEdit() {
  const { draft, onSaved, isNew } = ctx;
  if (draft.startedAt > Date.now()) {
    toast(L('Początek treningu nie może być w przyszłości.', 'The workout can’t start in the future.'));
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
      ? L('Wpisz choć jedną serię, żeby zapisać trening.', 'Enter at least one set to save the workout.')
      : L('Trening musi mieć choć jedną serię. Żeby go skasować, użyj „Usuń trening”.', 'A workout needs at least one set. To remove it, use “Delete workout”.'));
    return;
  }
  await saveWorkout(workout);
  unmount();
  // Zapis nastąpił przy otwartym edytorze, więc ekran pod spodem trzeba odświeżyć dopiero teraz.
  document.dispatchEvent(new CustomEvent('workout-collapsed'));
  if (isNew) location.hash = `#/dziennik/${workout.id}`;
  toast(isNew ? L('Zapisano trening.', 'Workout saved.') : L('Zapisano zmiany.', 'Changes saved.'));
  onSaved?.();
}

function showSummary(workout, records, gain, routine, updatedRoutine) {
  const changes = workoutComparison(workout, state.workouts, exerciseById);
  openSheet((close) => h('div.sheet-body.sheet-summary',
    records.length > 0 && hasRecordSparks(state.shop) && h('span.spark-burst', { 'aria-hidden': 'true' }, particles('spark', 22, 150)),
    h('h2.sheet-title', L('Trening zapisany', 'Workout saved')),
    h('div.stats',
      stat(L('Czas', 'Time'), fmtDuration(workout.endedAt - workout.startedAt)),
      stat(L('Objętość', 'Volume'), fmtVolume(workoutVolume(workout))),
      stat(L('Serie', 'Sets'), String(workingSetCount(workout)))),
    levelGainBlock(gain),
    changes.length > 0 && h('div.summary-records',
      h('h3.list-label', L('Względem poprzedniego razu', 'Compared with last time')),
      h('ul.change-list', changes.map((change) => h('li',
        h('span.change-text',
          h('span.record-name', change.name),
          h('span.record-meta', L(`${fmtSet(change.now, change.type, { compact: true })} · było ${fmtSet(change.before, change.type, { compact: true })}`, `${fmtSet(change.now, change.type, { compact: true })} · was ${fmtSet(change.before, change.type, { compact: true })}`))),
        h(`span.change-value${change.direction > 0 ? '.up' : ''}`, fmtSetChange(change)))))),
    records.length > 0 && h('div.summary-records',
      h('h3.list-label', L('Nowe rekordy', 'New records')),
      h('ul.record-list', records.map((record) => h('li',
        recordChip(),
        h('span.record-text',
          h('span.record-name', exerciseById(record.exerciseId).name),
          h('span.record-meta', `${record.label}: ${fmtUnit(record.value, record.unit)}`)))))),
    updatedRoutine && h('p.sheet-text', L(`Ćwiczenia lub serie różnią się od rutyny „${routine.name}”.`, `The exercises or sets differ from the routine “${routine.name}”.`)),
    updatedRoutine && h('button.btn.btn-primary.btn-block', {
      type: 'button',
      onclick: async () => {
        await saveRoutines(putRoutine(state.routines, updatedRoutine));
        close();
        toast(L(`Zaktualizowano rutynę: ${routine.name}.`, `Routine updated: ${routine.name}.`));
      },
    }, L('Zaktualizuj rutynę', 'Update routine')),
    h(`button.btn.btn-block.${updatedRoutine ? 'btn-ghost' : 'btn-primary'}`, { type: 'button', onclick: close }, updatedRoutine ? L('Zostaw rutynę bez zmian', 'Keep the routine as is') : L('Gotowe', 'Done')),
    !routine && h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => { close(); saveWorkoutAsRoutine(workout); } }, L('Zapisz jako rutynę', 'Save as routine'))),
  { label: L('Trening zapisany', 'Workout saved'), onClose: releasePlate });
}

export const stat = (label, value) => h('div.stat', h('span.stat-value', value), h('span.stat-label', label));
