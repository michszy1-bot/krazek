// Odznaki rang siły w stylu rang z gier rankingowych: metalowy herb z oszlifowanym klejnotem w środku.
// Z każdą rangą przybywa ozdób: skrzydła rosną, dochodzą kolce, zawieszka, korona, rogi i promienie.
// Wszystko rysowane tutaj, bez cudzych grafik.

const SVG_NS = 'http://www.w3.org/2000/svg';

// metal: jasny, główny i ciemny kolor oprawy; gem: jasny, główny i ciemny kolor klejnotu.
// wings: liczba piór na stronę, reach: ich długość, spikes: kolce na górze, flanges: boczne ostrza,
// pendant: zawieszka pod herbem, crown, horns, rays.
const STYLE = {
  bronze: { metal: ['#f2c49b', '#a8693a', '#4e2a12'], gem: ['#ffd9b8', '#c9824a', '#6b3a17'], wings: 0 },
  silver: { metal: ['#ffffff', '#a9b3c1', '#4b5562'], gem: ['#f2f6fb', '#9fb0c4', '#4f5d6e'], wings: 2, reach: 17 },
  gold: { metal: ['#fff2b3', '#d9a521', '#7a5204'], gem: ['#fff6c8', '#f0c23a', '#93650a'], wings: 3, reach: 21, spikes: 1, flanges: true },
  platinum: { metal: ['#e9fffa', '#7fc9bb', '#2d6158'], gem: ['#c9fff2', '#2ec4a6', '#0a5649'], wings: 4, reach: 25, spikes: 3, flanges: true, pendant: true },
  diamond: { metal: ['#f1eeff', '#9a8fd6', '#3c3478'], gem: ['#efe9ff', '#8f7cf2', '#35239a'], wings: 5, reach: 29, spikes: 3, flanges: true, pendant: true },
  master: { metal: ['#f6dcff', '#a45bc0', '#3e1150'], gem: ['#ffd8ff', '#d65ce0', '#5d0f6a'], wings: 5, reach: 31, spikes: 3, flanges: true, pendant: true, crown: true },
  titan: { metal: ['#ffc4b6', '#b33a2c', '#470d07'], gem: ['#ffc9cb', '#e5484d', '#5c0b0e'], wings: 6, reach: 33, spikes: 5, flanges: true, pendant: true, crown: true, horns: true },
  olympian: { metal: ['#fff6c9', '#e2b43a', '#6e4c06'], gem: ['#e2f7ff', '#54c8ff', '#07507f'], wings: 6, reach: 35, spikes: 5, flanges: true, pendant: true, crown: true, rays: true },
};
const NONE = { metal: ['#555d69', '#363c46', '#1e2228'], gem: ['#3b424d', '#2a3038', '#191d22'], wings: 0 };

let uid = 0;
const n = (v) => v.toFixed(1);

// Herb: ostry szczyt, boczne rogi i szpic na dole. Rogi herbu to też miejsca na nity.
const CREST_POINTS = [[32, 3], [45, 10], [55, 24], [50, 44], [32, 61], [14, 44], [9, 24], [19, 10]];
const CREST = `M${CREST_POINTS.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;
const shrink = (k) => `M${CREST_POINTS.map(([x, y]) => `${n(32 + (x - 32) * k)} ${n(32 + (y - 32) * k)}`).join(' L')} Z`;

/** Pióra skrzydła po lewej stronie, wachlarzem od góry do dołu; prawa strona to odbicie. */
function wingBlades(count, reach, { width = 4.2, veins = '' } = {}) {
  let blades = '';
  let lines = '';
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const angle = (222 - 62 * t) * (Math.PI / 180);
    const len = reach * (1 - 0.35 * t);
    const bx = 15;
    const by = 20 + t * 20;
    const tx = bx + len * Math.cos(angle);
    const ty = by + len * Math.sin(angle);
    const px = -Math.sin(angle);
    const py = Math.cos(angle);
    const mx = bx + (tx - bx) * 0.5;
    const my = by + (ty - by) * 0.5;
    blades += `<path d="M${n(bx)} ${n(by - 2)} Q${n(mx + px * width)} ${n(my + py * width)} ${n(tx)} ${n(ty)} Q${n(mx - px * width)} ${n(my - py * width)} ${n(bx)} ${n(by + 2)} Z"/>`;
    // Żyłka pióra: od nasady prawie do czubka.
    if (veins) lines += `<path d="M${n(bx)} ${n(by)} L${n(bx + (tx - bx) * 0.85)} ${n(by + (ty - by) * 0.85)}"/>`;
  }
  return { blades, lines };
}

function topSpikes(count) {
  if (!count) return '';
  const spots = { 1: [0], 3: [-9, 0, 9], 5: [-16, -8, 0, 8, 16] }[count];
  return spots.map((dx) => {
    const h = dx === 0 ? 9 : 6 - Math.abs(dx) * 0.12;
    const x = 32 + dx;
    const base = 8 + Math.abs(dx) * 0.45;
    return `<path d="M${n(x - 3)} ${n(base + 3)} L${n(x)} ${n(base - h)} L${n(x + 3)} ${n(base + 3)} Z"/>`;
  }).join('');
}

function rays(count) {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const w = Math.PI / count / 2.6;
    const p = (r, ang) => `${n(32 + r * Math.cos(ang))} ${n(32 + r * Math.sin(ang))}`;
    out += `<path d="M${p(20, a - w)} L${p(i % 2 ? 36 : 43, a)} L${p(20, a + w)} Z"/>`;
  }
  return out;
}

/** Czteroramienny błysk. */
const sparkle = (x, y, r) => `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z"/>`;

