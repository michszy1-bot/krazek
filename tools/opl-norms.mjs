// Normy z otwartych danych OpenPowerlifting: mężczyźni, bez sprzętu, pełne zawody, najlepszy wynik każdego zawodnika.
// Dane: https://openpowerlifting.gitlab.io/opl-csv/ (domena publiczna). Użycie: node tools/opl-norms.mjs <plik csv>

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const LIFTS = { bench: 'Best3BenchKg', squat: 'Best3SquatKg', deadlift: 'Best3DeadliftKg' };
const lines = createInterface({ input: createReadStream(process.argv[2]), crlfDelay: Infinity });

let columns = null;
let rows = 0;
let kept = 0;
// Zawodnik -> rodzaj boju -> najlepszy wynik i masa ciała z tamtych zawodów. Osobno wszyscy i kategoria z testami.
const best = { all: new Map(), tested: new Map() };

function remember(store, name, lift, kg, body) {
  const key = `${name}|${lift}`;
  const current = store.get(key);
  if (!current || kg / body > current.kg / current.body) store.set(key, { lift, kg, body });
}

for await (const line of lines) {
  const cells = line.split(',');
  if (!columns) {
    columns = Object.fromEntries(cells.map((name, i) => [name, i]));
    for (const name of ['Name', 'Sex', 'Event', 'Equipment', 'Age', 'BodyweightKg', 'Place', 'Tested', ...Object.values(LIFTS)]) {
      if (columns[name] === undefined) throw new Error(`Brak kolumny ${name}`);
    }
    continue;
  }
  rows += 1;
  const get = (name) => cells[columns[name]];
  if (get('Sex') !== 'M' || get('Event') !== 'SBD' || get('Equipment') !== 'Raw') continue;
  if (!/^\d+$/.test(get('Place'))) continue;
  const body = Number(get('BodyweightKg'));
  if (!(body >= 50 && body <= 160)) continue;
  const age = get('Age') === '' ? null : Number(get('Age'));
  if (age !== null && (age < 18 || age >= 40)) continue;
  kept += 1;
  for (const [lift, column] of Object.entries(LIFTS)) {
    const kg = Number(get(column));
    if (!(kg > 0)) continue;
    remember(best.all, get('Name'), lift, kg, body);
    if (get('Tested') === 'Yes') remember(best.tested, get('Name'), lift, kg, body);
  }
}

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

/** Nachylenie w skali logarytmicznej, czyli wykładnik masy ciała. */
function exponent(points) {
  const xs = points.map(([body]) => Math.log(body));
  const ys = points.map(([, kg]) => Math.log(kg));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const top = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0);
  return top / xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
}

const QUANTILES = [0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99];
const report = { rows, kept };
for (const [group, store] of Object.entries(best)) {
  report[group] = {};
  for (const lift of Object.keys(LIFTS)) {
    const entries = [...store.values()].filter((e) => e.lift === lift);
    const bins = new Map();
    for (const { kg, body } of entries) {
      const bin = Math.round(body / 5) * 5;
      if (bin < 60 || bin > 120) continue;
      if (!bins.has(bin)) bins.set(bin, []);
      bins.get(bin).push(kg);
    }
    const table = {};
    for (const bin of [...bins.keys()].sort((a, b) => a - b)) {
      const sorted = bins.get(bin).sort((a, b) => a - b);
      table[bin] = { n: sorted.length, kg: QUANTILES.map((q) => quantile(sorted, q)) };
    }
    const fit = (q) => exponent(Object.entries(table).filter(([, v]) => v.n >= 100).map(([bin, v]) => [Number(bin), v.kg[QUANTILES.indexOf(q)]]));
    const at80 = table[80];
    report[group][lift] = {
      lifters: entries.length,
      exponentP50: Number(fit(0.5).toFixed(3)),
      exponentP90: Number(fit(0.9).toFixed(3)),
      at80Kg: { n: at80.n, quantiles: QUANTILES, kg: at80.kg, ratio: at80.kg.map((kg) => Number((kg / 80).toFixed(2))) },
      at75Kg: { n: table[75].n, ratio: table[75].kg.map((kg) => Number((kg / 75).toFixed(2))) },
      at100Kg: { n: table[100].n, ratio: table[100].kg.map((kg) => Number((kg / 100).toFixed(2))) },
    };
  }
}
console.log(JSON.stringify(report, null, 1));
