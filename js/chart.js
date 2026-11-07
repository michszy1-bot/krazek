// Wykresy SVG bez bibliotek. Linia 2 px, cienkie kolumny, celownik i dymek na dotyk, mysz oraz klawiaturę.

import { h } from './ui.js';
import { niceTicks } from './stats.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function s(tag, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text != null) el.textContent = text;
  return el;
}

/** Odświeża rysunek po zmianie szerokości, np. po obrocie telefonu. */
function responsive(host, draw) {
  let lastWidth = 0;
  const redraw = () => {
    const width = Math.round(host.clientWidth);
    if (!width || width === lastWidth) return;
    lastWidth = width;
    draw(width);
  };
  new ResizeObserver(redraw).observe(host);
  requestAnimationFrame(redraw);
}

function makeTooltip(host) {
  const tip = h('div.chart-tip', { hidden: true }, h('strong'), h('span'));
  host.append(tip);
  return {
    show(x, y, value, label, width) {
      tip.hidden = false;
      tip.children[0].textContent = value;
      tip.children[1].textContent = label;
      const tipWidth = tip.offsetWidth;
      tip.style.left = `${Math.min(Math.max(0, x - tipWidth / 2), width - tipWidth)}px`;
      tip.style.top = `${Math.max(0, y)}px`;
    },
    hide() { tip.hidden = true; },
  };
}

/**
 * Wykres liniowy z jedną serią.
 * points: [{ x: znacznik czasu, y: liczba, label: data w dymku, value: wartość w dymku }]
 * xDomain: opcjonalny zakres osi czasu [od, do], żeby dwa wykresy jeden pod drugim miały te same daty.
 * yTicks: opcjonalna stała skala osi Y, np. [6, 7, 8, 9, 10] dla oceny wysiłku.
 */
export function lineChart({ points, formatTick, formatEnd, formatDate, label, minStep = 0, height = 220, xDomain = null, yTicks = null }) {
  const host = h('div.chart', { role: 'img', tabindex: '0', 'aria-label': label });
  const plot = h('div.chart-plot');
  host.append(plot);
  const tooltip = makeTooltip(host);

  responsive(host, (width) => {
    plot.replaceChildren();
    const top = 34;
    const bottom = 26;
    const left = 44;
    const ys = points.map((p) => p.y);
    const ticks = yTicks ?? niceTicks(Math.min(...ys), Math.max(...ys), 4, minStep);
    const yMin = ticks[0];
    const yMax = ticks.at(-1);
    const endLabel = formatEnd(points.at(-1));
    // Wspólny zakres dat wymaga też stałego marginesu, inaczej osie by się rozjechały.
    const right = xDomain ? 44 : Math.min(70, 16 + endLabel.length * 4);
    const xMin = xDomain?.[0] ?? points[0].x;
    const xMax = xDomain?.[1] ?? points.at(-1).x;
    const X = (x) => (xMax === xMin ? (left + width - right) / 2 : left + ((x - xMin) / (xMax - xMin)) * (width - left - right));
    const Y = (y) => top + (1 - (y - yMin) / (yMax - yMin)) * (height - top - bottom);

    const svg = s('svg', { width, height, viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' });

    for (const tick of ticks) {
      svg.append(s('line', { x1: left, x2: width, y1: Y(tick), y2: Y(tick), class: 'grid' }));
      svg.append(s('text', { x: left - 8, y: Y(tick) + 4, 'text-anchor': 'end', class: 'tick' }, formatTick(tick)));
    }

    // Etykiety osi X: pierwsza i ostatnia data, pośrednie tylko gdy mieszczą się bez kolizji.
    const xTicks = xMax === xMin ? [xMin] : [xMin, xMin + (xMax - xMin) / 2, xMax];
    xTicks.forEach((value, i) => {
      const anchor = xTicks.length === 1 ? 'middle' : ['start', 'middle', 'end'][i];
      svg.append(s('text', { x: X(value), y: height - 6, 'text-anchor': anchor, class: 'tick' }, formatDate(value)));
    });

    if (points.length > 1) {
      const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join('');
      svg.append(s('path', { d, class: 'line' }));
    }

    // Kropka na końcu z wartością. Pozostałe wartości są w dymku i w tabeli pod wykresem.
    const last = points.at(-1);
    svg.append(s('circle', { cx: X(last.x), cy: Y(last.y), r: 5, class: 'dot' }));
    const endX = Math.min(X(last.x), width - 2);
    svg.append(s('text', { x: endX, y: Y(last.y) - 12, 'text-anchor': 'end', class: 'end-label' }, endLabel));

    const crosshair = s('line', { y1: top, y2: height - bottom, class: 'crosshair', visibility: 'hidden' });
    const marker = s('circle', { r: 5, class: 'dot', visibility: 'hidden' });
    svg.append(crosshair, marker);
    plot.append(svg);

    let current = -1;
    const pick = (index) => {
      current = index;
      const p = points[index];
      const x = X(p.x);
      crosshair.setAttribute('x1', x);
      crosshair.setAttribute('x2', x);
      crosshair.setAttribute('visibility', 'visible');
      marker.setAttribute('cx', x);
      marker.setAttribute('cy', Y(p.y));
      marker.setAttribute('visibility', 'visible');
      tooltip.show(x, 0, p.value, p.label, width);
    };
    const clear = () => {
      current = -1;
      crosshair.setAttribute('visibility', 'hidden');
      marker.setAttribute('visibility', 'hidden');
      tooltip.hide();
    };
    const nearest = (clientX) => {
      const px = clientX - host.getBoundingClientRect().left;
      let best = 0;
      points.forEach((p, i) => { if (Math.abs(X(p.x) - px) < Math.abs(X(points[best].x) - px)) best = i; });
      return best;
    };

    host.onpointerdown = (e) => pick(nearest(e.clientX));
    host.onpointermove = (e) => pick(nearest(e.clientX));
    host.onpointerleave = clear;
    host.onblur = clear;
    host.onkeydown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.key === 'ArrowRight' ? 1 : -1;
        const from = current < 0 ? (step > 0 ? -1 : points.length) : current;
        pick(Math.min(points.length - 1, Math.max(0, from + step)));
      } else if (e.key === 'Escape') clear();
    };
  });

  return host;
}

