// Odznaki osiągnięć jako metalowe medale. Kształt mówi o grupie, metal o nagrodzie, a znak i napis o samym osiągnięciu.

import { rewardTier } from './achievements.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = 50;

const corner = (angle, radius) => `${(CENTER + radius * Math.cos(angle)).toFixed(2)} ${(CENTER + radius * Math.sin(angle)).toFixed(2)}`;
const outline = (points) => `M${points.join('L')}Z`;

function polygon(sides, radius, turn = -Math.PI / 2) {
  return outline(Array.from({ length: sides }, (_, i) => corner(turn + (i * 2 * Math.PI) / sides, radius)));
}

function burst(points, outer, inner) {
  return outline(Array.from({ length: points * 2 }, (_, i) => corner(-Math.PI / 2 + (i * Math.PI) / points, i % 2 ? inner : outer)));
}

const SHAPES = {
  Treningi: 'M50 4a46 46 0 1 1 0 92 46 46 0 0 1 0-92z',
  'Seria tygodni': 'M50 4 12 16v32c0 22 16 37 38 48 22-11 38-26 38-48V16z',
  'Łączny tonaż': polygon(6, 46),
  Rekordy: burst(14, 47, 41),
  Siła: polygon(8, 46, Math.PI / 8),
  'Siła względem wagi': polygon(5, 48),
  'Trzy boje': polygon(7, 46),
  'Krążki i mapa': 'M22 6h56a16 16 0 0 1 16 16v56a16 16 0 0 1-16 16H22A16 16 0 0 1 6 78V22A16 16 0 0 1 22 6z',
  'Jeden trening': polygon(10, 46),
  Wytrwałość: polygon(6, 46, 0),
  Okazje: burst(18, 47, 43),
};

/** Metal zależy od nagrody: brąz, srebro, złoto, a najwyższe nagrody to złoty rant na ciemnej tarczy. */
const METALS = {
  green: { name: 'bronze', rim: ['#f8cfae', '#b9713f', '#6a3a1b'], face: ['#fde8d6', '#e0a97e', '#b4733f'], ink: '#57290f', enamel: '#d9621c', line: '#f9dcc4' },
  yellow: { name: 'silver', rim: ['#ffffff', '#9ca8b6', '#525d6b'], face: ['#ffffff', '#d8dee6', '#9fa9b6'], ink: '#0e2a5e', enamel: '#1f6fe0', line: '#ffffff' },
  blue: { name: 'gold', rim: ['#fff4b5', '#d9a520', '#86600a'], face: ['#fff8d0', '#efca52', '#c8951c'], ink: '#5a3107', enamel: '#d63a1c', line: '#ffeaa3' },
  red: { name: 'champion', rim: ['#fff4b5', '#e0ab22', '#7f5a08'], face: ['#5a1a12', '#2e0d0a', '#170606'], ink: '#ffd86e', enamel: '#e5392c', line: '#ffcf5e' },
};

