// Ekran profilu: wiek, wzrost i dziennik wagi.

import { emptyState, h, openSheet, pageHeader, segmented, toast } from './ui.js';
import { countOf, dayKey, fmtDayMedium, fmtDayShort, fmtNum, fmtUnit, inputValue, parseNum } from './format.js';
import { lineChart } from './chart.js';
import { saveBodyWeights, saveProfile, state } from './store.js';
import { ageOn, dayTime, HEIGHT_MAX, HEIGHT_MIN, isDay, putWeight, removeWeight, roundWeight, WEIGHT_MAX, WEIGHT_MIN, weightChange } from './body.js';

const RANGES = [
  { value: 30, label: '30 dni' },
  { value: 90, label: '3 mies.' },
  { value: 365, label: 'Rok' },
  { value: 0, label: 'Całość' },
];
let weightRange = 90;

const fmtKg = (kg) => fmtUnit(kg, 'kg');
const fmtDay = (day) => fmtDayMedium(dayTime(day));

function fmtChange(change) {
  if (!change) return 'bez zmian';
  return `${change > 0 ? '+' : '−'}${fmtKg(Math.abs(change))}`;
}

function formSheet(title, fields, onSubmit) {
  openSheet((close) => h('form.sheet-body', {
    novalidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      await onSubmit(close);
    },
  },
  h('h2.sheet-title', title),
  fields,
  h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Zapisz'),
  h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, 'Anuluj')), { label: title });
}

const field = (label, input, hint) => h('label.field', h('span.field-label', label), input, hint && h('span.field-hint', hint));

function birthDateForm() {
  const input = h('input', { type: 'date', value: state.profile.birthDate ?? '', max: dayKey(new Date()), autocomplete: 'bday' });
  formSheet('Data urodzenia', field('Data', input, 'Na tej podstawie aplikacja liczy wiek. Puste pole usuwa datę.'), async (close) => {
    const value = input.value || null;
    if (value && (!isDay(value) || value > dayKey(new Date()))) {
      toast('Wybierz datę z przeszłości.');
      return;
    }
    await saveProfile({ birthDate: value });
    close();
  });
}

function heightForm() {
  const input = h('input', { type: 'text', inputMode: 'numeric', value: inputValue(state.profile.heightCm), autocomplete: 'off' });
  formSheet('Wzrost', field('Wzrost w cm', input, 'Puste pole usuwa wzrost.'), async (close) => {
    const text = input.value.trim();
    const value = text ? parseNum(text, { max: HEIGHT_MAX, integer: true }) : null;
    if (text && (value == null || value < HEIGHT_MIN)) {
      toast(`Wpisz wzrost od ${HEIGHT_MIN} do ${HEIGHT_MAX} cm.`);
      input.focus();
      return;
    }
    await saveProfile({ heightCm: value });
    close();
  });
}

const undoTo = (list) => ({ actionLabel: 'Cofnij', onAction: () => saveBodyWeights(list) });

function weightForm(entry = null) {
  const previous = state.bodyWeights;
  const today = dayKey(new Date());
  const kg = h('input', {
    type: 'text',
    inputMode: 'decimal',
    value: inputValue(entry?.kg),
    placeholder: previous[0] ? inputValue(previous[0].kg) : '',
    autocomplete: 'off',
  });
  const day = h('input', { type: 'date', value: entry?.day ?? today, max: today });
  const title = entry ? 'Edytuj wpis' : 'Dodaj wagę';

  openSheet((close) => h('form.sheet-body', {
    novalidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      const value = parseNum(kg.value, { max: WEIGHT_MAX });
      if (value == null || value < WEIGHT_MIN) {
        toast(`Wpisz wagę od ${WEIGHT_MIN} do ${WEIGHT_MAX} kg.`);
        kg.focus();
        return;
      }
      if (!isDay(day.value) || day.value > dayKey(new Date())) {
        toast('Wybierz dzisiejszą lub wcześniejszą datę.');
        day.focus();
        return;
      }
      const replaced = day.value !== entry?.day && previous.some((item) => item.day === day.value);
      await saveBodyWeights(putWeight(previous, { day: day.value, kg: roundWeight(value) }, entry?.day));
      close();
      if (replaced) toast('Zastąpiono wagę z tego dnia.', undoTo(previous));
      else toast('Zapisano wagę.');
    },
  },
  h('h2.sheet-title', title),
  field('Waga w kg', kg),
  field('Dzień', day, 'Na jeden dzień przypada jeden wpis.'),
  h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Zapisz'),
  entry && h('button.btn.btn-text-danger.btn-block', {
    type: 'button',
    onclick: async () => {
      await saveBodyWeights(removeWeight(previous, entry.day));
      close();
      toast('Usunięto wpis.', undoTo(previous));
    },
  }, 'Usuń wpis'),
  h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, 'Anuluj')), { label: title });
}

