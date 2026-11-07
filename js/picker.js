// Wybór ćwiczeń do treningu oraz formularz własnego ćwiczenia.

import { h, icon, iconButton, openSheet, toast } from './ui.js';
import { EQUIPMENT, equipmentName, MUSCLES, muscleName, TYPES } from './exercises.js';
import { L } from './i18n.js';
import { newId, patchExercise, saveExercise, state, visibleExercises } from './store.js';
import { exerciseThumb } from './demo.js';

const norm = (text) => text.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/ł/g, 'l');

export function matchesSearch(exercise, query) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  // Partia i sprzęt w obu językach, bo własne ćwiczenia mogą mieć polskie nazwy także w wersji angielskiej.
  const haystack = norm(`${exercise.name} ${exercise.muscle} ${exercise.equipment} ${muscleName(exercise.muscle)} ${equipmentName(exercise.equipment)}`);
  return words.every((w) => haystack.includes(w));
}

// Kettlebell został usunięty z bazy, więc nie ma filtra. Własne ćwiczenia z nim są widoczne bez filtra sprzętu.
const EQUIPMENT_FILTERS = EQUIPMENT.filter((name) => name !== 'Kettlebell');

/** Gwiazdka ulubionego ćwiczenia. onChange pozwala liście przesunąć je na górę. */
export function favoriteButton(exercise, onChange) {
  const button = h('button.star-btn', {
    type: 'button',
    title: L('Ulubione', 'Favourite'),
    'aria-label': L(`Ulubione: ${exercise.name}`, `Favourite: ${exercise.name}`),
    'aria-pressed': String(Boolean(exercise.favorite)),
    onclick: async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const next = !state.exercises.get(exercise.id)?.favorite;
      await patchExercise(exercise.id, { favorite: next });
      button.setAttribute('aria-pressed', String(next));
      onChange?.();
    },
  }, icon('star', 22));
  return button;
}

/** Edycja notatki, która zostaje przy ćwiczeniu, np. ustawienia maszyny. */
export function stickyNoteSheet(exercise, onSaved) {
  openSheet((close) => {
    const note = h('textarea', {
      rows: 3,
      maxLength: 200,
      placeholder: L("Np. siedzenie na 4, uchwyt szeroki", "E.g. seat at 4, wide grip"),
      value: state.exercises.get(exercise.id)?.stickyNote ?? '',
    });
    return h('form.sheet-body', {
      novalidate: true,
      onsubmit: async (event) => {
        event.preventDefault();
        await patchExercise(exercise.id, { stickyNote: note.value.trim() });
        close();
        onSaved?.();
      },
    },
    h('h2.sheet-title', L("Stała notatka", "Pinned note")),
    h('p.sheet-text', L(`${exercise.name}. Pokaże się przy każdym treningu z tym ćwiczeniem.`, `${exercise.name}. It shows up in every workout with this exercise.`)),
    h('label.field', h('span.field-label', L("Notatka", "Note")), note, h('span.field-hint', L("Puste pole usuwa notatkę.", "Leave it empty to remove the note."))),
    h('button.btn.btn-primary.btn-block', { type: 'submit' }, L("Zapisz notatkę", "Save note")),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L("Anuluj", "Cancel")));
  }, { label: L("Stała notatka", "Pinned note") });
}

