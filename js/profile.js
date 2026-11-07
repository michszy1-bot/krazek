// Ekran profilu: poziomy, mapa siły, wiek, wzrost i dziennik wagi.

import { emptyState, h, openSheet, pageHeader, segmented, toast } from './ui.js';
import { countOf, dayKey, fmtDayMedium, fmtDayShort, fmtNum, fmtUnit, inputValue, parseNum } from './format.js';
import { lineChart } from './chart.js';
import { L } from './i18n.js';
import { saveBodyWeights, saveProfile, state } from './store.js';
import { ageOn, dayTime, HEIGHT_MAX, HEIGHT_MIN, isDay, putWeight, removeWeight, roundWeight, WEIGHT_MAX, WEIGHT_MIN, weightChange } from './body.js';
import { levelSections, pointsSection } from './level-views.js';

const RANGES = [
  { value: 30, label: L('30 dni', '30 days') },
  { value: 90, label: L('3 mies.', '3 mo') },
  { value: 365, label: L('Rok', 'Year') },
  { value: 0, label: L('Całość', 'All') },
];
let weightRange = 90;

const fmtKg = (kg) => fmtUnit(kg, 'kg');
const fmtDay = (day) => fmtDayMedium(dayTime(day));

function fmtChange(change) {
  if (!change) return L("bez zmian", "no change");
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
  h('button.btn.btn-primary.btn-block', { type: 'submit' }, L("Zapisz", "Save")),
  h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L("Anuluj", "Cancel"))), { label: title });
}

const field = (label, input, hint) => h('label.field', h('span.field-label', label), input, hint && h('span.field-hint', hint));

function birthDateForm() {
  const input = h('input', { type: 'date', value: state.profile.birthDate ?? '', max: dayKey(new Date()), autocomplete: 'bday' });
  formSheet(L("Data urodzenia", "Date of birth"), field(L('Data', 'Date'), input, L("Na tej podstawie aplikacja liczy wiek. Puste pole usuwa datę.", "Used to work out your age. Leave it empty to remove the date.")), async (close) => {
    const value = input.value || null;
    if (value && (!isDay(value) || value > dayKey(new Date()))) {
      toast(L("Wybierz datę z przeszłości.", "Choose a date in the past."));
      return;
    }
    await saveProfile({ birthDate: value });
    close();
  });
}

function heightForm() {
  const input = h('input', { type: 'text', inputMode: 'numeric', value: inputValue(state.profile.heightCm), autocomplete: 'off' });
  formSheet(L('Wzrost', 'Height'), field(L('Wzrost w cm', 'Height in cm'), input, L('Puste pole usuwa wzrost.', 'Leave it empty to remove your height.')), async (close) => {
    const text = input.value.trim();
    const value = text ? parseNum(text, { max: HEIGHT_MAX, integer: true }) : null;
    if (text && (value == null || value < HEIGHT_MIN)) {
      toast(L(`Wpisz wzrost od ${HEIGHT_MIN} do ${HEIGHT_MAX} cm.`, `Enter a height from ${HEIGHT_MIN} to ${HEIGHT_MAX} cm.`));
      input.focus();
      return;
    }
    await saveProfile({ heightCm: value });
    close();
  });
}

const undoTo = (list) => ({ actionLabel: L("Cofnij", "Undo"), onAction: () => saveBodyWeights(list) });

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
  const title = entry ? L('Edytuj wpis', 'Edit entry') : L('Dodaj wagę', 'Add weight');

  openSheet((close) => h('form.sheet-body', {
    novalidate: true,
    onsubmit: async (event) => {
      event.preventDefault();
      const value = parseNum(kg.value, { max: WEIGHT_MAX });
      if (value == null || value < WEIGHT_MIN) {
        toast(L(`Wpisz wagę od ${WEIGHT_MIN} do ${WEIGHT_MAX} kg.`, `Enter a weight from ${WEIGHT_MIN} to ${WEIGHT_MAX} kg.`));
        kg.focus();
        return;
      }
      if (!isDay(day.value) || day.value > dayKey(new Date())) {
        toast(L("Wybierz dzisiejszą lub wcześniejszą datę.", "Choose today or an earlier date."));
        day.focus();
        return;
      }
      const replaced = day.value !== entry?.day && previous.some((item) => item.day === day.value);
      await saveBodyWeights(putWeight(previous, { day: day.value, kg: roundWeight(value) }, entry?.day));
      close();
      if (replaced) toast(L("Zastąpiono wagę z tego dnia.", "Replaced the weight for that day."), undoTo(previous));
      else toast(L("Zapisano wagę.", "Weight saved."));
    },
  },
  h('h2.sheet-title', title),
  field(L("Waga w kg", "Weight in kg"), kg),
  field(L('Dzień', 'Day'), day, L('Na jeden dzień przypada jeden wpis.', 'One entry per day.')),
  h('button.btn.btn-primary.btn-block', { type: 'submit' }, L("Zapisz", "Save")),
  entry && h('button.btn.btn-text-danger.btn-block', {
    type: 'button',
    onclick: async () => {
      await saveBodyWeights(removeWeight(previous, entry.day));
      close();
      toast(L("Usunięto wpis.", "Entry deleted."), undoTo(previous));
    },
  }, L("Usuń wpis", "Delete entry")),
  h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L("Anuluj", "Cancel"))), { label: title });
}

