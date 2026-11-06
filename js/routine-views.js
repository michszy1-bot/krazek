// Rutyny na ekranie: lista na starcie, edytor oraz zapis treningu jako rutyny.

import { actionSheet, h, icon, iconButton, openSheet, toast } from './ui.js';
import { countOf } from './format.js';
import { pickExercises } from './picker.js';
import { exerciseById, newId, saveRoutines, state } from './store.js';
import { hasOwnName, isNameTaken, moveItem, putRoutine, routineFromWorkout, routineSetCount } from './routines.js';

const NAME_HINT = 'np. Dzień nóg';
const DEFAULT_SETS = ['normal', 'normal', 'normal'];
const countSets = (n) => countOf(n, 'seria', 'serie', 'serii');

function nameField(value = '') {
  const input = h('input', { type: 'text', value, placeholder: NAME_HINT, maxLength: 60, autocomplete: 'off' });
  return { input, node: h('label.field', h('span.field-label', 'Nazwa rutyny'), input) };
}

/** Sprawdza nazwę i zwraca ją bez zbędnych spacji albo null po pokazaniu komunikatu. */
function acceptName(input, ownId = null) {
  const name = input.value.trim();
  if (!name) toast(`Wpisz nazwę rutyny, ${NAME_HINT}.`);
  else if (isNameTaken(state.routines, name, ownId)) toast('Rutyna o tej nazwie już istnieje.');
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
      toast(`Zapisano rutynę: ${accepted}.`);
    },
  },
  h('h2.sheet-title', 'Zapisz jako rutynę'),
  h('p.sheet-text', 'Rutyna zapamięta ćwiczenia i liczbę serii. Ciężary podpowie ostatni trening.'),
  name.node,
  h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Zapisz rutynę'),
  h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, 'Anuluj')), { label: 'Zapisz jako rutynę' });
}

function routineEditor(initial = null) {
  let items = structuredClone(initial?.exercises ?? []);
  const name = nameField(initial?.name ?? '');
  const title = initial ? 'Edytuj rutynę' : 'Nowa rutyna';
  const list = h('div.routine-items');

  const render = () => {
    list.replaceChildren(...items.map((item, index) => {
      const exerciseName = exerciseById(item.exerciseId)?.name ?? 'Ćwiczenie';
      const change = (apply) => { apply(); render(); };
      const moveButton = (name, label, delta) => {
        const button = iconButton(name, `${label}: ${exerciseName}`, () => change(() => { items = moveItem(items, index, delta); }));
        button.disabled = moveItem(items, index, delta) === items;
        return button;
      };
      return h('div.routine-item',
        h('div.routine-item-top',
          h('span.routine-item-name', exerciseName),
          iconButton('close', `Usuń z rutyny: ${exerciseName}`, () => change(() => items.splice(items.indexOf(item), 1)))),
        h('div.routine-stepper',
          h('button.btn.btn-chip', {
            type: 'button',
            disabled: item.sets.length <= 1,
            'aria-label': `Mniej serii: ${exerciseName}`,
            onclick: () => change(() => item.sets.pop()),
          }, '−'),
          h('span.routine-sets', countSets(item.sets.length)),
          h('button.btn.btn-chip', {
            type: 'button',
            'aria-label': `Więcej serii: ${exerciseName}`,
            onclick: () => change(() => item.sets.push('normal')),
          }, '+'),
          moveButton('up', 'Przesuń wyżej', -1),
          moveButton('down', 'Przesuń niżej', 1)));
    }));
    if (!items.length) list.append(h('p.muted', 'Dodaj ćwiczenia, które robisz w tej rutynie.'));
  };

  const addExercises = () => pickExercises((ids) => {
    const fresh = ids.filter((id) => !items.some((item) => item.exerciseId === id));
    if (fresh.length < ids.length) toast('Ćwiczenia, które już są w rutynie, zostały pominięte.');
    fresh.forEach((exerciseId) => items.push({ exerciseId, sets: [...DEFAULT_SETS] }));
    render();
  }, { actionLabel: 'Dodaj do rutyny' });

  render();
  openSheet((close) => h('form.sheet-column', {
    novalidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      const accepted = acceptName(name.input, initial?.id);
      if (!accepted) return;
      if (!items.length) {
        toast('Dodaj choć jedno ćwiczenie.');
        return;
      }
      await saveRoutines(putRoutine(state.routines, { id: initial?.id ?? newId(), name: accepted, exercises: items }));
      close();
      toast(initial ? 'Zapisano zmiany.' : `Zapisano rutynę: ${accepted}.`);
    },
  },
  h('div.sheet-head', h('h2.sheet-title', title), iconButton('close', 'Zamknij', close)),
  h('div.routine-edit',
    name.node,
    list,
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: addExercises }, icon('plus', 20), 'Dodaj ćwiczenie')),
  h('div.sheet-foot',
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, 'Anuluj'),
    h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Zapisz rutynę'))), { full: true, label: title });
}

async function deleteRoutine(routine) {
  const previous = state.routines;
  await saveRoutines(previous.filter((item) => item.id !== routine.id));
  toast('Usunięto rutynę.', { actionLabel: 'Cofnij', onAction: () => saveRoutines(previous) });
}

function routineRow(routine, onStart) {
  const names = routine.exercises.map((item) => exerciseById(item.exerciseId)?.name).filter(Boolean).join(', ');
  const meta = `${countOf(routine.exercises.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')} · ${countSets(routineSetCount(routine))}`;
  return h('div.routine-row',
    h('button.routine-start', { type: 'button', 'aria-label': `Rozpocznij: ${routine.name}`, onclick: () => onStart(routine) },
      h('span.workout-name', routine.name),
      h('span.workout-meta', meta),
      h('span.workout-names', names)),
    iconButton('more', `Opcje: ${routine.name}`, () => actionSheet(routine.name, [
      { label: 'Rozpocznij trening', onClick: () => onStart(routine) },
      { label: 'Edytuj rutynę', onClick: () => routineEditor(routine) },
      { label: 'Usuń rutynę', danger: true, onClick: () => deleteRoutine(routine) },
    ])));
}

/** Sekcja na ekranie startowym. onStart rozpoczyna trening z wybranej rutyny. */
export function routinesSection(onStart) {
  return h('section.block',
    h('h2.block-title', 'Rutyny'),
    state.routines.length > 0
      ? h('div.rows', state.routines.map((routine) => routineRow(routine, onStart)))
      : h('p.muted', 'Zapisz zestaw ćwiczeń, np. Dzień nóg, i zaczynaj go jednym stuknięciem.'),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => routineEditor() }, icon('plus', 20), 'Nowa rutyna'));
}