/** Pole wyszukiwania, filtr partii i filtr sprzętu, wspólne dla biblioteki i wyboru ćwiczeń. */
export function exerciseFilter(onChange, { muscle: startMuscle = null } = {}) {
  const filter = { query: '', muscle: startMuscle, equipment: null };
  const input = h('input.search-input', {
    type: 'search',
    placeholder: L("Szukaj ćwiczenia", "Search exercises"),
    'aria-label': L("Szukaj ćwiczenia", "Search exercises"),
    autocomplete: 'off',
    oninput: () => { filter.query = input.value; onChange(filter); },
  });
  const chips = [null, ...MUSCLES].map((muscle) => h('button.chip', {
    type: 'button',
    'aria-pressed': String(muscle === startMuscle),
    onclick: (event) => {
      filter.muscle = muscle;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === event.currentTarget)));
      onChange(filter);
    },
  }, muscle ? muscleName(muscle) : L('Wszystkie', 'All')));
  const equipmentChips = [null, ...EQUIPMENT_FILTERS].map((equipment) => h('button.chip', {
    type: 'button',
    'aria-pressed': String(equipment === null),
    onclick: (event) => {
      filter.equipment = equipment;
      equipmentChips.forEach((c) => c.setAttribute('aria-pressed', String(c === event.currentTarget)));
      onChange(filter);
    },
  }, equipment ? equipmentName(equipment) : L('Każdy sprzęt', 'Any equipment')));
  const node = h('div.filter',
    h('label.search', icon('search', 20), input),
    h('div.chips', { role: 'group', 'aria-label': L('Partia', 'Muscle') }, chips),
    h('div.chips', { role: 'group', 'aria-label': L('Sprzęt', 'Equipment') }, equipmentChips));
  // Filtr ustawiony z góry musi być widoczny, także gdy jego przycisk jest poza ekranem.
  if (startMuscle) {
    requestAnimationFrame(() => chips[MUSCLES.indexOf(startMuscle) + 1]?.scrollIntoView({ block: 'nearest', inline: 'center' }));
  }
  return { node, filter, input };
}

export const applyFilter = (list, filter) =>
  list.filter((e) => (!filter.muscle || e.muscle === filter.muscle)
    && (!filter.equipment || e.equipment === filter.equipment)
    && matchesSearch(e, filter.query));

