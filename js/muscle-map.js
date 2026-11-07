// Mapa mięśni: sylwetka z przodu i z tyłu. Kształty i ich licencja są w muscle-shapes.js.

import { h } from './ui.js';
import { L } from './i18n.js';
import { muscleName } from './exercises.js';
import { fmtNum, plural } from './format.js';
import { BODY_BACK, BODY_FRONT } from './muscle-shapes.js';
import { STRENGTH_BANDS, strengthCategory, strengthColour } from './level.js';
import { MUSCLE_SCALES, muscleLevel } from './stats.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// Kadr obejmuje całą sylwetkę razem z dłońmi. Tył leży na tym samym płótnie, 720 jednostek w prawo.
const VIEW_FRONT = '39 116 650 1236';
const VIEW_BACK = '759 116 650 1236';
const INFO_HINT = L('Stuknij partię, żeby zobaczyć liczbę serii.', 'Tap a muscle to see its sets.');

/**
 * Kształty przypisane do partii z aplikacji. Reszta, np. głowa, kolana i przywodziciele, zostaje szara,
 * bo aplikacja nie liczy dla nich osobnych serii.
 */
export const SHAPE_TO_MUSCLE = {
  chest: 'Klatka',
  abs: 'Brzuch',
  obliques: 'Brzuch',
  biceps: 'Biceps',
  triceps: 'Triceps',
  deltoids: 'Barki',
  trapezius: 'Plecy',
  'upper-back': 'Plecy',
  'lower-back': 'Plecy',
  forearm: 'Przedramiona',
  quadriceps: 'Czworogłowe',
  hamstring: 'Dwugłowe uda',
  gluteal: 'Pośladki',
  calves: 'Łydki',
  tibialis: 'Łydki',
};

const setsText = (sets) => `${fmtNum(sets)} ${plural(sets, 'seria', 'serie', 'serii', 'set', 'sets')}`;

/** rows: [{ muscle, sets }] z okresu pokazywanego na mapie. */
export function muscleMap(rows) {
  const setsOf = new Map(rows.map((row) => [row.muscle, row.sets]));
  const trained = rows.filter((row) => row.muscle !== 'Całe ciało');
  return drawMap({
    colourOf: (muscle) => muscleLevel(setsOf.get(muscle) ?? 0, muscle),
    infoOf: (muscle) => `${muscleName(muscle)}: ${setsText(setsOf.get(muscle) ?? 0)}`,
    hint: INFO_HINT,
    summary: trained.length
      ? L(`Mapa mięśni. Serie na partię: ${trained.map((row) => `${row.muscle} ${row.sets}`).join(', ')}.`, `Muscle map. Sets per muscle: ${trained.map((row) => `${muscleName(row.muscle)} ${row.sets}`).join(', ')}.`)
      : L('Mapa mięśni. W tym okresie nie ma zapisanych serii.', 'Muscle map. No sets logged in this period.'),
    legend: h('div.muscle-legend',
      h('p.muscle-legend-title', L('Serie na partię', 'Sets per muscle')),
      MUSCLE_SCALES.map(({ name, levels }) => h('ul.muscle-legend-row', { 'aria-label': L(`${name}, liczba serii`, `${name}, number of sets`) },
        h('li.muscle-legend-name', name),
        levels.map(({ level, label }) => h('li', h(`span.muscle-swatch.muscle-${level}`), label))))),
  });
}

/** rows: [{ muscle, level, ratio }] z poziomami siły. Partia bez wyniku zostaje szara. */
export function strengthMap(rows) {
  const rowOf = new Map(rows.map((row) => [row.muscle, row]));
  const known = rows.filter((row) => row.level != null);
  return drawMap({
    colourOf: (muscle) => strengthColour(rowOf.get(muscle)?.level),
    infoOf: (muscle) => {
      const row = rowOf.get(muscle);
      return row?.level == null
        ? L(`${muscle}: brak wyniku`, `${muscleName(muscle)}: no result`)
        : L(`${muscle}: poziom ${row.level}, ${strengthCategory(row.level).toLowerCase()}`, `${muscleName(muscle)}: level ${row.level}, ${strengthCategory(row.level).toLowerCase()}`);
    },
    hint: L('Stuknij partię, żeby zobaczyć jej poziom.', 'Tap a muscle to see its level.'),
    summary: known.length
      ? L(`Mapa mięśni. Poziomy siły: ${known.map((row) => `${row.muscle} ${row.level}`).join(', ')}.`, `Muscle map. Strength levels: ${known.map((row) => `${muscleName(row.muscle)} ${row.level}`).join(', ')}.`)
      : L('Mapa mięśni. Nie ma jeszcze poziomów siły.', 'Muscle map. No strength levels yet.'),
    legend: h('div.muscle-legend',
      h('p.muscle-legend-title', L('Poziom siły', 'Strength level')),
      h('ul.muscle-legend-row.muscle-legend-plain', { 'aria-label': L('Poziom siły', 'Strength level') },
        STRENGTH_BANDS.map(({ colour, label }) => h('li', h(`span.muscle-swatch.muscle-${colour}`), label)))),
  });
}

function drawMap({ colourOf, infoOf, hint, summary, legend }) {
  const info = h('p.muscle-info', { role: 'status' }, hint);

  const drawing = (shapes, viewBox) => {
    const root = document.createElementNS(SVG_NS, 'svg');
    root.setAttribute('viewBox', viewBox);
    root.setAttribute('class', 'muscle-svg');
    root.setAttribute('aria-hidden', 'true');
    for (const [shape, paths] of Object.entries(shapes)) {
      const muscle = SHAPE_TO_MUSCLE[shape];
      for (const d of paths) {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', muscle ? `muscle muscle-${colourOf(muscle)}` : 'muscle-body');
        if (muscle) path.dataset.muscle = muscle;
        root.append(path);
      }
    }
    return root;
  };

  const figure = (shapes, viewBox, caption) => h('figure.muscle-figure', drawing(shapes, viewBox), h('figcaption', caption));

  // Dotyk i najechanie myszą obsługuje jeden nasłuch na całej mapie, bo kształtów jest ponad sto.
  const showMuscle = (event) => {
    const muscle = event.target.dataset?.muscle;
    if (muscle) info.textContent = infoOf(muscle);
  };
  const figures = h('div.muscle-figures', {
    role: 'img',
    'aria-label': summary,
    onpointerdown: showMuscle,
    onpointerover: showMuscle,
  }, figure(BODY_FRONT, VIEW_FRONT, L('Przód', 'Front')), figure(BODY_BACK, VIEW_BACK, L('Tył', 'Back')));

  return h('div.muscle-map', figures, info, legend);
}