function weightChart() {
  const host = h('div');
  const draw = () => {
    const from = weightRange ? Date.now() - weightRange * 86400000 : 0;
    const visible = state.bodyWeights.filter((item) => dayTime(item.day) >= from).reverse();
    if (!visible.length) {
      host.replaceChildren(h('p.muted.chart-empty', 'Brak wpisów w tym okresie.'));
      return;
    }
    host.replaceChildren(lineChart({
      points: visible.map((item) => ({ x: dayTime(item.day), y: item.kg, label: fmtDay(item.day), value: fmtKg(item.kg) })),
      formatTick: fmtNum,
      formatEnd: (point) => point.value,
      formatDate: fmtDayShort,
      label: 'Waga w czasie. Wszystkie wpisy są też w historii poniżej.',
    }));
  };
  draw();
  return h('section.block',
    h('div.filters', segmented(RANGES, weightRange, (value) => { weightRange = value; draw(); }, 'Zakres czasu')),
    host);
}

function detailRow(name, meta, value, onclick) {
  return h('button.link-row.wide', { type: 'button', onclick },
    h('span.link-text', h('span.link-name', name), h('span.link-meta', meta)),
    h('span.setting-value', value));
}

export function profileView() {
  const { birthDate, heightCm } = state.profile;
  const weights = state.bodyWeights;
  const latest = weights[0];
  const change = weights.length ? weightChange(weights, 0) : null;
  const addButton = h('button.btn.btn-primary.btn-block', { type: 'button', onclick: () => weightForm() }, 'Dodaj wagę');

  return h('div.page',
    pageHeader('Profil', { back: '#/' }),
    h('section.block',
      h('div.rows',
        detailRow('Wiek', birthDate ? `Urodziny: ${fmtDay(birthDate)}` : 'Dodaj datę urodzenia',
          birthDate ? countOf(ageOn(birthDate), 'rok', 'lata', 'lat') : '–', birthDateForm),
        detailRow('Wzrost', heightCm ? 'Zmień wzrost' : 'Dodaj wzrost', heightCm ? `${fmtNum(heightCm)} cm` : '–', heightForm))),
    latest
      ? h('section.records',
        h('p.record-hero-label', 'Aktualna waga'),
        h('p.record-hero', fmtKg(latest.kg)),
        h('p.record-hero-date', `${fmtDay(latest.day)}${change == null ? '' : ` · ${fmtChange(change)} od ${fmtDayShort(dayTime(weights[1].day))}`}`))
      : emptyState('Dziennik wagi jest pusty', 'Dodaj pierwszy wpis, a po kolejnych zobaczysz tu wykres.'),
    addButton,
    weights.length > 1 && weightChart(),
    latest && h('section.block',
      h('h2.block-title', 'Historia'),
      h('div.rows', weights.map((item, index) => {
        const itemChange = weightChange(weights, index);
        return detailRow(fmtDay(item.day), itemChange == null ? 'Pierwszy wpis' : fmtChange(itemChange), fmtKg(item.kg), () => weightForm(item));
      }))));
}