const GLYPHS = {
  barbell: 'M6 28h5v-9h6v9h30v-9h6v9h5v8h-5v9h-6v-9H17v9h-6v-9H6z',
  dumbbell: 'M12 27h5v-10h8v10h14v-10h8v10h5v10h-5v10h-8V37H25v10h-8V37h-5z',
  plate: 'M32 10a22 22 0 1 1 0 44 22 22 0 0 1 0-44zm0 8a14 14 0 1 0 0 28 14 14 0 0 0 0-28zm0 9a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  flex: 'M32 8a6.500 6.500 0 1 1 0 13 6.500 6.500 0 0 1 0-13zM11 13l6-2 8 13h14l8-13 6 2-11 20v25h-7V41h-2v17h-7V33z',
  lifter: 'M4 9h7V3h5v6h32V3h5v6h7v5h-7v6h-5v-6H16v6h-5v-6H4zM32 19a5.500 5.500 0 1 1 0 11 5.500 5.500 0 0 1 0-11zM19 14h5l5 18h6l5-18h5l-6 25v21h-6V44h-2v16h-6V39z',
  bench: 'M6 9h6V3h5v6h30V3h5v6h6v5h-6v6h-5v-6H17v6h-5v-6H6zM10 38h44v6H10zM17 44h6v14h-6zM41 44h6v14h-6zM28 19h8v19h-8z',
  person: 'M32 8a7.500 7.500 0 1 1 0 15 7.500 7.500 0 0 1 0-15zM16 58V40c0-8 7-14 16-14s16 6 16 14v18H40V42h-3v16H27V42h-3v16z',
  flame: 'M34 4c2 12 16 18 16 34a18 18 0 0 1-36 0c0-10 6-14 8-22 3 3 4 6 4 10 5-6 9-13 8-22zm-2 30c-1 5-7 8-7 15a7 7 0 0 0 14 0c0-7-6-10-7-15z',
  stack: 'M8 46h48v10H8zM13 33h38v10H13zM19 20h26v10H19zM26 8h12v9H26z',
  trophy: 'M18 6h28v6h12v9a12 12 0 0 1-12 12h-1a14 14 0 0 1-9 7v7h10v11H18V47h10v-7a14 14 0 0 1-9-7h-1A12 12 0 0 1 6 21v-9h12zm0 12h-6v3a6 6 0 0 0 6 6zm28 0v9a6 6 0 0 0 6-6v-3z',
  podium: 'M23 16h18v42H23zM4 30h16v28H4zM44 38h16v20H44z',
  bolt: 'M38 2 12 36h15l-5 26 30-38H36z',
  hourglass: 'M14 6h36v7h-4v6c0 8-7 11-10 13 3 2 10 5 10 13v6h4v7H14v-7h4v-6c0-8 7-11 10-13-3-2-10-5-10-13v-6h-4z',
  rows: 'M8 12h48v10H8zM8 27h48v10H8zM8 42h48v10H8z',
  grid: 'M8 8h21v21H8zM35 8h21v21H35zM8 35h21v21H8zM35 35h21v21H35z',
  sun: 'M32 21a11 11 0 1 1 0 22 11 11 0 0 1 0-22zM29 5h6v11h-6zM29 48h6v11h-6zM5 29h11v6H5zM48 29h11v6H48zM11 15l4-4 8 8-4 4zM41 45l4-4 8 8-4 4zM11 49l8-8 4 4-8 8zM41 19l8-8 4 4-8 8z',
  moon: 'M38 6a26 26 0 1 0 20 42A23 23 0 0 1 38 6z',
  comeback: 'M28 8 6 28l22 20V36h12a9 9 0 0 1 0 18H30v8h10a17 17 0 0 0 0-34H28z',
  star: 'M32 4l8.500 19 20.500 2.500-15.200 14 4.200 20.500L32 49.500 13.500 60l4.200-20.500-15.200-14L23 23z',
};
const WITH_HOLES = new Set(['plate', 'flame', 'trophy']);

const mark = (glyph, label) => ({ glyph, label });

const MARKS = {
  'workouts-1': mark('dumbbell', '1'), 'workouts-10': mark('dumbbell', '10'), 'workouts-50': mark('dumbbell', '50'), 'workouts-100': mark('dumbbell', '100'), 'workouts-250': mark('dumbbell', '250'),
  'streak-4': mark('flame', '4'), 'streak-12': mark('flame', '12'), 'streak-26': mark('flame', '26'), 'streak-52': mark('flame', '52'),
  'tonnage-100': mark('stack', '100 t'), 'tonnage-500': mark('stack', '500 t'), 'tonnage-1000': mark('stack', '1000 t'),
  'records-10': mark('trophy', '10'), 'records-50': mark('trophy', '50'), 'records-100': mark('trophy', '100'),
  'lift-100': mark('lifter', '100'), 'lift-150': mark('lifter', '150'), 'lift-200': mark('lifter', '200'),
  'bench-100': mark('bench', '100'), 'bench-120': mark('bench', '120'),
  'dumbbell-30': mark('dumbbell', '30'), 'dumbbell-40': mark('dumbbell', '40'),
  'body-bench': mark('flex', '1×'), 'body-squat': mark('flex', '1,5×'), 'body-deadlift': mark('flex', '2×'),
  'total-300': mark('podium', '300'), 'total-400': mark('podium', '400'), 'total-500': mark('podium', '500'),
  'red-plate': mark('plate'), 'red-bar': mark('barbell'), 'all-muscles': mark('person'), 'green-map': mark('person', '11'),
  'workout-10t': mark('bolt', '10 t'), 'workout-records': mark('trophy', '5×'),
  'hours-100': mark('hourglass', '100 h'), 'sets-1000': mark('rows', '1000'), 'sets-5000': mark('rows', '5000'), 'exercises-25': mark('grid', '25'),
  early: mark('sun'), late: mark('moon'), comeback: mark('comeback'), 'new-year': mark('star', '1.01'),
};