/** Wpisy wagi od najstarszego, od podanego momentu. */
export const weightsFrom = (from) => state.bodyWeights.filter((item) => dayTime(item.day) >= from).reverse();

/** Wykres wagi ciała, używany w profilu i obok wyników ćwiczeń. */
export function bodyWeightChart(entries, { xDomain = null, height = 220 } = {}) {
  return lineChart({
    points: entries.map((item) => ({ x: dayTime(item.day), y: item.kg, label: fmtDay(item.day), value: fmtKg(item.kg) })),
    formatTick: fmtNum,
    formatEnd: (point) => point.value,
    formatDate: fmtDayShort,
    label: L("Waga ciała w czasie. Wszystkie wpisy są w historii w profilu.", "Body weight over time. All entries are in the history in Profile."),
    xDomain,
    height,
  });
}

function weightChart() {
  const host = h('div');
  const draw = () => {
    const visible = weightsFrom(weightRange ? Date.now() - weightRange * 86400000 : 0);
    if (!visible.length) {
      host.replaceChildren(h('p.muted.chart-empty', L("Brak wpisów w tym okresie.", "No entries in this period.")));
      return;
    }
    host.replaceChildren(bodyWeightChart(visible));
  };
  draw();
  return h('section.block',
    h('div.filters', segmented(RANGES, weightRange, (value) => { weightRange = value; draw(); }, L("Zakres czasu", "Time range"))),
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
  const addButton = h('button.btn.btn-primary.btn-block', { type: 'button', onclick: () => weightForm() }, L('Dodaj wagę', 'Add weight'));

  return h('div.page',
    pageHeader(L('Profil', 'Profile'), { back: '#/' }),
    levelSections(() => weightForm()),
    h('section.block',
      h('div.rows',
        detailRow(L('Wiek', 'Age'), birthDate ? L(`Urodziny: ${fmtDay(birthDate)}`, `Birthday: ${fmtDay(birthDate)}`) : L('Dodaj datę urodzenia', 'Add date of birth'),
          birthDate ? countOf(ageOn(birthDate), 'rok', 'lata', 'lat', 'year', 'years') : '–', birthDateForm),
        detailRow(L('Wzrost', 'Height'), heightCm ? L('Zmień wzrost', 'Change height') : L('Dodaj wzrost', 'Add height'), heightCm ? `${fmtNum(heightCm)} cm` : '–', heightForm))),
    latest
      ? h('section.records',
        h('p.record-hero-label', L("Aktualna waga", "Current weight")),
        h('p.record-hero', fmtKg(latest.kg)),
        h('p.record-hero-date', `${fmtDay(latest.day)}${change == null ? '' : L(` · ${fmtChange(change)} od ${fmtDayShort(dayTime(weights[1].day))}`, ` · ${fmtChange(change)} since ${fmtDayShort(dayTime(weights[1].day))}`)}`))
      : emptyState(L('Dziennik wagi jest pusty', 'Your weight log is empty'), L('Dodaj pierwszy wpis, a po kolejnych zobaczysz tu wykres.', 'Add your first entry. After a few more you’ll see a chart here.')),
    addButton,
    weights.length > 1 && weightChart(),
    latest && h('section.block',
      h('h2.block-title', L('Historia', 'History')),
      h('div.rows', weights.map((item, index) => {
        const itemChange = weightChange(weights, index);
        return detailRow(fmtDay(item.day), itemChange == null ? L("Pierwszy wpis", "First entry") : fmtChange(itemChange), fmtKg(item.kg), () => weightForm(item));
      }))),
    pointsSection());
}