/** Ostatnio robione ćwiczenia, żeby najczęstszy wybór był od razu pod ręką. */
function recentExercises(limit = 6) {
  const out = [];
  for (const workout of state.workouts) {
    for (const item of workout.exercises) {
      const exercise = state.exercises.get(item.exerciseId);
      if (exercise && !exercise.archived && !out.includes(exercise)) out.push(exercise);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * Wybór ćwiczeń. onPick dostaje identyfikatory w kolejności zaznaczania.
 * Przy single stuknięcie od razu wybiera jedno ćwiczenie, a muscle ustawia filtr partii.
 */
export function pickExercises(onPick, { actionLabel = L('Dodaj do treningu', 'Add to workout'), title = L('Dodaj ćwiczenie', 'Add exercise'), single = false, muscle = null } = {}) {
  let refresh = () => {};
  const selected = [];
  openSheet((close) => {
    const pickOne = (id) => { close(); onPick([id]); };
    const list = h('div.picker-list');
    const addBtn = h('button.btn.btn-primary.btn-block', {
      type: 'button',
      disabled: true,
      onclick: () => { close(); onPick(selected); },
    }, L("Wybierz ćwiczenia", "Choose exercises"));
    const updateButton = () => {
      addBtn.disabled = selected.length === 0;
      addBtn.textContent = selected.length ? `${actionLabel} (${selected.length})` : L("Wybierz ćwiczenia", "Choose exercises");
    };
    const rowFor = (exercise) => h('div.picker-item',
      h('button.picker-row', {
        type: 'button',
        'aria-pressed': String(selected.includes(exercise.id)),
        onclick: (event) => {
          if (single) {
            pickOne(exercise.id);
            return;
          }
          const index = selected.indexOf(exercise.id);
          if (index >= 0) selected.splice(index, 1);
          else selected.push(exercise.id);
          event.currentTarget.setAttribute('aria-pressed', String(index < 0));
          updateButton();
        },
      },
      exerciseThumb(exercise),
      h('span.picker-text', h('span.picker-name', exercise.name), h('span.picker-meta', `${muscleName(exercise.muscle)} · ${equipmentName(exercise.equipment)}`)),
      !single && h('span.picker-mark', icon('check', 18))),
      favoriteButton(exercise, () => refresh()));

    const render = (filter) => {
      const all = applyFilter(visibleExercises(), filter);
      const favorites = all.filter((e) => e.favorite);
      const browsing = !filter.query && !filter.muscle && !filter.equipment;
      const recent = browsing ? recentExercises().filter((e) => !e.favorite) : [];
      const rest = all.filter((e) => !e.favorite);
      list.replaceChildren(
        ...(favorites.length ? [h('h3.list-label', L('Ulubione', 'Favourites')), ...favorites.map(rowFor)] : []),
        ...(recent.length ? [h('h3.list-label', L("Ostatnio", "Recent")), ...recent.map(rowFor)] : []),
        ...((favorites.length || recent.length) && rest.length ? [h('h3.list-label', L('Wszystkie', 'All'))] : []),
        ...rest.map(rowFor),
      );
      if (!all.length) {
        list.append(h('div.empty',
          h('p.empty-title', L("Nie ma takiego ćwiczenia", "No matching exercise")),
          h('button.btn.btn-ghost', {
            type: 'button',
            onclick: () => exerciseForm({ name: filter.query.trim() }, (created) => {
              if (single) {
                pickOne(created.id);
                return;
              }
              selected.push(created.id);
              controls.input.value = '';
              filter.query = '';
              render(filter);
              updateButton();
            }),
          }, L("Dodaj własne ćwiczenie", "Add a custom exercise"))));
      }
    };
    const controls = exerciseFilter(render, { muscle });
    refresh = () => render(controls.filter);
    render(controls.filter);

    return h('div.sheet-column',
      h('div.sheet-head', h('h2.sheet-title', title), iconButton('close', L("Zamknij", "Close"), close)),
      controls.node,
      list,
      h('div.sheet-foot',
        h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => exerciseForm({}, (created) => {
          if (single) {
            pickOne(created.id);
            return;
          }
          selected.push(created.id);
          render(controls.filter);
          updateButton();
        }) }, L("Nowe własne ćwiczenie", "New custom exercise")),
        !single && addBtn));
  }, { full: true, label: title });
}

const selectField = (label, options, value) => {
  const select = h('select', { 'aria-label': label }, options.map(([v, text]) => h('option', { value: v, selected: v === value }, text)));
  return { select, node: h('label.field', h('span.field-label', label), select) };
};

/** Dodawanie lub edycja własnego ćwiczenia. */
export function exerciseForm(initial, onSaved) {
  const isNew = !initial.id;
  openSheet((close) => {
    const name = h('input', { type: 'text', value: initial.name ?? '', maxLength: 80, autocomplete: 'off', required: true });
    const muscle = selectField(L('Partia', 'Muscle'), MUSCLES.map((m) => [m, muscleName(m)]), initial.muscle ?? MUSCLES[0]);
    const equipment = selectField(L('Sprzęt', 'Equipment'), EQUIPMENT.map((e) => [e, equipmentName(e)]), initial.equipment ?? EQUIPMENT[0]);
    const type = selectField(L("Co zapisujesz", "What you log"), TYPES.map((t) => [t.id, t.label]), initial.type ?? 'weight');
    if (!isNew) {
      type.select.disabled = true;
      type.node.append(h('span.field-hint', L("Rodzaju nie da się zmienić, bo zapisane serie mają już swój format.", "The type can’t be changed because saved sets already use it.")));
    }

    const save = async (event) => {
      event.preventDefault();
      const trimmed = name.value.trim();
      if (!trimmed) {
        toast(L("Wpisz nazwę ćwiczenia.", "Enter an exercise name."));
        name.focus();
        return;
      }
      const duplicate = visibleExercises().find((e) => e.id !== initial.id && e.name.toLocaleLowerCase('pl') === trimmed.toLocaleLowerCase('pl'));
      if (duplicate) {
        toast(L("Ćwiczenie o tej nazwie już jest na liście.", "An exercise with this name is already on the list."));
        name.focus();
        return;
      }
      const exercise = {
        ...initial,
        id: initial.id ?? `custom-${newId()}`,
        name: trimmed,
        muscle: muscle.select.value,
        equipment: equipment.select.value,
        type: type.select.value,
        custom: true,
      };
      await saveExercise(exercise);
      close();
      onSaved?.(exercise);
    };

    return h('form.sheet-body', { onsubmit: save, novalidate: true },
      h('h2.sheet-title', isNew ? L("Nowe ćwiczenie", "New exercise") : L("Edytuj ćwiczenie", "Edit exercise")),
      h('label.field', h('span.field-label', L("Nazwa", "Name")), name),
      muscle.node,
      equipment.node,
      type.node,
      h('button.btn.btn-primary.btn-block', { type: 'submit' }, isNew ? L('Dodaj ćwiczenie', 'Add exercise') : L("Zapisz zmiany", "Save changes")),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L("Anuluj", "Cancel")));
  }, { label: isNew ? L("Nowe ćwiczenie", "New exercise") : L("Edytuj ćwiczenie", "Edit exercise") });
}
