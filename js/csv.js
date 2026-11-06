// Eksport treningów do arkusza. Średniki, przecinek w liczbach i znacznik BOM to format, który polski Excel otwiera bez importu.

import { toLocalInput } from './format.js';
import { SET_KINDS, setLabels } from './stats.js';

const HEADER = [
  'Data', 'Godzina', 'Trening', 'Ćwiczenie', 'Partia', 'Sprzęt', 'Seria', 'Rodzaj',
  'Ciężar (kg)', 'Powtórzenia', 'Czas (s)', 'Notatka do ćwiczenia', 'Notatka do treningu',
];

function cell(value) {
  if (value == null) return '';
  if (typeof value === 'number') return String(value).replace('.', ',');
  // Arkusz wykonałby tekst zaczynający się od tych znaków jako formułę.
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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
        day, time, workout.name, exercise?.name, exercise?.muscle, exercise?.equipment,
        labels[i], SET_KINDS[set.kind]?.label ?? SET_KINDS.normal.label,
        set.weight, set.reps, set.seconds, item.note || null, workout.note || null,
      ]));
    }
  }
  return `﻿${rows.map((row) => row.map(cell).join(';')).join('\r\n')}\r\n`;
}
