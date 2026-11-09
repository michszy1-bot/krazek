// Zadania tygodnia, pierwsze kroki i sezon w profilu oraz skrót zadań na ekranie Trening.

import { h } from './ui.js';
import { badge, seasonBadgeItem } from './badges.js';
import { countOf, fmtNum, fmtVolume } from './format.js';
import { L } from './i18n.js';
import { exerciseById, state } from './store.js';
import { FIRST_STEPS, firstStepsDone, liveFirstSteps, weekQuests, XP_FIRST_STEP } from './quests.js';
import { previousSeason, seasonHistory, seasonOf, seasonTier, seasonTotals } from './seasons.js';
import { recordTimeline } from './stats.js';

const DAY = 86400000;

const progressBar = (label, share) => h('span.xp-bar', {
  role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(share * 100)),
}, h('span.xp-fill', { style: `width:${Math.round(Math.min(1, share) * 100)}%` }));

const questAmount = (value, unit) => (unit === 'kg' ? fmtVolume(value) : fmtNum(value));

/** Zadania bieżącego tygodnia. records można podać, żeby nie liczyć historii rekordów drugi raz. */
export function currentQuests(records = recordTimeline(state.workouts, exerciseById)) {
  return weekQuests(state.workouts, exerciseById, new Date(), { weeklyGoal: state.settings.weeklyGoal, records });
}

export function questsSection(records) {
  const quests = currentQuests(records);
  const done = quests.filter((quest) => quest.done).length;
  return h('section.block',
    h('div.block-head',
      h('h2.block-title', L('Zadania tygodnia', 'Weekly quests')),
      h('span.block-meta', L(`${done} z ${quests.length}`, `${done} of ${quests.length}`))),
    h('ul.quest-list', quests.map((quest) => h(`li.quest${quest.done ? '.done' : ''}`,
      h('span.quest-check', { 'aria-hidden': 'true' }, quest.done ? '✓' : ''),
      h('span.quest-text',
        h('span.quest-title', quest.title),
        !quest.done && progressBar(L(`Postęp: ${quest.title}`, `Progress: ${quest.title}`), quest.progress / quest.target),
        h('span.quest-meta', quest.done
          ? L('Wykonane', 'Done')
          : `${questAmount(quest.progress, quest.unit)} / ${questAmount(quest.target, quest.unit)}`)),
      h('span.quest-xp', `+${fmtNum(quest.xp)} XP`)))),
    h('p.settings-text', L('Nowe zadania w każdy poniedziałek. Postęp liczy się z treningów zapisanych w tym tygodniu.', 'New quests every Monday. Progress counts workouts saved this week.')));
}

/** Lista pierwszych kroków. Znika, gdy wszystkie są wykonane. */
export function firstStepsSection() {
  const done = new Set(firstStepsDone(state.settings.firstSteps, liveFirstSteps(state)));
  if (done.size === FIRST_STEPS.length) return null;
  return h('section.block',
    h('div.block-head',
      h('h2.block-title', L('Pierwsze kroki', 'First steps')),
      h('span.block-meta', L(`${done.size} z ${FIRST_STEPS.length} · ${XP_FIRST_STEP} XP za każdy`, `${done.size} of ${FIRST_STEPS.length} · ${XP_FIRST_STEP} XP each`))),
    h('ul.quest-list', FIRST_STEPS.map((step) => h(`li.quest${done.has(step.id) ? '.done' : ''}`,
      h('span.quest-check', { 'aria-hidden': 'true' }, done.has(step.id) ? '✓' : ''),
      h('span.quest-text',
        h('span.quest-title', step.title),
        !done.has(step.id) && h('span.quest-meta', step.hint)),
      h('span.quest-xp', `+${XP_FIRST_STEP} XP`)))));
}

/** Różnica względem poprzedniego sezonu w tym samym momencie sezonu, np. +3 albo −1,2 t. */
function delta(now, before, format) {
  const diff = now - before;
  if (!diff) return L('tyle samo', 'same');
  return `${diff > 0 ? '+' : '−'}${format(Math.abs(diff))}`;
}

function seasonStat(label, value, change) {
  return h('div.stat',
    h('span.stat-value', value),
    h('span.stat-label', label),
    change && h('span.stat-change', change));
}

