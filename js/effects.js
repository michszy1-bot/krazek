// Kupione efekty: ramki odznaki, konfetti i fajerwerki po treningu oraz pokaz nowej rangi.
// Wszystko rysowane tutaj. Rozrzut jest stały (złota proporcja), więc efekt wygląda tak samo za każdym razem.

import { h, particles } from './ui.js';
import { rankBadgeSvg } from './rank-badges.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GOLDEN = 0.618034;
let uid = 0;

const svgEl = (viewBox, className, inner) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);
  svg.innerHTML = inner;
  return svg;
};

// Punkt na okręgu wokół środka ramki; kąt w stopniach od góry, zgodnie z ruchem wskazówek.
const at = (deg, r) => {
  const a = (deg * Math.PI) / 180;
  return [50 + r * Math.sin(a), 50 - r * Math.cos(a)].map((v) => v.toFixed(1));
};

function laurel(g) {
  const leaves = [];
  for (const side of [1, -1]) {
    for (let k = 0; k < 8; k += 1) {
      const deg = side * (162 - k * 16);
      const [x, y] = at(deg, 45);
      const size = 1 - k * 0.04;
      leaves.push(`<ellipse cx="${x}" cy="${y}" rx="${(2.4 * size).toFixed(1)}" ry="${(5.6 * size).toFixed(1)}" transform="rotate(${deg - side * 38} ${x} ${y})" fill="url(#${g}l)" stroke="#7a5204" stroke-width="0.5"/>`);
      const [ix, iy] = at(deg + side * 7, 40.5);
      if (k < 7) leaves.push(`<ellipse cx="${ix}" cy="${iy}" rx="${(1.9 * size).toFixed(1)}" ry="${(4.4 * size).toFixed(1)}" transform="rotate(${deg + side * 52} ${ix} ${iy})" fill="url(#${g}l)" stroke="#7a5204" stroke-width="0.45" opacity="0.92"/>`);
    }
  }
  const [sx, sy] = at(165, 43);
  const [ex, ey] = at(44, 43);
  return `<defs>
      <linearGradient id="${g}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b3"/><stop offset="0.5" stop-color="#d9a521"/><stop offset="1" stop-color="#7a5204"/></linearGradient>
      <linearGradient id="${g}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="0.55" stop-color="#e0ae1c"/><stop offset="1" stop-color="#8f6a08"/></linearGradient>
    </defs>
    <circle cx="50" cy="50" r="38" fill="none" stroke="url(#${g}r)" stroke-width="2.6"/>
    <circle cx="50" cy="50" r="35.6" fill="none" stroke="#7a5204" stroke-width="0.7" opacity="0.7"/>
    <path d="M${sx} ${sy} A43 43 0 0 0 ${ex} ${ey}" fill="none" stroke="#a8761a" stroke-width="1.1"/>
    <path d="M${100 - sx} ${sy} A43 43 0 0 1 ${100 - ex} ${ey}" fill="none" stroke="#a8761a" stroke-width="1.1"/>
    ${leaves.join('')}
    <path d="M50 89 L39 99 L42 92 L36 91 Z M50 89 L61 99 L58 92 L64 91 Z" fill="#c7353a" stroke="#6e1518" stroke-width="0.6" stroke-linejoin="round"/>
    <circle cx="50" cy="89" r="3.4" fill="url(#${g}l)" stroke="#7a5204" stroke-width="0.6"/>`;
}