/**
 * Kolumny od wspólnej podstawy.
 * items: [{ tickLabel, value: liczba, tipValue, tipLabel }]
 */
export function columnChart({ items, formatTick, label, height = 200 }) {
  const host = h('div.chart', { role: 'img', tabindex: '0', 'aria-label': label });
  const plot = h('div.chart-plot');
  host.append(plot);
  const tooltip = makeTooltip(host);

  responsive(host, (width) => {
    plot.replaceChildren();
    const top = 34;
    const bottom = 26;
    const left = 44;
    const maxValue = Math.max(...items.map((i) => i.value), 1);
    const ticks = niceTicks(0, maxValue, 4);
    const yMax = ticks.at(-1);
    const Y = (v) => top + (1 - v / yMax) * (height - top - bottom);
    const baseline = Y(0);
    const slot = (width - left) / items.length;
    const barWidth = Math.min(24, Math.max(4, slot - 2));

    const svg = s('svg', { width, height, viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true' });
    for (const tick of ticks) {
      svg.append(s('line', { x1: left, x2: width, y1: Y(tick), y2: Y(tick), class: 'grid' }));
      svg.append(s('text', { x: left - 8, y: Y(tick) + 4, 'text-anchor': 'end', class: 'tick' }, formatTick(tick, yMax)));
    }

    // Etykiety osi rzadziej przy gęstych danych, żeby na siebie nie nachodziły.
    const every = Math.max(1, Math.ceil(44 / slot));
    const bars = items.map((item, i) => {
      const cx = left + slot * i + slot / 2;
      if ((items.length - 1 - i) % every === 0) {
        svg.append(s('text', { x: cx, y: height - 6, 'text-anchor': 'middle', class: 'tick' }, item.tickLabel));
      }
      if (item.value <= 0) return { cx, bar: null };
      const y = Y(item.value);
      const radius = Math.min(4, barWidth / 2, baseline - y);
      const x = cx - barWidth / 2;
      const d = `M${x} ${baseline}V${y + radius}Q${x} ${y} ${x + radius} ${y}H${x + barWidth - radius}Q${x + barWidth} ${y} ${x + barWidth} ${y + radius}V${baseline}Z`;
      const bar = s('path', { d, class: 'bar' });
      svg.append(bar);
      return { cx, bar };
    });
    plot.append(svg);

    let current = -1;
    const pick = (index) => {
      bars.forEach((b, i) => b.bar?.classList.toggle('bar-active', i === index));
      current = index;
      tooltip.show(bars[index].cx, 0, items[index].tipValue, items[index].tipLabel, width);
    };
    const clear = () => {
      bars.forEach((b) => b.bar?.classList.remove('bar-active'));
      current = -1;
      tooltip.hide();
    };
    const slotAt = (clientX) => {
      const px = clientX - host.getBoundingClientRect().left - left;
      return Math.min(items.length - 1, Math.max(0, Math.floor(px / slot)));
    };
    host.onpointerdown = (e) => pick(slotAt(e.clientX));
    host.onpointermove = (e) => pick(slotAt(e.clientX));
    host.onpointerleave = clear;
    host.onblur = clear;
    host.onkeydown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.key === 'ArrowRight' ? 1 : -1;
        const from = current < 0 ? (step > 0 ? -1 : items.length) : current;
        pick(Math.min(items.length - 1, Math.max(0, from + step)));
      } else if (e.key === 'Escape') clear();
    };
  });

  return host;
}

/** Poziome paski od największego, z wartością na końcu. Każda wartość jest podpisana. */
export function rankedBars(rows, formatValue) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return h('ul.ranked', rows.map((row) => h('li',
    h('span.ranked-label', row.label),
    h('span.ranked-track',
      h('span.ranked-bar', { style: `width:${Math.max(2, (row.value / max) * 100)}%` }),
      h('span.ranked-value', formatValue(row.value))))));
}
