// Ekran osiągnięć w profilu.

import { h, icon, pageHeader } from './ui.js';
import { fmtNum } from './format.js';
import { ACHIEVEMENT_GROUPS, ACHIEVEMENTS, rewardTier } from './achievements.js';
import { levelProgress } from './level.js';
import { levelOptions } from './level-views.js';
import { exerciseById, state } from './store.js';

const fmtXp = (xp) => `${fmtNum(xp)} XP`;
const TOTAL_XP = ACHIEVEMENTS.reduce((sum, item) => sum + item.xp, 0);

/** Postęp słownie, np. 37 z 50 albo 46,2 z 100 ton. Tonaż przychodzi w kilogramach. */
function progressText({ value, target, unit, scale = 1 }) {
  const shown = Math.floor((value / scale) * 10) / 10;
  return `${fmtNum(shown)} z ${fmtNum(target / scale)}${unit ? ` ${unit}` : ''}`;
}

function achievementRow(item, noGoal) {
  const needsGoal = noGoal && item.stat === 'streak';
  const showProgress = !item.done && item.target > 1 && !needsGoal;
  const share = Math.min(100, Math.floor((item.value / item.target) * 100));
  return h(`div.achievement${item.done ? '.done' : ''}`,
    h(`span.achievement-disc.tier-${rewardTier(item.xp)}`),
    h('div.shop-text',
      h('span.shop-name', item.name),
      item.detail && h('span.shop-meta', item.detail),
      needsGoal && h('span.shop-meta', 'Ustaw cel tygodniowy, żeby liczyć serię'),
      showProgress && h('span.shop-meta', progressText(item)),
      showProgress && h('span.shop-progress', h('i', { style: `width:${share}%` }))),
    h('span.achievement-xp', { role: 'img', 'aria-label': `${item.done ? 'Zdobyte' : 'Nagroda'}: ${fmtXp(item.xp)}` },
      item.done && icon('check', 16),
      `+${fmtXp(item.xp)}`));
}

export function achievementsView() {
  const { achievements, achievementXp } = levelProgress(state.workouts, exerciseById, levelOptions());
  const noGoal = state.settings.weeklyGoal == null;
  const done = achievements.filter((item) => item.done).length;
  return h('div.page',
    pageHeader('Osiągnięcia', { back: '#/profil' }),
    h('section.shop-balance',
      h('strong', `${done} z ${achievements.length}`),
      h('span', `Zdobyte osiągnięcia dały ${fmtXp(achievementXp)} z ${fmtXp(TOTAL_XP)}.`)),
    ACHIEVEMENT_GROUPS.map((group) => h('section.block',
      h('h2.block-title', group),
      h('div.shop-list', achievements.filter((item) => item.group === group).map((item) => achievementRow(item, noGoal))))),
    h('p.settings-text', 'Liczą się też wcześniejsze treningi. Nagrody nie mają mnożnika za serię. Osiągnięcie wynika z historii, więc usunięcie treningu albo zmiana celu może je zabrać.'));
}