const labelSize = (label) => (label.length <= 2 ? 25 : label.length === 3 ? 22 : label.length === 4 ? 18 : 15);
const scaled = (factor) => `translate(50 50) scale(${factor}) translate(-50 -50)`;

function gradients(metal) {
  const { name, rim, face } = metal;
  const stops = ([a, b, c]) => `<stop offset="0" stop-color="${a}"/><stop offset="0.5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>`;
  return `<linearGradient id="medal-${name}-rim" x1="0" y1="0" x2="1" y2="1">${stops(rim)}</linearGradient>`
    + `<linearGradient id="medal-${name}-edge" x1="1" y1="1" x2="0" y2="0">${stops(rim)}</linearGradient>`
    + `<linearGradient id="medal-${name}-face" x1="0.15" y1="0" x2="0.85" y2="1">${stops(face)}</linearGradient>`;
}

function glyphMarkup({ glyph, label }, { ink, line }) {
  const placed = label ? 'translate(50 39) scale(0.74) translate(-32 -32)' : 'translate(50 49) scale(1) translate(-32 -32)';
  const rule = WITH_HOLES.has(glyph) ? ' fill-rule="evenodd"' : '';
  return `<path class="badge-glyph" transform="${placed}"${rule} d="${GLYPHS[glyph]}" fill="${ink}" stroke="${line}" stroke-width="2.200" stroke-linejoin="round" paint-order="stroke"/>`;
}

function labelMarkup({ label }, { ink }) {
  if (!label) return '';
  return `<text class="badge-label" x="50" y="${84 - (labelSize(label) > 20 ? 3 : 5)}" text-anchor="middle" font-size="${labelSize(label)}" fill="#fff" stroke="${ink}" stroke-width="3.500" paint-order="stroke">${label}</text>`;
}

/** Wnętrze medalu jako tekst SVG: cień, rant, faza, tarcza z emaliowym pasem, połysk, znak i napis. */
export function badgeMarkup(item) {
  const shape = SHAPES[item.group];
  const metal = METALS[rewardTier(item.xp)];
  const clip = `medal-clip-${item.id}`;
  const fill = (part) => `url(#medal-${metal.name}-${part})`;
  return `<defs>${gradients(metal)}<clipPath id="${clip}"><path transform="${scaled(0.84)}" d="${shape}"/></clipPath></defs>`
    + `<path transform="translate(0 3)" d="${shape}" fill="#000" opacity="0.5"/>`
    + `<path d="${shape}" fill="${fill('rim')}" stroke="${fill('rim')}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path transform="${scaled(0.9)}" d="${shape}" fill="${fill('edge')}"/>`
    + `<g clip-path="url(#${clip})">`
    + `<rect width="100" height="100" fill="${fill('face')}"/>`
    + `<path d="M0 84 100 58v42H0z" fill="${metal.enamel}"/>`
    + `<path d="M0 79 100 53M0 74 100 48M0 91 100 65" stroke="${metal.line}" stroke-width="1.300" opacity="0.75" fill="none"/>`
    + '<ellipse cx="30" cy="16" rx="50" ry="22" transform="rotate(-22 30 16)" fill="#fff" opacity="0.28"/>'
    + '</g>'
    + `<path transform="${scaled(0.84)}" d="${shape}" fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="1.400"/>`
    + glyphMarkup(MARKS[item.id], metal)
    + labelMarkup(MARKS[item.id], metal);
}

/** Medal do pokazania. Niezdobyty jest przyciemniony i bez koloru, więc widać, co jeszcze jest do zebrania. */
export function badge(item, size = 64) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '-3 -3 106 108');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `badge${item.done ? ' earned' : ''}`);
  svg.innerHTML = badgeMarkup(item);
  return svg;
}