function drawing(rankId, g) {
  const s = STYLE[rankId] ?? NONE;
  const [ml, mm, md] = s.metal;
  const [gl, gm, gd] = s.gem;
  const defs = `<defs>
    <linearGradient id="${g}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ml}"/><stop offset="0.5" stop-color="${mm}"/><stop offset="1" stop-color="${md}"/></linearGradient>
    <linearGradient id="${g}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${md}"/><stop offset="1" stop-color="${mm}"/></linearGradient>
    <linearGradient id="${g}w" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${mm}"/><stop offset="1" stop-color="${ml}"/></linearGradient>
    <linearGradient id="${g}v" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${md}"/><stop offset="1" stop-color="${mm}"/></linearGradient>
    <linearGradient id="${g}g" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${gl}"/><stop offset="0.45" stop-color="${gm}"/><stop offset="1" stop-color="${gd}"/></linearGradient>
    <radialGradient id="${g}h" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${gm}" stop-opacity="0.75"/><stop offset="1" stop-color="${gm}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${g}n" cx="0.35" cy="0.35" r="0.65"><stop offset="0" stop-color="${ml}"/><stop offset="1" stop-color="${md}"/></radialGradient>
  </defs>`;
  const metal = `url(#${g}m)`;
  const edge = `stroke="${md}" stroke-width="1.1" stroke-linejoin="round"`;

  // Skrzydła w dwóch warstwach: dłuższe, ciemne pióra z tyłu i jasne z żyłkami z przodu.
  let wings = '';
  if (s.wings) {
    const back = wingBlades(s.wings, s.reach * 1.12, { width: 3.6 });
    const front = wingBlades(s.wings, s.reach, { width: 4.2, veins: true });
    const side = (flip) => `<g ${flip ? 'transform="translate(64 0) scale(-1 1)"' : ''}>
      <g fill="url(#${g}v)" ${edge}>${back.blades}</g>
      <g fill="url(#${g}w)" ${edge}>${front.blades}</g>
      <g stroke="${ml}" stroke-width="0.7" stroke-linecap="round" opacity="0.7" fill="none">${front.lines}</g></g>`;
    wings = side(false) + side(true);
  }
  const glow = rankId && s.wings >= 4 ? `<circle cx="32" cy="32" r="${s.rays ? 40 : 32}" fill="url(#${g}h)"/>` : '';
  const rayLayer = s.rays ? `<g fill="${mm}" stroke="${md}" stroke-width="0.6" opacity="0.9">${rays(16)}</g>` : '';
  const horns = s.horns
    ? `<g fill="${metal}" ${edge}><path d="M21 12 C14 7 11 0 13 -7 C17 1 22 5 27 8 Z"/><path d="M43 12 C50 7 53 0 51 -7 C47 1 42 5 37 8 Z"/></g>
      <g stroke="${ml}" stroke-width="0.6" fill="none" opacity="0.6"><path d="M20 9 C16 6 14 2 14 -3"/><path d="M44 9 C48 6 50 2 50 -3"/></g>`
    : '';
  const spikes = s.spikes ? `<g fill="${metal}" ${edge}>${topSpikes(s.spikes)}</g>` : '';
  const flanges = s.flanges
    ? `<g fill="${metal}" ${edge}><path d="M10 22 L0 27 L9 30 Z"/><path d="M54 22 L64 27 L55 30 Z"/></g>`
    : '';
  const pendant = s.pendant
    ? `<path d="M27 56 L32 72 L37 56 Z" fill="${metal}" ${edge}/><path d="M32 62 L35 66 L32 70 L29 66 Z" fill="url(#${g}g)" stroke="${gd}" stroke-width="0.6"/>`
    : '';
  const crown = s.crown
    ? `<path d="M21 9 L22.5 -2 L27.5 4 L32 -7 L36.5 4 L41.5 -2 L43 9 Z" fill="${metal}" ${edge}/>
      <path d="M22 7 H42" stroke="${md}" stroke-width="0.8"/>
      <g fill="url(#${g}g)" stroke="${gd}" stroke-width="0.5"><circle cx="32" cy="-4" r="2"/><circle cx="22.6" cy="-1" r="1.4"/><circle cx="41.4" cy="-1" r="1.4"/><circle cx="27" cy="7" r="1"/><circle cx="32" cy="7" r="1.2"/><circle cx="37" cy="7" r="1"/></g>`
    : '';
  // Herb: oprawa, jasna obręcz, ciemna płyta, grawer i nity w rogach.
  const rivets = rankId
    ? `<g fill="url(#${g}n)" stroke="${md}" stroke-width="0.4">${CREST_POINTS.map(([x, y]) => {
      const k = 0.86;
      return `<circle cx="${n(32 + (x - 32) * k)}" cy="${n(32 + (y - 32) * k)}" r="1.25"/>`;
    }).join('')}</g>`
    : '';
  const crest = `<path d="${CREST}" fill="${metal}" ${edge}/>
    <path d="${shrink(0.9)}" fill="none" stroke="${ml}" stroke-width="0.7" opacity="0.55"/>
    <path d="${shrink(0.76)}" fill="url(#${g}p)" stroke="${md}" stroke-width="0.8"/>
    <path d="${shrink(0.7)}" fill="none" stroke="${mm}" stroke-width="0.5" opacity="0.6"/>
    <path d="M32 3 L45 10 L55 24 L32 30 L9 24 L19 10 Z" fill="#fff" opacity="0.13"/>
    <path d="M14 44 L32 61 L50 44 L32 52 Z" fill="#000" opacity="0.2"/>
    ${rankId ? `<g stroke="${ml}" stroke-width="0.6" fill="none" opacity="0.45"><path d="M22 47 L32 54 L42 47"/><path d="M25 51 L32 56 L39 51"/><path d="M19 22 L24 19 M45 22 L40 19"/></g>` : ''}
    ${rivets}`;
  // Klejnot o szlifie z wieloma ściankami i błyskiem.
  const gem = rankId
    ? `<path d="M32 15 L43 30 L32 49 L21 30 Z" fill="url(#${g}g)" stroke="${gd}" stroke-width="0.9" stroke-linejoin="round"/>
      <path d="M32 15 L37.5 22.5 L32 30 L26.5 22.5 Z" fill="#fff" opacity="0.22"/>
      <path d="M21 30 L26.5 22.5 L32 30 Z" fill="#fff" opacity="0.38"/>
      <path d="M43 30 L37.5 22.5 L32 30 Z" fill="#000" opacity="0.12"/>
      <path d="M21 30 L32 30 L32 49 Z" fill="#fff" opacity="0.1"/>
      <path d="M43 30 L32 30 L32 49 Z" fill="#000" opacity="0.18"/>
      <path d="M32 15 L32 49 M21 30 H43 M26.5 22.5 L37.5 22.5 M26.5 22.5 L32 30 L37.5 22.5 M26.5 37 L32 30 L37.5 37" fill="none" stroke="${gd}" stroke-width="0.5" opacity="0.55"/>
      <path d="M32 21 L38 30 L32 41 L26 30 Z" fill="none" stroke="${gl}" stroke-width="0.6" opacity="0.6"/>
      <g fill="#fff">${sparkle(27.5, 21.5, 3.2)}<circle cx="36" cy="38" r="0.8" opacity="0.8"/></g>`
    : `<text x="32" y="38" text-anchor="middle" fill="#8b93a0" font-size="18" font-weight="700" font-family="system-ui, sans-serif">?</text>`;
  return `${defs}${glow}${rayLayer}${wings}${horns}${flanges}${spikes}${pendant}${crown}${crest}${gem}`;
}

/** Odznaka rangi jako element SVG. rankId z RANKS w level.js, a null to brak rangi. */
export function rankBadgeSvg(rankId, size = 40) {
  uid += 1;
  const svg = document.createElementNS(SVG_NS, 'svg');
  // Szerszy kadr niż herb, bo skrzydła, korona, zawieszka i promienie wychodzą poza niego.
  svg.setAttribute('viewBox', '-16 -14 96 96');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `rank-badge ${rankId ? `rank-${rankId}` : 'rank-none'}`);
  svg.innerHTML = drawing(rankId, `rb${uid}`);
  return svg;
}
