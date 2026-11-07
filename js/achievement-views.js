// Kolekcja medali w profilu.

import { emptyState, h, openSheet, pageHeader, segmented } from './ui.js';
import { fmtDayMedium, fmtNum } from './format.js';
import { achievementDate, ACHIEVEMENT_GROUPS, groupName } from './achievements.js';
import { L } from './i18n.js';
import { badge } from './badges.js';
import { levelProgress } from './level.js';
import { levelOptions } from './level-views.js';
import { exerciseById, state } from './store.js';

const fmtXp = (xp) => `${fmtNum(xp)} XP`;

const MISSING = {
  goal: L("Ustaw cel tygodniowy, żeby to liczyć", "Set a weekly goal to track this"),
  weight: L("Dodaj wagę w dzienniku wagi, żeby to liczyć", "Add your weight in the weight log to track this"),
};

// Zakładka zostaje wybrana po powrocie ze szczegółów i z innych ekranów.
let shownTab = 'earned';

/** Postęp słownie, np. 37 z 50 albo 46,2 z 100 ton. Tonaż przychodzi w kilogramach. */
function progressText({ value, target, unit = '', scale = 1 }) {
  const shown = Math.floor((value / scale) * 10) / 10;
  return L(`${fmtNum(shown)} z ${fmtNum(target / scale)}${unit}`, `${fmtNum(shown)} of ${fmtNum(target / scale)}${unit}`);
}

const shareOf = (item) => Math.min(100, Math.floor((item.value / item.target) * 100));
const showsProgress = (item, needs) => !item.done && item.target > 1 && !needs;
const missingFor = (item, missing) => (item.done ? false : missing[item.needs]);

function medalSheet(item, missing) {
  const needs = missingFor(item, missing);
  const earnedOn = item.done && achievementDate(state.workouts, exerciseById, levelOptions(), item.id);
  const progress = showsProgress(item, needs);
  openSheet((close) => h('div.sheet-body.badge-sheet',
    badge(item, 148),
    h('h2.sheet-title', item.name),
    item.detail && h('p.badge-sheet-text', item.detail),
    needs && h('p.badge-sheet-text', needs),
    progress && h('p.badge-sheet-text', progressText(item)),
    progress && h('span.shop-progress', h('i', { style: `width:${shareOf(item)}%` })),
    earnedOn && h('p.badge-sheet-text', L(`Zdobyty ${fmtDayMedium(earnedOn)}`, `Earned ${fmtDayMedium(earnedOn)}`)),
    h(`p.badge-sheet-xp${item.done ? '.earned' : ''}`, `+${fmtXp(item.xp)}`),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L("Zamknij", "Close"))),
  { label: item.name });
}

function medalCell(item, missing) {
  const needs = missingFor(item, missing);
  return h(`button.medal${item.done ? '.earned' : ''}`, {
    type: 'button',
    'aria-label': `${item.name}. ${item.done ? L('Zdobyty', 'Earned') : L('Jeszcze do zdobycia', 'Not earned yet')}`,
    onclick: () => medalSheet(item, missing),
  },
  badge(item, 92),
  h('span.medal-plinth',
    h('span.medal-name', item.name),
    h('span.medal-pill', showsProgress(item, needs) ? `${shareOf(item)}%` : `+${fmtXp(item.xp)}`)));
}

function medalGroups(items, missing) {
  return ACHIEVEMENT_GROUPS
    .map((group) => ({ group, list: items.filter((item) => item.group === group) }))
    .filter(({ list }) => list.length > 0)
    .map(({ group, list }) => h('section.block',
      h('h2.block-title', groupName(group)),
      h('div.medal-grid', list.map((item) => medalCell(item, missing)))));
}

export function achievementsView() {
  const { achievements } = levelProgress(state.workouts, exerciseById, levelOptions());
  const missing = {
    goal: state.settings.weeklyGoal == null && MISSING.goal,
    weight: !state.bodyWeights.length && MISSING.weight,
  };
  const earned = achievements.filter((item) => item.done);
  const left = achievements.filter((item) => !item.done);
  const content = h('div.medal-content');
  const draw = () => {
    const items = shownTab === 'earned' ? earned : left;
    content.replaceChildren(...(items.length
      ? medalGroups(items, missing)
      : [emptyState(shownTab === 'earned' ? L('Jeszcze bez medali', 'No medals yet') : L('Masz wszystkie medale', 'You have every medal'), shownTab === 'earned' ? L('Zapisz trening, a pierwszy medal wpadnie od razu.', 'Save a workout and your first medal comes right away.') : L('Cała kolekcja jest zebrana.', 'The whole collection is complete.'))]));
  };
  draw();
  return h('div.page.medal-page',
    pageHeader(L('Medale', 'Medals'), { back: '#/profil' }),
    h('div.filters', segmented([
      { value: 'earned', label: L(`Zdobyte ${earned.length}`, `Earned ${earned.length}`) },
      { value: 'left', label: L(`Pozostałe ${left.length}`, `Remaining ${left.length}`) },
    ], shownTab, (value) => { shownTab = value; draw(); }, L("Które medale pokazać", "Which medals to show"))),
    content,
    h('p.settings-text', L("Liczą się też wcześniejsze treningi. Nagrody nie mają mnożnika za serię. Medal wynika z historii, więc usunięcie treningu albo zmiana celu może go zabrać.", "Earlier workouts count too. Rewards have no streak multiplier. Medals come from your history, so deleting a workout or changing your goal can take one away.")));
}
