// Eksport treningów do arkusza. Po polsku średniki i przecinek w liczbach, bo tak polski Excel otwiera plik bez importu.
// Po angielsku przecinki i kropka. Znacznik BOM w obu, żeby polskie litery się nie rozsypały.

import { toLocalInput } from './format.js';
import { isEnglish, L } from './i18n.js';
import { equipmentName, muscleName } from './exercises.js';
import { SET_KINDS, setLabels } from './stats.js';

const HEADER = isEnglish()
  ? ['Date', 'Time', 'Workout', 'Exercise', 'Muscle', 'Equipment', 'Set', 'Type', 'Weight (kg)', 'Reps', 'Time (s)', 'RPE', 'Exercise note', 'Workout note']
  : ['Data', 'Godzina', 'Trening', 'Ćwiczenie', 'Partia', 'Sprzęt', 'Seria', 'Rodzaj', 'Ciężar (kg)', 'Powtórzenia', 'Czas (s)', 'RPE', 'Notatka do ćwiczenia', 'Notatka do treningu'];
const SEPARATOR = L(';', ',');

function cell(value) {
  if (value == null) return '';
  if (typeof value === 'number') return isEnglish() ? String(value) : String(value).replace('.', ',');
  // Arkusz wykonałby tekst zaczynający się od tych znaków jako formułę.
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;,"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Jeden wiersz na serię, od najstarszego treningu. */
export function workoutsCsv(workouts, exerciseById) {
  const rows = [HEADER];
  for (const workout of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    const [day, time] = toLocalInput(workout.startedAt).split('T');
    for (const item of workout.exercises) {
      const exercise = exerciseById(item.exerciseId);
      const labels = setLabels(item.sets);
      item.sets.forEach((set, i) => rows.push([
        day, time, workout.name, exercise?.name, exercise && muscleName(exercise.muscle), exercise && equipmentName(exercise.equipment),
        labels[i], SET_KINDS[set.kind]?.label ?? SET_KINDS.normal.label,
        set.weight, set.reps, set.seconds, set.rpe, item.note || null, workout.note || null,
      ]));
    }
  }
  return `﻿${rows.map((row) => row.map(cell).join(SEPARATOR)).join('\r\n')}\r\n`;
}
