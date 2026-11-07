// Rutyny na ekranie: lista na starcie, edytor oraz zapis treningu jako rutyny.

import { actionSheet, h, icon, iconButton, openSheet, toast } from './ui.js';
import { countOf } from './format.js';
import { L } from './i18n.js';
import { pickExercises } from './picker.js';
import { exerciseById, newId, saveRoutines, state } from './store.js';
import { hasOwnName, isNameTaken, moveItem, parseRepRange, putRoutine, routineFromWorkout, routineSetCount } from './routines.js';

const NAME_HINT = L("np. Dzień nóg", "e.g. Leg day");
const DEFAULT_SETS = ['normal', 'normal', 'normal'];
const countSets = (n) => countOf(n, 'seria', 'serie', 'serii', 'set', 'sets');

function nameField(value = '') {
  const input = h('input', { type: 'text', value, placeholder: NAME_HINT, maxLength: 60, autocomplete: 'off' });
  return { input, node: h('label.field', h('span.field-label', L("Nazwa rutyny", "Routine name")), input) };
}

/** Sprawdza nazwę i zwraca ją bez zbędnych spacji albo null po pokazaniu komunikatu. */
function acceptName(input, ownId = null) {
  const name = input.value.trim();
  if (!name) toast(L(`Wpisz nazwę rutyny, ${NAME_HINT}.`, `Enter a routine name, ${NAME_HINT}.`));
  else if (isNameTaken(state.routines, name, ownId)) toast(L("Rutyna o tej nazwie już istnieje.", "A routine with this name already exists."));
  else return name;
  input.focus();
  return null;
}

/** Zapisuje ćwiczenia i serie gotowego treningu jako rutynę o wpisanej nazwie. */
export function saveWorkoutAsRoutine(workout) {
  const name = nameField(hasOwnName(workout) ? workout.name : '');
  openSheet((close) => h('form.sheet-body', {
    novalidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      const accepted = acceptName(name.input);
      if (!accepted) return;
      await saveRoutines(putRoutine(state.routines, routineFromWorkout(workout, { id: newId(), name: accepted })));
      close();
      toast(L(`Zapisano rutynę: ${accepted}.`, `Routine saved: ${accepted}.`));
    },
  },
  h('h2.sheet-title', L("Zapisz jako rutynę", "Save as routine")),
  h('p.sheet-text', L("Rutyna zapamięta ćwiczenia i liczbę serii. Ciężary podpowie ostatni trening.", "The routine remembers the exercises and number of sets. Weights are suggested from your last workout.")),
  name.node,
  h('button.btn.btn-primary.btn-block', { type: 'submit' }, L("Zapisz rutynę", "Save routine")),
  h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L("Anuluj", "Cancel"))), { label: L("Zapisz jako rutynę", "Save as routine") });
}

