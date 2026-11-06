// Wybór ćwiczeń do treningu oraz formularz własnego ćwiczenia.

import { h, icon, iconButton, openSheet, toast } from './ui.js';
import { EQUIPMENT, MUSCLES, TYPES } from './exercises.js';
import { newId, patchExercise, saveExercise, state, visibleExercises } from './store.js';
import { exerciseThumb } from './demo.js';

const norm = (text) => text.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/ł/g, 'l');

export function matchesSearch(exercise, query) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const haystack = norm(`${exercise.name} ${exercise.muscle} ${exercise.equipment}`);
  return words.every((w) => haystack.includes(w));
}

// Kettlebell został usunięty z bazy, więc nie ma filtra. Własne ćwiczenia z nim są widoczne bez filtra sprzętu.
const EQUIPMENT_FILTERS = EQUIPMENT.filter((name) => name !== 'Kettlebell');

/** Gwiazdka ulubionego ćwiczenia. onChange pozwala liście przesunąć je na górę. */
export function favoriteButton(exercise, onChange) {
  const button = h('button.star-btn', {
    type: 'button',
    title: 'Ulubione',
    'aria-label': `Ulubione: ${exercise.name}`,
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
      placeholder: 'Np. siedzenie na 4, uchwyt szeroki',
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
    h('h2.sheet-title', 'Stała notatka'),
    h('p.sheet-text', `${exercise.name}. Pokaże się przy każdym treningu z tym ćwiczeniem.`),
    h('label.field', h('span.field-label', 'Notatka'), note, h('span.field-hint', 'Puste pole usuwa notatkę.')),
    h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Zapisz notatkę'),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, 'Anuluj'));
  }, { label: 'Stała notatka' });
}

/** Pole wyszukiwania, filtr partii i filtr sprzętu, wspólne dla biblioteki i wyboru ćwiczeń. */
export function exerciseFilter(onChange) {
  const filter = { query: '', muscle: null, equipment: null };
  const input = h('input.search-input', {
    type: 'search',
    placeholder: 'Szukaj ćwiczenia',
    'aria-label': 'Szukaj ćwiczenia',
    autocomplete: 'off',
    oninput: () => { filter.query = input.value; onChange(filter); },
  });
  const chips = [null, ...MUSCLES].map((muscle) => h('button.chip', {
    type: 'button',
    'aria-pressed': String(muscle === null),
    onclick: (event) => {
      filter.muscle = muscle;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === event.currentTarget)));
      onChange(filter);
    },
  }, muscle ?? 'Wszystkie'));
  const equipmentChips = [null, ...EQUIPMENT_FILTERS].map((equipment) => h('button.chip', {
    type: 'button',
    'aria-pressed': String(equipment === null),
    onclick: (event) => {
      filter.equipment = equipment;
      equipmentChips.forEach((c) => c.setAttribute('aria-pressed', String(c === event.currentTarget)));
      onChange(filter);
    },
  }, equipment ?? 'Każdy sprzęt'));
  const node = h('div.filter',
    h('label.search', icon('search', 20), input),
    h('div.chips', { role: 'group', 'aria-label': 'Partia' }, chips),
    h('div.chips', { role: 'group', 'aria-label': 'Sprzęt' }, equipmentChips));
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

