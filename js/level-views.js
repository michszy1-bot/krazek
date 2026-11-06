// Poziomy na ekranie: sekcje profilu i wynik w podsumowaniu treningu.

import { h, segmented } from './ui.js';
import { countOf, fmtNum } from './format.js';
import { MUSCLES } from './exercises.js';
import { levelProgress, MAX_MUSCLE_LEVEL, strengthColour, XP_GOAL, XP_RECORD, XP_WORKOUT } from './level.js';
import { muscleMap, strengthMap } from './muscle-map.js';
import { muscleSets, neglectedMuscles } from './stats.js';
import { exerciseById, state } from './store.js';

const MAP_DAYS = 7;
const WHOLE_BODY = 'Całe ciało';
const MAP_MODES = [
  { value: 'strength', label: 'Siła' },
  { value: 'sets', label: `Serie z ${MAP_DAYS} dni` },
];
let mapMode = 'strength';

export const levelOptions = () => ({ weeklyGoal: state.settings.weeklyGoal, bodyWeights: state.bodyWeights });

const percent = (share) => Math.round(share * 100);

function xpBar(label, share, from = null, colour = null) {
  const to = percent(share);
  const style = from == null
    ? `width:${to}%`
    : `width:${to}%;--xp-from:${percent(from)}%;--xp-to:${to}%`;
  return h('span.xp-bar', { role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(to) },
    h(`span.xp-fill${from == null ? '' : '.xp-fill-gain'}${colour ? `.muscle-${colour}` : ''}`, { style }));
}

const nextText = ({ level, toNext }) => `${fmtNum(toNext)} XP do poziomu ${level + 1}`;

function muscleRow(row) {
  if (row.level == null) {
    return h('li.level-row',
      h('span.level-row-name', row.muscle),
      h('span.level-row-value', 'Brak wyniku'));
  }
  return h('li.level-row',
    h('span.level-row-name', row.muscle),
    h('span.level-row-value', `Poziom ${row.level}`),
    xpBar(`${row.muscle}, postęp poziomu ${row.level}`, row.share, null, strengthColour(row.level)),
    h('span.level-row-detail', `${percent(row.ratio)}% masy ciała · ${row.exercise}`),
    row.nextRatio != null && h('span.level-row-detail', `Poziom ${row.level + 1} od ${Math.ceil(row.nextRatio * 100)}%`));
}

const neglectText = ({ muscle, days }) => (days === null
  ? `${muscle}: jeszcze bez serii`
  : `${muscle}: ${countOf(days, 'dzień', 'dni', 'dni')} temu`);

/** Mapa pokazuje siłę albo serie. Serie i zaniedbane partie zawsze z ostatnich dni, bo to podpowiedź, co robić dalej. */
function musclesSection(strengthRows) {
  const rows = muscleSets(state.workouts, exerciseById, Date.now() - MAP_DAYS * 86400000);
  const wholeBody = rows.find((row) => row.muscle === WHOLE_BODY)?.sets ?? 0;
  const neglected = neglectedMuscles(state.workouts, exerciseById, MUSCLES.filter((m) => m !== WHOLE_BODY), new Date(), MAP_DAYS);
  const host = h('div');
  const draw = (mode) => {
    host.replaceChildren(
      mode === 'strength' ? strengthMap(strengthRows) : muscleMap(rows),
      ...(mode === 'sets' && wholeBody > 0 ? [h('p.settings-text', `Ćwiczenia na całe ciało: ${countOf(wholeBody, 'seria', 'serie', 'serii')}. Nie ma ich na mapie.`)] : []),
    );
  };
  // Bez wagi nie ma poziomów siły, więc mapa zaczyna od serii.
  const start = state.bodyWeights.length ? mapMode : 'sets';
  draw(start);
  return h('section.block',
    h('h2.block-title', 'Mapa mięśni'),
    h('div.filters', segmented(MAP_MODES, start, (mode) => { mapMode = mode; draw(mode); }, 'Co pokazuje mapa')),
    host,
    h('h2.block-title.chart-second-title', 'Zaniedbane partie'),
    neglected.length
      ? h('ul.neglected', neglected.map((row) => h('li', neglectText(row))))
      : h('p.settings-text', `Każda partia była trenowana w ostatnich ${MAP_DAYS} dniach.`));
}

/** Poziom główny, mapa mięśni i siła partii, czyli górna część profilu. */
export function levelSections(onAddWeight) {
  const progress = levelProgress(state.workouts, exerciseById, levelOptions());
  return [
    h('section.level-line',
      h('p.level-line-top', h('strong', `Poziom ${progress.level}`), h('span', nextText(progress))),
      xpBar(`Postęp poziomu ${progress.level}`, progress.share),
      h('p.level-meta', `${fmtNum(progress.xp)} XP`)),
    musclesSection(progress.muscles),
    h('section.block',
      h('h2.block-title', 'Siła partii, od najsłabszej'),
      state.bodyWeights.length
        ? h('ul.level-list', progress.muscles.map(muscleRow))
        : h('button.notice', { type: 'button', onclick: onAddWeight },
          h('strong', 'Dodaj swoją wagę'),
          h('span', 'Siłę partii liczę jako procent masy ciała, więc potrzebny jest choć jeden wpis w dzienniku wagi.')),
      state.bodyWeights.length > 0 && h('p.settings-text', `Poziomy 1–${MAX_MUSCLE_LEVEL} to najlepszy szacowany ciężar maksymalny względem wagi z dnia treningu. Normy są orientacyjne, a przy maszynach szczególnie, bo ich ciężary się różnią. Własne ćwiczenia i te bez obciążenia się nie liczą.`)),
  ];
}

/** Zasady punktacji, na dole profilu. */
export function pointsSection() {
  const goal = state.settings.weeklyGoal;
  return h('section.block',
    h('h2.block-title', 'Za co są punkty XP'),
    h('ul.level-rules',
      h('li', h('span', 'Trening, raz dziennie'), h('strong', `${XP_WORKOUT} XP`)),
      h('li', h('span', 'Seria robocza, do 16 serii partii w tygodniu'), h('strong', '5 XP')),
      h('li', h('span', 'Seria na nogi, do 8 serii partii w tygodniu'), h('strong', '10 XP')),
      h('li', h('span', 'Nowy rekord w ćwiczeniu'), h('strong', `${XP_RECORD} XP`)),
      h('li', h('span', goal == null ? 'Wykonany cel tygodniowy (nie masz ustawionego celu)' : 'Wykonany cel tygodniowy'), h('strong', `${XP_GOAL} XP`))),
    h('p.settings-text', 'Rozgrzewka się nie liczy. Wszystko wynika z historii, więc usunięcie treningu albo podniesienie celu może obniżyć wynik.'));
}

/** Wynik treningu w podsumowaniu. Bez punktów nie ma czego pokazywać. */
export function levelGainBlock({ xp, before, after, muscleUps }) {
  if (!(xp > 0)) return null;
  const leveledUp = after.level > before.level;
  return h('div.level-gain',
    h('p.level-line-top', h('strong.level-gain-xp', `+${fmtNum(xp)} XP`), h('span', leveledUp ? `Nowy poziom: ${after.level}!` : nextText(after))),
    xpBar(`Postęp poziomu ${after.level}`, after.share, leveledUp ? 0 : before.share),
    muscleUps.length > 0 && h('p.level-meta', `Siła: ${muscleUps.map((row) => `${row.muscle} ${row.level}`).join(' · ')}`));
}
