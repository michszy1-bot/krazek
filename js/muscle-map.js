// Mapa mięśni: sylwetka z przodu i z tyłu. Kształty i ich licencja są w muscle-shapes.js.

import { h } from './ui.js';
import { fmtNum, plural } from './format.js';
import { BODY_BACK, BODY_FRONT } from './muscle-shapes.js';
import { STRENGTH_BANDS, strengthColour } from './level.js';
import { MUSCLE_SCALES, muscleLevel } from './stats.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// Kadr obejmuje całą sylwetkę razem z dłońmi. Tył leży na tym samym płótnie, 720 jednostek w prawo.
const VIEW_FRONT = '39 116 650 1236';
const VIEW_BACK = '759 116 650 1236';
const INFO_HINT = 'Stuknij partię, żeby zobaczyć liczbę serii.';

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

const setsText = (sets) => `${fmtNum(sets)} ${plural(sets, 'seria', 'serie', 'serii')}`;

/** rows: [{ muscle, sets }] z okresu pokazywanego na mapie. */
export function muscleMap(rows) {
  const setsOf = new Map(rows.map((row) => [row.muscle, row.sets]));
  const trained = rows.filter((row) => row.muscle !== 'Całe ciało');
  return drawMap({
    colourOf: (muscle) => muscleLevel(setsOf.get(muscle) ?? 0, muscle),
    infoOf: (muscle) => `${muscle}: ${setsText(setsOf.get(muscle) ?? 0)}`,
    hint: INFO_HINT,
    summary: trained.length
      ? `Mapa mięśni. Serie na partię: ${trained.map((row) => `${row.muscle} ${row.sets}`).join(', ')}.`
      : 'Mapa mięśni. W tym okresie nie ma zapisanych serii.',
    legend: h('div.muscle-legend',
      h('p.muscle-legend-title', 'Serie na partię'),
      MUSCLE_SCALES.map(({ name, levels }) => h('ul.muscle-legend-row', { 'aria-label': `${name}, liczba serii` },
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
      return row?.level == null ? `${muscle}: brak wyniku` : `${muscle}: poziom ${row.level}, ${Math.round(row.ratio * 100)}% masy ciała`;
    },
    hint: 'Stuknij partię, żeby zobaczyć jej poziom.',
    summary: known.length
      ? `Mapa mięśni. Poziomy siły: ${known.map((row) => `${row.muscle} ${row.level}`).join(', ')}.`
      : 'Mapa mięśni. Nie ma jeszcze poziomów siły.',
    legend: h('div.muscle-legend',
      h('p.muscle-legend-title', 'Poziom siły'),
      h('ul.muscle-legend-row.muscle-legend-plain', { 'aria-label': 'Poziom siły' },
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
  }, figure(BODY_FRONT, VIEW_FRONT, 'Przód'), figure(BODY_BACK, VIEW_BACK, 'Tył'));

  return h('div.muscle-map', figures, info, legend);
}
