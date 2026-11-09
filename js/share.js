// Karta treningu do udostępnienia: obraz 1080 × 1920 rysowany na płótnie, z podglądem przed wysłaniem.
// Kolory i kroje pochodzą z bieżącego wyglądu aplikacji, więc karta pasuje do kupionego motywu.

import { h, openSheet, toast } from './ui.js';
import { countOf, fmtDayMedium, fmtDuration, fmtNum, fmtUnit, fmtVolume } from './format.js';
import { L } from './i18n.js';
import { exerciseById } from './store.js';
import { workingSetCount, workoutVolume } from './stats.js';

const WIDTH = 1080;
const HEIGHT = 1920;
const PAD = 90;
const PLATE_KG = 20;
// Kolory krążków jak na sztandze na ekranie startowym: czerwony, niebieski, żółty i zielony.
const PLATE_COLOURS = ['#d8322b', '#2f6bea', '#e8b923', '#35b371'];

function theme() {
  const style = getComputedStyle(document.documentElement);
  const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    floor: read('--floor', '#181c21'),
    panel: read('--panel', '#23282f'),
    ink: read('--ink', '#f1f3f5'),
    ink2: read('--ink-2', '#aab3bd'),
    accent: read('--accent-line', '#5b8def'),
    data: read('--font-data', 'sans-serif'),
    body: read('--font-body', 'sans-serif'),
  };
}

/** Ustawia największy krój do podanej wielkości, przy którym tekst mieści się w szerokości. */
function shrinkToFit(ctx, text, width, weight, size, family, min = size / 2) {
  let current = size;
  ctx.font = `${weight} ${current}px ${family}`;
  while (current > min && ctx.measureText(text).width > width) {
    current -= 4;
    ctx.font = `${weight} ${current}px ${family}`;
  }
}