/** Wielokrotny wybór ćwiczeń. onPick dostaje identyfikatory w kolejności zaznaczania. */
export function pickExercises(onPick, { actionLabel = 'Dodaj do treningu' } = {}) {
  let refresh = () => {};
  const selected = [];
  openSheet((close) => {
    const list = h('div.picker-list');
    const addBtn = h('button.btn.btn-primary.btn-block', {
      type: 'button',
      disabled: true,
      onclick: () => { close(); onPick(selected); },
    }, 'Wybierz ćwiczenia');
    const updateButton = () => {
      addBtn.disabled = selected.length === 0;
      addBtn.textContent = selected.length ? `${actionLabel} (${selected.length})` : 'Wybierz ćwiczenia';
    };
    const rowFor = (exercise) => h('div.picker-item',
      h('button.picker-row', {
        type: 'button',
        'aria-pressed': String(selected.includes(exercise.id)),
        onclick: (event) => {
          const index = selected.indexOf(exercise.id);
          if (index >= 0) selected.splice(index, 1);
          else selected.push(exercise.id);
          event.currentTarget.setAttribute('aria-pressed', String(index < 0));
          updateButton();
        },
      },
      exerciseThumb(exercise),
      h('span.picker-text', h('span.picker-name', exercise.name), h('span.picker-meta', `${exercise.muscle} · ${exercise.equipment}`)),
      h('span.picker-mark', icon('check', 18))),
      favoriteButton(exercise, () => refresh()));

    const render = (filter) => {
      const all = applyFilter(visibleExercises(), filter);
      const favorites = all.filter((e) => e.favorite);
      const browsing = !filter.query && !filter.muscle && !filter.equipment;
      const recent = browsing ? recentExercises().filter((e) => !e.favorite) : [];
      const rest = all.filter((e) => !e.favorite);
      list.replaceChildren(
        ...(favorites.length ? [h('h3.list-label', 'Ulubione'), ...favorites.map(rowFor)] : []),
        ...(recent.length ? [h('h3.list-label', 'Ostatnio'), ...recent.map(rowFor)] : []),
        ...((favorites.length || recent.length) && rest.length ? [h('h3.list-label', 'Wszystkie')] : []),
        ...rest.map(rowFor),
      );
      if (!all.length) {
        list.append(h('div.empty',
          h('p.empty-title', 'Nie ma takiego ćwiczenia'),
          h('button.btn.btn-ghost', {
            type: 'button',
            onclick: () => exerciseForm({ name: filter.query.trim() }, (created) => {
              selected.push(created.id);
              controls.input.value = '';
              filter.query = '';
              render(filter);
              updateButton();
            }),
          }, 'Dodaj własne ćwiczenie')));
      }
    };
    const controls = exerciseFilter(render);
    refresh = () => render(controls.filter);
    render(controls.filter);

    return h('div.sheet-column',
      h('div.sheet-head', h('h2.sheet-title', 'Dodaj ćwiczenie'), iconButton('close', 'Zamknij', close)),
      controls.node,
      list,
      h('div.sheet-foot',
        h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: () => exerciseForm({}, (created) => {
          selected.push(created.id);
          render(controls.filter);
          updateButton();
        }) }, 'Nowe własne ćwiczenie'),
        addBtn));
  }, { full: true, label: 'Dodaj ćwiczenie' });
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
    const muscle = selectField('Partia', MUSCLES.map((m) => [m, m]), initial.muscle ?? MUSCLES[0]);
    const equipment = selectField('Sprzęt', EQUIPMENT.map((e) => [e, e]), initial.equipment ?? EQUIPMENT[0]);
    const type = selectField('Co zapisujesz', TYPES.map((t) => [t.id, t.label]), initial.type ?? 'weight');
    if (!isNew) {
      type.select.disabled = true;
      type.node.append(h('span.field-hint', 'Rodzaju nie da się zmienić, bo zapisane serie mają już swój format.'));
    }

    const save = async (event) => {
      event.preventDefault();
      const trimmed = name.value.trim();
      if (!trimmed) {
        toast('Wpisz nazwę ćwiczenia.');
        name.focus();
        return;
      }
      const duplicate = visibleExercises().find((e) => e.id !== initial.id && e.name.toLocaleLowerCase('pl') === trimmed.toLocaleLowerCase('pl'));
      if (duplicate) {
        toast('Ćwiczenie o tej nazwie już jest na liście.');
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
      h('h2.sheet-title', isNew ? 'Nowe ćwiczenie' : 'Edytuj ćwiczenie'),
      h('label.field', h('span.field-label', 'Nazwa'), name),
      muscle.node,
      equipment.node,
      type.node,
      h('button.btn.btn-primary.btn-block', { type: 'submit' }, isNew ? 'Dodaj ćwiczenie' : 'Zapisz zmiany'),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, 'Anuluj'));
  }, { label: isNew ? 'Nowe ćwiczenie' : 'Edytuj ćwiczenie' });
}
