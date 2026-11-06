// Rutyny, czyli zapisane zestawy ćwiczeń: reguły bez zależności od DOM, testowane w Node.
// Rutyna pamięta ćwiczenia i rodzaje serii. Ciężary podpowiada ostatni trening, więc nie starzeją się.

import { isSetKind } from './stats.js';

const GENERIC_NAMES = new Set(['Trening', 'Trening poranny', 'Trening popołudniowy', 'Trening wieczorny']);

/** Automatyczna nazwa treningu nie nadaje się na rutynę, więc formularz jej nie podpowiada. */
export const hasOwnName = (workout) => !GENERIC_NAMES.has(workout.name);

export function routineFromWorkout(workout, { id, name }) {
  return {
    id,
    name,
    exercises: workout.exercises.map((item) => ({
      exerciseId: item.exerciseId,
      sets: item.sets.map((set) => set.kind),
    })),
  };
}

export const routineSetCount = (routine) => routine.exercises.reduce((sum, item) => sum + item.sets.length, 0);

export function putRoutine(list, routine) {
  return list.some((item) => item.id === routine.id)
    ? list.map((item) => (item.id === routine.id ? routine : item))
    : [...list, routine];
}

/** Nowa lista z elementem przesuniętym o `delta` miejsc. Ruch poza listę niczego nie zmienia. */
export function moveItem(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const moved = [...list];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

/** Czy inna rutyna ma już taką nazwę, bez względu na wielkość liter. */
export const isNameTaken = (list, name, ownId = null) =>
  list.some((item) => item.id !== ownId && item.name.toLocaleLowerCase('pl') === name.toLocaleLowerCase('pl'));

/** Rutyny z pliku kopii. Zwraca null, gdy któraś jest niepoprawna lub odwołuje się do nieznanego ćwiczenia. */
export function cleanRoutines(raw, knownExercises) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;
  const clean = [];
  for (const routine of raw) {
    const valid = typeof routine?.id === 'string' && routine.id
      && typeof routine.name === 'string' && routine.name.trim()
      && Array.isArray(routine.exercises) && routine.exercises.length
      && routine.exercises.every((item) => knownExercises.has(item?.exerciseId)
        && Array.isArray(item.sets) && item.sets.length
        && item.sets.every(isSetKind));
    if (!valid) return null;
    clean.push({
      id: routine.id,
      name: routine.name,
      exercises: routine.exercises.map(({ exerciseId, sets }) => ({ exerciseId, sets: [...sets] })),
    });
  }
  return clean;
}