/** Tekst przycięty do szerokości, z wielokropkiem. */
function fit(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/** Sztanga z krążkami: tyle par, ile kolorów potrzeba, żeby pokazać wielkość tonażu, najwyżej cztery. */
function drawBar(ctx, y, volume, colours) {
  // 1 para do 1 t, 2 do 5 t, 3 do 10 t, a powyżej 4.
  const pairs = volume < 1000 ? 1 : volume < 5000 ? 2 : volume < 10000 ? 3 : 4;
  const collar = 250;
  const plate = 40;
  const gap = 8;
  ctx.fillStyle = colours.ink2;
  ctx.fillRect(PAD, y - 8, WIDTH - PAD * 2, 16);
  for (const side of [-1, 1]) {
    ctx.fillStyle = colours.ink2;
    ctx.fillRect(WIDTH / 2 + side * collar - 12, y - 30, 24, 60);
    for (let i = 0; i < pairs; i += 1) {
      const height = 260 - i * 40;
      const offset = collar + 20 + i * (plate + gap);
      const x = side > 0 ? WIDTH / 2 + offset : WIDTH / 2 - offset - plate;
      ctx.fillStyle = PLATE_COLOURS[i];
      ctx.beginPath();
      ctx.roundRect(x, y - height / 2, plate, height, 8);
      ctx.fill();
    }
  }
}

/**
 * Rysuje kartę. data: { workout, records: [{ exerciseId, label, value, unit }], xp, level }.
 * Zwraca płótno.
 */
export function drawCard({ workout, records = [], xp = 0, level = null }) {
  const colours = theme();
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const volume = workoutVolume(workout);

  ctx.fillStyle = colours.floor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // Pas w kolorze akcentu u góry, jak taśma na sztandze.
  ctx.fillStyle = colours.accent;
  ctx.fillRect(0, 0, WIDTH, 18);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colours.accent;
  ctx.font = `700 46px ${colours.data}`;
  ctx.letterSpacing = '10px';
  ctx.fillText('FORMA', PAD, 150);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'right';
  ctx.fillStyle = colours.ink2;
  ctx.font = `400 38px ${colours.body}`;
  ctx.fillText(fmtDayMedium(workout.startedAt), WIDTH - PAD, 150);
  ctx.textAlign = 'left';

  ctx.fillStyle = colours.ink;
  ctx.font = `700 78px ${colours.data}`;
  ctx.fillText(fit(ctx, workout.name, WIDTH - PAD * 2), PAD, 290);

  // Tonaż jako bohater karty.
  shrinkToFit(ctx, fmtVolume(volume), WIDTH - PAD * 2, 700, 240, colours.data);
  ctx.fillText(fmtVolume(volume), PAD - 6, 590);
  ctx.fillStyle = colours.ink2;
  ctx.font = `400 42px ${colours.body}`;
  ctx.fillText(volume >= PLATE_KG
    ? L(`podniesione, czyli ${fmtNum(Math.round(volume / PLATE_KG))} krążków po ${PLATE_KG} kg`, `lifted, that’s ${fmtNum(Math.round(volume / PLATE_KG))} plates of ${PLATE_KG} kg`)
    : L('podniesione', 'lifted'), PAD, 700);

  drawBar(ctx, 860, volume, colours);

  // Trzy liczby w rzędzie.
  // Czas krótko, np. 1:05, bo pełny zapis „1 h 5 min” nie mieści się w kolumnie.
  const minutes = Math.max(1, Math.round((workout.endedAt - workout.startedAt) / 60000));
  const time = minutes < 60 ? fmtDuration(minutes * 60000) : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
  const stats = [
    [time, minutes < 60 ? L('czas', 'time') : L('czas (h:min)', 'time (h:min)')],
    [fmtNum(workingSetCount(workout)), L('serie', 'sets')],
    [fmtNum(workout.exercises.length), L('ćwiczenia', 'exercises')],
  ];
  const column = (WIDTH - PAD * 2) / 3;
  stats.forEach(([value, label], i) => {
    const x = PAD + column * i;
    ctx.fillStyle = colours.ink;
    shrinkToFit(ctx, value, column - 24, 700, 96, colours.data);
    ctx.fillText(value, x, 1130);
    ctx.fillStyle = colours.ink2;
    ctx.font = `400 38px ${colours.body}`;
    ctx.fillText(label, x, 1185);
  });

  // Rekordy, a bez nich najlepsze serie z trzech pierwszych ćwiczeń.
  const lines = records.length
    ? records.slice(0, 4).map((record) => [exerciseById(record.exerciseId)?.name ?? '', `${record.label}: ${fmtUnit(record.value, record.unit)}`])
    : workout.exercises.slice(0, 4).map((item) => [exerciseById(item.exerciseId)?.name ?? '', countOf(item.sets.length, 'seria', 'serie', 'serii', 'set', 'sets')]);
  ctx.fillStyle = colours.panel;
  ctx.beginPath();
  ctx.roundRect(PAD - 30, 1250, WIDTH - PAD * 2 + 60, 130 + lines.length * 80, 28);
  ctx.fill();
  ctx.fillStyle = colours.accent;
  ctx.font = `700 40px ${colours.body}`;
  ctx.fillText(records.length ? L(`Nowe rekordy: ${records.length}`, `New records: ${records.length}`) : L('Ćwiczenia', 'Exercises'), PAD, 1325);
  lines.forEach(([name, detail], i) => {
    const y = 1405 + i * 80;
    ctx.fillStyle = colours.ink;
    ctx.font = `600 40px ${colours.body}`;
    ctx.fillText(fit(ctx, name, 560), PAD, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = colours.ink2;
    ctx.font = `400 38px ${colours.body}`;
    ctx.fillText(fit(ctx, detail, 380), WIDTH - PAD, y);
    ctx.textAlign = 'left';
  });

  if (xp > 0 || level) {
    ctx.fillStyle = colours.ink;
    ctx.font = `700 64px ${colours.data}`;
    const parts = [xp > 0 ? `+${fmtNum(xp)} XP` : null, level ? L(`Poziom ${level}`, `Level ${level}`) : null].filter(Boolean);
    ctx.fillText(parts.join('  ·  '), PAD, 1790);
  }
  ctx.fillStyle = colours.ink2;
  ctx.font = `400 30px ${colours.body}`;
  ctx.fillText(L('Zapisane w Formie', 'Logged in Forma'), PAD, 1870);
  return canvas;
}

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

/** Podgląd karty z przyciskiem udostępniania. Obraz powstaje przed stuknięciem, bo iPhone wymaga udostępnienia od razu po dotyku. */
export async function shareCard(data) {
  const canvas = drawCard(data);
  const blob = await toBlob(canvas);
  if (!blob) {
    toast(L('Nie udało się przygotować obrazu.', 'Couldn’t create the image.'));
    return;
  }
  const file = new File([blob], 'forma-trening.png', { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const canShare = Boolean(navigator.canShare?.({ files: [file] }));
  openSheet((close) => h('div.sheet-body.share-sheet',
    h('h2.sheet-title', L('Karta treningu', 'Workout card')),
    h('img.share-preview', { src: url, alt: L(`Karta treningu ${data.workout.name}`, `Workout card for ${data.workout.name}`) }),
    canShare
      ? h('button.btn.btn-primary.btn-block', {
        type: 'button',
        onclick: () => {
          navigator.share({ files: [file] }).catch((error) => {
            if (error?.name !== 'AbortError') toast(L('Nie udało się udostępnić obrazu.', 'Couldn’t share the image.'));
          });
        },
      }, L('Udostępnij', 'Share'))
      : h('a.btn.btn-primary.btn-block', { href: url, download: 'forma-trening.png' }, L('Zapisz obraz', 'Save image')),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L('Zamknij', 'Close'))),
  { label: L('Karta treningu', 'Workout card'), onClose: () => URL.revokeObjectURL(url) });
}
