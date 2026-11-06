// Poziomy na ekranie: sekcje profilu i wynik w podsumowaniu treningu.

import { h, icon } from './ui.js';
import { countOf, fmtMultiplier, fmtNum } from './format.js';
import { shownTitle, spendable } from './shop.js';
import { streakStatus } from './stats.js';
import { levelProgress, MAX_MUSCLE_LEVEL, strengthCategory, strengthColour, XP_GOAL, XP_RECORD, XP_WORKOUT } from './level.js';
import { strengthMap } from './muscle-map.js';
import { exerciseById, state } from './store.js';

export const levelOptions = () => ({ weeklyGoal: state.settings.weeklyGoal, bodyWeights: state.bodyWeights, shieldedWeeks: state.shop.shieldedWeeks });

/** Co jeszcze trzeba zrobić, żeby mnożnik wzrósł. */
function nextMultiplierText(next) {
  if (!next) return 'To najwyższy mnożnik. Utrzymaj serię.';
  const target = fmtMultiplier(next.multiplier);
  return next.left > 0
    ? `Jeszcze ${countOf(next.left, 'udany tydzień', 'udane tygodnie', 'udanych tygodni')} do ${target}`
    : `${target} od następnego tygodnia`;
}

/** Seria tygodni i mnożnik XP w karcie poziomu. */
function streakBlock() {
  const status = streakStatus(state.workouts, state.settings.weeklyGoal, state.shop.shieldedWeeks);
  if (!status) return h('p.level-meta', h('span', 'Ustaw cel tygodniowy, żeby liczyć serię tygodni i mnożnik XP.'));
  return [
    h('p.level-streak',
      h('span', `Seria: ${countOf(status.streak, 'tydzień', 'tygodnie', 'tygodni')} z rzędu`),
      h(`strong${status.multiplier > 1 ? '.on' : ''}`, `XP ${fmtMultiplier(status.multiplier)}`)),
    h('p.level-meta', h('span', nextMultiplierText(status.next))),
  ];
}

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
    h('span.level-row-detail', strengthCategory(row.level)),
    xpBar(`${row.muscle}, postęp poziomu ${row.level}`, row.share, null, strengthColour(row.level)),
    h('span.level-row-detail', `${percent(row.ratio)}% masy ciała · ${row.exercise}`),
    row.nextRatio != null && h('span.level-row-detail', `Poziom ${row.level + 1} od ${Math.ceil(row.nextRatio * 100)}%`));
}

/** Poziom główny, mapa siły i poziomy partii, czyli górna część profilu. */
export function levelSections(onAddWeight) {
  const progress = levelProgress(state.workouts, exerciseById, levelOptions());
  return [
    h('section.level-line',
      shownTitle(state.shop) && h('p.level-title', shownTitle(state.shop)),
      h('p.level-line-top', h('strong', `Poziom ${progress.level}`), h('span', nextText(progress))),
      xpBar(`Postęp poziomu ${progress.level}`, progress.share),
      h('p.level-meta', `${fmtNum(progress.xp)} XP`),
      streakBlock()),
    h('a.link-row', { href: '#/sklep' },
      h('span.link-text',
        h('span.link-name', 'Sklep'),
        h('span.link-meta', `${fmtNum(spendable(progress.xp, state.shop))} XP do wydania`)),
      h('span.flip', icon('back', 20))),
    h('section.block',
      h('h2.block-title', 'Siła partii'),
      state.bodyWeights.length
        ? [strengthMap(progress.muscles), h('h3.list-label', 'Od najsłabszej'), h('ul.level-list', progress.muscles.map(muscleRow))]
        : h('button.notice', { type: 'button', onclick: onAddWeight },
          h('strong', 'Dodaj swoją wagę'),
          h('span', 'Siłę partii liczę jako procent masy ciała, więc potrzebny jest choć jeden wpis w dzienniku wagi.')),
      state.bodyWeights.length > 0 && h('p.settings-text', `Poziomy 1–${MAX_MUSCLE_LEVEL} to najlepszy szacowany ciężar maksymalny względem wagi z dnia treningu, z poprawką na to, że siła rośnie wolniej niż masa ciała. Najpierw liczą się wolne ciężary, potem maszyny i wyciągi, a na końcu ćwiczenia na nogi, w których partia tylko pomaga, np. wykroki dla pośladków. Te ostatnie dają jej tylko 10% wyniku. Normy dla mężczyzn są orientacyjne, a dla ćwiczeń innych niż główne szacunkowe. Własne ćwiczenia i te bez obciążenia się nie liczą.`)),
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
      h('li', h('span', goal == null ? 'Wykonany cel tygodniowy (nie masz ustawionego celu)' : 'Wykonany cel tygodniowy'), h('strong', `${XP_GOAL} XP`)),
      h('li', h('span', 'Seria tygodni: co 4 tygodnie z rzędu mnożnik rośnie o 0,1'), h('strong', `do ${fmtMultiplier(1.5)}`))),
    h('p.settings-text', 'Mnożnik działa na całe XP z danego tygodnia i zależy od serii sprzed tego tygodnia. Tydzień bez celu zeruje serię, chyba że masz tarczę.'),
    h('p.settings-text', 'Rozgrzewka się nie liczy. Wszystko wynika z historii, więc usunięcie treningu albo podniesienie celu może obniżyć wynik.'));
}

/** Wynik treningu w podsumowaniu. Bez punktów nie ma czego pokazywać. */
export function levelGainBlock({ xp, multiplier, before, after, muscleUps }) {
  if (!(xp > 0)) return null;
  const leveledUp = after.level > before.level;
  return h('div.level-gain',
    h('p.level-line-top', h('strong.level-gain-xp', `+${fmtNum(xp)} XP`), h('span', leveledUp ? `Nowy poziom: ${after.level}!` : nextText(after))),
    xpBar(`Postęp poziomu ${after.level}`, after.share, leveledUp ? 0 : before.share),
    multiplier > 1 && h('p.level-meta', `Z mnożnikiem za serię tygodni: ${fmtMultiplier(multiplier)}`),
    muscleUps.length > 0 && h('p.level-meta', `Siła: ${muscleUps.map((row) => `${row.muscle} ${row.level}`).join(' · ')}`));
}
