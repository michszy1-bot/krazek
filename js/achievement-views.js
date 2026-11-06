// Ekran osiągnięć w profilu.

import { h, icon, pageHeader } from './ui.js';
import { fmtNum } from './format.js';
import { ACHIEVEMENT_GROUPS, ACHIEVEMENTS, rewardTier } from './achievements.js';
import { levelProgress } from './level.js';
import { levelOptions } from './level-views.js';
import { exerciseById, state } from './store.js';

const fmtXp = (xp) => `${fmtNum(xp)} XP`;
const TOTAL_XP = ACHIEVEMENTS.reduce((sum, item) => sum + item.xp, 0);

const MISSING = {
  goal: 'Ustaw cel tygodniowy, żeby to liczyć',
  weight: 'Dodaj wagę w dzienniku wagi, żeby to liczyć',
};

/** Postęp słownie, np. 37 z 50 albo 46,2 z 100 ton. Tonaż przychodzi w kilogramach. */
function progressText({ value, target, unit = '', scale = 1 }) {
  const shown = Math.floor((value / scale) * 10) / 10;
  return `${fmtNum(shown)} z ${fmtNum(target / scale)}${unit}`;
}

function achievementRow(item, missing) {
  const needs = !item.done && missing[item.needs];
  const showProgress = !item.done && item.target > 1 && !needs;
  const share = Math.min(100, Math.floor((item.value / item.target) * 100));
  return h(`div.achievement${item.done ? '.done' : ''}`,
    h(`span.achievement-disc.tier-${rewardTier(item.xp)}`),
    h('div.shop-text',
      h('span.shop-name', item.name),
      item.detail && h('span.shop-meta', item.detail),
      needs && h('span.shop-meta', needs),
      showProgress && h('span.shop-meta', progressText(item)),
      showProgress && h('span.shop-progress', h('i', { style: `width:${share}%` }))),
    h('span.achievement-xp', { role: 'img', 'aria-label': `${item.done ? 'Zdobyte' : 'Nagroda'}: ${fmtXp(item.xp)}` },
      item.done && icon('check', 16),
      `+${fmtXp(item.xp)}`));
}

export function achievementsView() {
  const { achievements, achievementXp } = levelProgress(state.workouts, exerciseById, levelOptions());
  const missing = {
    goal: state.settings.weeklyGoal == null && MISSING.goal,
    weight: !state.bodyWeights.length && MISSING.weight,
  };
  const done = achievements.filter((item) => item.done).length;
  return h('div.page',
    pageHeader('Osiągnięcia', { back: '#/profil' }),
    h('section.shop-balance',
      h('strong', `${done} z ${achievements.length}`),
      h('span', `Zdobyte osiągnięcia dały ${fmtXp(achievementXp)} z ${fmtXp(TOTAL_XP)}.`)),
    ACHIEVEMENT_GROUPS.map((group) => h('section.block',
      h('h2.block-title', group),
      h('div.shop-list', achievements.filter((item) => item.group === group).map((item) => achievementRow(item, missing))))),
    h('p.settings-text', 'Liczą się też wcześniejsze treningi. Nagrody nie mają mnożnika za serię. Osiągnięcie wynika z historii, więc usunięcie treningu albo zmiana celu może je zabrać.'));
}
