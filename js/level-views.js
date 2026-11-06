// Poziomy na ekranie: pasek na ekranie Trening, szczegóły i wynik w podsumowaniu treningu.

import { h, iconButton, openSheet } from './ui.js';
import { fmtNum } from './format.js';
import { levelProgress, MAX_MUSCLE_LEVEL, XP_GOAL, XP_RECORD, XP_WORKOUT } from './level.js';
import { exerciseById, state } from './store.js';

export const levelOptions = () => ({ weeklyGoal: state.settings.weeklyGoal, bodyWeights: state.bodyWeights });

const current = () => levelProgress(state.workouts, exerciseById, levelOptions());
const percent = (share) => Math.round(share * 100);

function xpBar(label, share, from = null) {
  const to = percent(share);
  const style = from == null
    ? `width:${to}%`
    : `width:${to}%;--xp-from:${percent(from)}%;--xp-to:${to}%`;
  return h('span.xp-bar', { role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(to) },
    h(`span.xp-fill${from == null ? '' : '.xp-fill-gain'}`, { style }));
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
    xpBar(`${row.muscle}, postęp poziomu ${row.level}`, row.share),
    h('span.level-row-detail', `${percent(row.ratio)}% masy ciała · ${row.exercise}`),
    row.nextRatio != null && h('span.level-row-detail', `Poziom ${row.level + 1} od ${Math.ceil(row.nextRatio * 100)}%`));
}

function levelSheet() {
  const progress = current();
  const goal = state.settings.weeklyGoal;
  const hasWeight = state.bodyWeights.length > 0;
  openSheet((close) => h('div.sheet-body',
    h('div.sheet-head.sheet-head-flush', h('h2.sheet-title', `Poziom ${progress.level}`), iconButton('close', 'Zamknij', close)),
    h('div.level-main',
      xpBar(`Postęp poziomu ${progress.level}`, progress.share),
      h('p.level-meta', h('span', `${fmtNum(progress.xp)} XP`), h('span', nextText(progress)))),
    h('h3.list-label', 'Siła partii, od najsłabszej'),
    hasWeight
      ? h('ul.level-list', progress.muscles.map(muscleRow))
      : h('a.notice', { href: '#/profil', onclick: close },
        h('strong', 'Dodaj swoją wagę'),
        h('span', 'Siłę partii liczę jako procent masy ciała, więc potrzebny jest choć jeden wpis w dzienniku wagi.')),
    hasWeight && h('p.settings-text', `Poziomy 1–${MAX_MUSCLE_LEVEL} to najlepszy szacowany ciężar maksymalny względem wagi z dnia treningu. Normy są orientacyjne, a przy maszynach szczególnie, bo ich ciężary się różnią. Własne ćwiczenia i te bez obciążenia się nie liczą.`),
    h('h3.list-label', 'Za co są punkty XP'),
    h('ul.level-rules',
      h('li', h('span', 'Trening, raz dziennie'), h('strong', `${XP_WORKOUT} XP`)),
      h('li', h('span', 'Seria robocza, do 16 serii partii w tygodniu'), h('strong', '5 XP')),
      h('li', h('span', 'Seria na nogi, do 8 serii partii w tygodniu'), h('strong', '10 XP')),
      h('li', h('span', 'Nowy rekord w ćwiczeniu'), h('strong', `${XP_RECORD} XP`)),
      h('li', h('span', goal == null ? 'Wykonany cel tygodniowy (nie masz ustawionego celu)' : 'Wykonany cel tygodniowy'), h('strong', `${XP_GOAL} XP`))),
    h('p.settings-text', 'Rozgrzewka się nie liczy. Wszystko wynika z historii, więc usunięcie treningu albo podniesienie celu może obniżyć wynik.')),
  { label: `Poziom ${progress.level}` });
}

/** Pasek poziomu na ekranie Trening. */
export function levelLine() {
  const progress = current();
  return h('button.level-line', { type: 'button', onclick: levelSheet, 'aria-label': `Poziom ${progress.level}, ${nextText(progress)}. Pokaż szczegóły` },
    h('span.level-line-top', h('strong', `Poziom ${progress.level}`), h('span', nextText(progress))),
    xpBar(`Postęp poziomu ${progress.level}`, progress.share));
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