/** Bieżący sezon: medal, postęp do następnego progu i porównanie z poprzednim sezonem. */
export function seasonSection(records = recordTimeline(state.workouts, exerciseById)) {
  if (!state.workouts.length) return null;
  const now = Date.now();
  const season = seasonOf(now);
  const totals = seasonTotals(state.workouts, season, records, now);
  const previous = previousSeason(season);
  const before = seasonTotals(state.workouts, previous, records, previous.start + (now - season.start));
  const hadPrevious = seasonTotals(state.workouts, previous, records).workouts > 0;
  const { tier, next } = seasonTier(totals.workouts);
  const daysLeft = Math.ceil((season.end - now) / DAY);
  // Zdobyty medal w kolorze, a przed pierwszym progiem przyciemniony brąz jako cel.
  const shown = tier ?? next;
  const history = seasonHistory(state.workouts, records, now).filter((entry) => entry.season.key !== season.key);
  const change = (value, old, format = fmtNum) => (hadPrevious ? delta(value, old, format) : null);

  return h('section.block',
    h('div.block-head',
      h('h2.block-title', L('Sezon', 'Season')),
      h('span.block-meta', L(`Zostało ${countOf(daysLeft, 'dzień', 'dni', 'dni')}`, `${countOf(daysLeft, '', '', '', 'day', 'days')} left`))),
    h('div.season-card',
      badge(seasonBadgeItem(season, shown, Boolean(tier)), 72),
      h('div.season-text',
        h('strong.season-name', season.name),
        h('span.season-tier', tier ? L(`Medal: ${tier.name.toLowerCase()}`, `Medal: ${tier.name.toLowerCase()}`) : L('Jeszcze bez medalu', 'No medal yet')),
        next && progressBar(L(`Postęp ${next.goal}`, `Progress ${next.goal}`), totals.workouts / next.workouts),
        h('span.quest-meta', next
          ? L(`${totals.workouts} z ${next.workouts} treningów ${next.goal} (+${fmtNum(next.xp)} XP)`, `${totals.workouts} of ${next.workouts} workouts ${next.goal} (+${fmtNum(next.xp)} XP)`)
          : L('Najwyższy medal sezonu zdobyty', 'Top season medal earned')))),
    h('div.stats.season-stats',
      seasonStat(L('Treningi', 'Workouts'), fmtNum(totals.workouts), change(totals.workouts, before.workouts)),
      seasonStat(L('Objętość', 'Volume'), fmtVolume(totals.volume), change(totals.volume, before.volume, fmtVolume)),
      seasonStat(L('Rekordy', 'Records'), fmtNum(totals.records), change(totals.records, before.records))),
    h('p.settings-text', hadPrevious
      ? L('Zmiany to porównanie z poprzednim sezonem w tym samym dniu sezonu. Medal daje XP tylko za najwyższy zdobyty próg.', 'Changes compare with the previous season on the same day of the season. A medal gives XP only for the highest tier reached.')
      : L('Sezon trwa 4 miesiące. Medal daje XP tylko za najwyższy zdobyty próg.', 'A season lasts 4 months. A medal gives XP only for the highest tier reached.')),
    history.length > 0 && h('h3.list-label', L('Poprzednie sezony', 'Past seasons')),
    history.length > 0 && h('ul.season-list', history.map(({ season: past, totals: pastTotals, tier: pastTier, counts }) => h('li',
      pastTier ? badge(seasonBadgeItem(past, pastTier, true), 40) : h('span.season-empty', { 'aria-hidden': 'true' }),
      h('span.quest-text',
        h('span.quest-title', past.name),
        h('span.quest-meta', `${countOf(pastTotals.workouts, 'trening', 'treningi', 'treningów', 'workout', 'workouts')} · ${fmtVolume(pastTotals.volume)}`)),
      h('span.quest-xp', pastTier ? (counts ? pastTier.name : L(`${pastTier.name}, bez XP`, `${pastTier.name}, no XP`)) : '–')))));
}

/** Skrót zadań na ekranie Trening: ile wykonane, z przejściem do profilu. */
export function questStrip() {
  const quests = currentQuests();
  const done = quests.filter((quest) => quest.done).length;
  return h('a.quest-strip', { href: '#/profil', 'aria-label': L(`Zadania tygodnia: wykonane ${done} z ${quests.length}. Otwórz profil`, `Weekly quests: ${done} of ${quests.length} done. Open Profile`) },
    h('span.quest-strip-title', L('Zadania tygodnia', 'Weekly quests')),
    h('span.quest-dots', { 'aria-hidden': 'true' }, quests.map((quest) => h(`span.quest-dot${quest.done ? '.done' : ''}`))),
    h('span.quest-strip-count', `${done}/${quests.length}`));
}