function flames(g) {
  const tongues = [];
  for (let i = 0; i < 16; i += 1) {
    const tall = i % 2 ? 9 : 13;
    tongues.push(`<g transform="rotate(${(i * 360) / 16} 50 50)"><path class="flame" style="animation-delay:${-(i * 137) % 900}ms" d="M45.5 14 Q44.5 ${14 - tall * 0.5} 50 ${14 - tall} Q55.5 ${14 - tall * 0.5} 54.5 14 Z" fill="url(#${g}f)"/><path class="flame flame-core" style="animation-delay:${-(i * 211) % 900}ms" d="M47.8 14 Q47.5 ${14 - tall * 0.35} 50 ${14 - tall * 0.62} Q52.5 ${14 - tall * 0.35} 52.2 14 Z" fill="#fff2a8"/></g>`);
  }
  return `<defs>
      <linearGradient id="${g}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffb21e"/><stop offset="0.55" stop-color="#ff5a1f"/><stop offset="1" stop-color="#c41d12" stop-opacity="0.85"/></linearGradient>
      <radialGradient id="${g}h"><stop offset="0.55" stop-color="#ff6a1f" stop-opacity="0"/><stop offset="0.78" stop-color="#ff6a1f" stop-opacity="0.45"/><stop offset="1" stop-color="#ff6a1f" stop-opacity="0"/></radialGradient>
      <linearGradient id="${g}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd25a"/><stop offset="1" stop-color="#b8260f"/></linearGradient>
    </defs>
    <circle cx="50" cy="50" r="49" fill="url(#${g}h)"/>
    ${tongues.join('')}
    <circle cx="50" cy="50" r="36.5" fill="none" stroke="url(#${g}r)" stroke-width="3"/>
    <circle cx="50" cy="50" r="34.4" fill="none" stroke="#5c1208" stroke-width="0.8" opacity="0.8"/>`;
}

function crystal(g) {
  const shards = [];
  for (let i = 0; i < 8; i += 1) {
    const long = i % 2 ? 8 : 12;
    shards.push(`<g transform="rotate(${i * 45} 50 50)"><path d="M50 ${12 - long} L53.6 12 L50 16.5 L46.4 12 Z" fill="url(#${g}s)" stroke="#bff0ff" stroke-width="0.5" stroke-linejoin="round"/><path d="M50 ${12 - long} L50 16.5 L46.4 12 Z" fill="#fff" opacity="0.32"/></g>`);
  }
  return `<defs>
      <linearGradient id="${g}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#7fd8ff"/><stop offset="1" stop-color="#1e6fa8"/></linearGradient>
      <linearGradient id="${g}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8fbff"/><stop offset="0.5" stop-color="#54c8ff"/><stop offset="1" stop-color="#155a8c"/></linearGradient>
    </defs>
    <circle cx="50" cy="50" r="47" fill="#54c8ff" opacity="0.08"/>
    ${shards.join('')}
    <circle cx="50" cy="50" r="37.5" fill="none" stroke="url(#${g}r)" stroke-width="3.2"/>
    <circle cx="50" cy="50" r="35" fill="none" stroke="#e8fbff" stroke-width="0.6" opacity="0.6"/>
    <circle class="glint" cx="50" cy="50" r="37.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="9 227" opacity="0.95"/>`;
}

function royal(g) {
  const gem = (deg, colour) => {
    const [x, y] = at(deg, 38);
    return `<circle cx="${x}" cy="${y}" r="4.2" fill="url(#${g}o)" stroke="#6e4c06" stroke-width="0.7"/><circle cx="${x}" cy="${y}" r="2.9" fill="${colour}"/><circle cx="${(+x - 1).toFixed(1)}" cy="${(+y - 1).toFixed(1)}" r="0.9" fill="#fff" opacity="0.85"/>`;
  };
  return `<defs>
      <linearGradient id="${g}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a8ff"/><stop offset="0.5" stop-color="#7c3bc4"/><stop offset="1" stop-color="#3a1068"/></linearGradient>
      <linearGradient id="${g}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b3"/><stop offset="0.5" stop-color="#e2b43a"/><stop offset="1" stop-color="#7a5204"/></linearGradient>
    </defs>
    <circle cx="50" cy="50" r="38" fill="none" stroke="url(#${g}p)" stroke-width="5.5"/>
    <circle cx="50" cy="50" r="41.2" fill="none" stroke="url(#${g}o)" stroke-width="1.6"/>
    <circle cx="50" cy="50" r="34.8" fill="none" stroke="url(#${g}o)" stroke-width="1.2"/>
    ${gem(90, '#e5484d')}${gem(270, '#e5484d')}${gem(180, '#2f6bea')}${gem(135, '#35b371')}${gem(225, '#35b371')}
    <path d="M35 13 L32.5 -1 L41.5 6 L50 -5 L58.5 6 L67.5 -1 L65 13 Q50 9.5 35 13 Z" fill="url(#${g}o)" stroke="#6e4c06" stroke-width="0.9" stroke-linejoin="round"/>
    <path d="M35.5 10.5 Q50 7 64.5 10.5" fill="none" stroke="#6e4c06" stroke-width="0.7"/>
    <circle cx="32.5" cy="-1" r="1.8" fill="#fff2b3" stroke="#6e4c06" stroke-width="0.5"/>
    <circle cx="67.5" cy="-1" r="1.8" fill="#fff2b3" stroke="#6e4c06" stroke-width="0.5"/>
    <circle cx="50" cy="-5" r="2.2" fill="#e5484d" stroke="#6e4c06" stroke-width="0.5"/>
    <circle cx="50" cy="6.5" r="2.1" fill="#2f6bea" stroke="#6e4c06" stroke-width="0.5"/>`;
}