function routineEditor(initial = null) {
  let items = structuredClone(initial?.exercises ?? []);
  const name = nameField(initial?.name ?? '');
  const title = initial ? L("Edytuj rutynę", "Edit routine") : L("Nowa rutyna", "New routine");
  const list = h('div.routine-items');

  const render = () => {
    list.replaceChildren(...items.map((item, index) => {
      const exerciseName = exerciseById(item.exerciseId)?.name ?? L("Ćwiczenie", "Exercise");
      const change = (apply) => { apply(); render(); };
      // Tekst z pól przeżywa odświeżenie listy, a sprawdzany jest dopiero przy zapisie.
      item.rangeText ??= { min: String(item.repRange?.min ?? ''), max: String(item.repRange?.max ?? '') };
      const rangeInput = (key, label) => h('input.routine-range-input', {
        type: 'text',
        inputMode: 'numeric',
        autocomplete: 'off',
        value: item.rangeText[key],
        placeholder: label,
        'aria-label': L(`Zakres powtórzeń ${label}: ${exerciseName}`, `Rep range ${label}: ${exerciseName}`),
        oninput: (event) => { item.rangeText[key] = event.currentTarget.value; },
      });
      const moveButton = (name, label, delta) => {
        const button = iconButton(name, `${label}: ${exerciseName}`, () => change(() => { items = moveItem(items, index, delta); }));
        button.disabled = moveItem(items, index, delta) === items;
        return button;
      };
      return h('div.routine-item',
        h('div.routine-item-top',
          h('span.routine-item-name', exerciseName),
          iconButton('close', L(`Usuń z rutyny: ${exerciseName}`, `Remove from routine: ${exerciseName}`), () => change(() => items.splice(items.indexOf(item), 1)))),
        h('div.routine-stepper',
          h('button.btn.btn-chip', {
            type: 'button',
            disabled: item.sets.length <= 1,
            'aria-label': L(`Mniej serii: ${exerciseName}`, `Fewer sets: ${exerciseName}`),
            onclick: () => change(() => item.sets.pop()),
          }, '−'),
          h('span.routine-sets', countSets(item.sets.length)),
          h('button.btn.btn-chip', {
            type: 'button',
            'aria-label': L(`Więcej serii: ${exerciseName}`, `More sets: ${exerciseName}`),
            onclick: () => change(() => item.sets.push('normal')),
          }, '+'),
          moveButton('up', L("Przesuń wyżej", "Move up"), -1),
          moveButton('down', L("Przesuń niżej", "Move down"), 1)),
        h('div.routine-range',
          h('span.field-label', L("Powtórzenia", "Reps")),
          rangeInput('min', L('od', 'min')),
          h('span.field-label', '–'),
          rangeInput('max', L('do', 'max'))));
    }));
    if (!items.length) list.append(h('p.muted', L("Dodaj ćwiczenia, które robisz w tej rutynie.", "Add the exercises you do in this routine.")));
  };

  const addExercises = () => pickExercises((ids) => {
    const fresh = ids.filter((id) => !items.some((item) => item.exerciseId === id));
    if (fresh.length < ids.length) toast(L("Ćwiczenia, które już są w rutynie, zostały pominięte.", "Exercises already in the routine were skipped."));
    fresh.forEach((exerciseId) => items.push({ exerciseId, sets: [...DEFAULT_SETS] }));
    render();
  }, { actionLabel: L("Dodaj do rutyny", "Add to routine") });

  render();
  openSheet((close) => h('form.sheet-column', {
    novalidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      const accepted = acceptName(name.input, initial?.id);
      if (!accepted) return;
      if (!items.length) {
        toast(L("Dodaj choć jedno ćwiczenie.", "Add at least one exercise."));
        return;
      }
      const exercises = [];
      for (const item of items) {
        const { valid, repRange } = parseRepRange(item.rangeText?.min, item.rangeText?.max);
        if (!valid) {
          toast(L(`Sprawdź zakres powtórzeń: ${exerciseById(item.exerciseId)?.name ?? 'ćwiczenie'}.`, `Check the rep range: ${exerciseById(item.exerciseId)?.name ?? 'exercise'}.`));
          return;
        }
        exercises.push({ exerciseId: item.exerciseId, sets: item.sets, ...(repRange ? { repRange } : {}) });
      }
      await saveRoutines(putRoutine(state.routines, { id: initial?.id ?? newId(), name: accepted, exercises }));
      close();
      toast(initial ? L("Zapisano zmiany.", "Changes saved.") : L(`Zapisano rutynę: ${accepted}.`, `Routine saved: ${accepted}.`));
    },
  },
  h('div.sheet-head', h('h2.sheet-title', title), iconButton('close', L("Zamknij", "Close"), close)),
  h('div.routine-edit',
    name.node,
    list,
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: addExercises }, icon('plus', 20), L("Dodaj ćwiczenie", "Add exercise"))),
  h('div.sheet-foot',
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L("Anuluj", "Cancel")),
    h('button.btn.btn-primary.btn-block', { type: 'submit' }, L("Zapisz rutynę", "Save routine")))), { full: true, label: title });
}

async function deleteRoutine(routine) {
  const previous = state.routines;
  await saveRoutines(previous.filter((item) => item.id !== routine.id));
  toast(L("Usunięto rutynę.", "Routine deleted."), { actionLabel: L("Cofnij", "Undo"), onAction: () => saveRoutines(previous) });
}

function routineRow(routine, onStart) {
  const names = routine.exercises.map((item) => exerciseById(item.exerciseId)?.name).filter(Boolean).join(', ');
  const meta = `${countOf(routine.exercises.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń', 'exercise', 'exercises')} · ${countSets(routineSetCount(routine))}`;
  return h('div.routine-row',
    h('button.routine-start', { type: 'button', 'aria-label': L(`Rozpocznij: ${routine.name}`, `Start: ${routine.name}`), onclick: () => onStart(routine) },
      h('span.workout-name', routine.name),
      h('span.workout-meta', meta),
      h('span.workout-names', names)),
    iconButton('more', L(`Opcje: ${routine.name}`, `Options: ${routine.name}`), () => actionSheet(routine.name, [
      { label: L("Rozpocznij trening", "Start workout"), onClick: () => onStart(routine) },
      { label: L("Edytuj rutynę", "Edit routine"), onClick: () => routineEditor(routine) },
      { label: L("Usuń rutynę", "Delete routine"), danger: true, onClick: () => deleteRoutine(routine) },
    ])));
}

/** Sekcja na ekranie startowym. onStart rozpoczyna trening z wybranej rutyny. */
export function routinesSection(onStart) {
  return h('section.block',
    h('h2.block-title', L("Rutyny", "Routines")),
    state.routines.length > 0
      ? h('div.rows', state.routines.map((routine) => routineRow(routine, onStart)))
      : h('p.muted', L("Zapisz zestaw ćwiczeń, np. Dzień nóg, i zaczynaj go jednym stuknięciem.", "Save a set of exercises, e.g. Leg day, and start it with one tap.")),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => routineEditor() }, icon('plus', 20), L("Nowa rutyna", "New routine")));
}