const FRAMES = { laurel, fire: flames, crystal, royal };

/** Odznaka rangi w kupionej ramce. frameId bez przedrostka, np. 'fire', a null to sama odznaka. */
export function framedBadge(rankId, frameId, size = 76) {
  const badgeSize = FRAMES[frameId] ? Math.round(size * 0.78) : size;
  const badge = rankBadgeSvg(rankId, badgeSize);
  if (!FRAMES[frameId]) return badge;
  uid += 1;
  return h(`span.badge-frame.frame-${frameId}`, { style: `width:${size}px;height:${size}px` },
    svgEl('-6 -8 112 112', 'badge-frame-art', FRAMES[frameId](`bf${uid}`)),
    badge);
}

const CONFETTI_COLOURS = ['#e5484d', '#2f6bea', '#f6c62e', '#35b371', '#f1f3f5'];

/** Konfetti sypiące się z góry podsumowania. */
export function confetti(count = 44) {
  return h('span.fx-confetti', { 'aria-hidden': 'true' }, Array.from({ length: count }, (_, i) => {
    const x = ((i * GOLDEN) % 1) * 100;
    const drift = Math.round((((i * 0.381966) % 1) - 0.5) * 90);
    const style = [
      `left:${x.toFixed(1)}%`,
      `--drift:${drift}px`,
      `--spin:${360 + (i % 5) * 160}deg`,
      `--wait:${(i * 53) % 1100}ms`,
      `--fall:${2100 + ((i * 7) % 5) * 180}ms`,
      `width:${6 + (i % 3) * 2}px`,
      `height:${9 + ((i * 2) % 4) * 2}px`,
      `background:${CONFETTI_COLOURS[i % CONFETTI_COLOURS.length]}`,
    ].join(';');
    return h(`i.confetto${i % 4 === 0 ? '.round' : ''}`, { style });
  }));
}

const BURSTS = [
  { left: 26, top: 70, wait: 250 },
  { left: 72, top: 46, wait: 750 },
  { left: 50, top: 120, wait: 1250 },
];

/** Trzy wybuchy fajerwerków. Kolor bierze się z rangi (--rank), a co trzecia iskra jest biała. */
export function fireworks(rankId) {
  return h('span.fx-fireworks', { 'aria-hidden': 'true', style: rankId ? `--rank:var(--rank-${rankId})` : '' },
    BURSTS.map(({ left, top, wait }) => h('span.fx-burst', { style: `left:${left}%;top:${top}px;--burst:${wait}ms` },
      h('i.fx-flash'),
      particles('fx-spark', 30, 66))));
}

/** Odznaka nowej rangi, z kupionym efektem albo bez. effect: 'glow', 'burst' albo null. */
export function rankUpBadge(rankId, effect, size = 52) {
  const badge = rankBadgeSvg(rankId, size);
  if (!effect) return badge;
  return h(`span.rankup.rankup-${effect}`, { style: `--rank:var(--rank-${rankId});width:${size}px;height:${size}px`, 'aria-hidden': 'true' },
    effect === 'glow' && h('span.rankup-rays'),
    effect === 'burst' && [h('span.rankup-ring'), h('span.rankup-shards', particles('rankup-shard', 12, size * 0.95))],
    badge);
}
