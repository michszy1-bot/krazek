// Sezony po 4 miesiące: styczeń–kwiecień, maj–sierpień i wrzesień–grudzień.
// Medal sezonu zależy od liczby treningów. XP za medale liczy się od sezonu, w którym pojawiły się w aplikacji.

import { L } from './i18n.js';
import { isWorking, workingSetCount, workoutVolume } from './stats.js';

export const SEASON_MONTHS = 4;
export const SEASONS_FROM = new Date(2026, 8, 1).getTime();

/** Progi medalu sezonu. XP daje tylko najwyższy zdobyty próg. */
export const SEASON_TIERS = [
  { id: 'bronze', workouts: 16, xp: 150, name: L('Brąz', 'Bronze'), goal: L('do brązowego medalu', 'to bronze') },
  { id: 'silver', workouts: 32, xp: 400, name: L('Srebro', 'Silver'), goal: L('do srebrnego medalu', 'to silver') },
  { id: 'gold', workouts: 48, xp: 1000, name: L('Złoto', 'Gold'), goal: L('do złotego medalu', 'to gold') },
];

const MONTH_RANGES = [
  L('styczeń–kwiecień', 'January–April'),
  L('maj–sierpień', 'May–August'),
  L('wrzesień–grudzień', 'September–December'),
];

/** Sezon, w którym leży podany moment. */
export function seasonOf(time) {
  const date = new Date(time);
  const index = Math.floor(date.getMonth() / SEASON_MONTHS);
  const year = date.getFullYear();
  const start = new Date(year, index * SEASON_MONTHS, 1);
  const end = new Date(year, (index + 1) * SEASON_MONTHS, 1);
  return {
    key: `${year}-${index + 1}`,
    year,
    index,
    start: start.getTime(),
    end: end.getTime(),
    name: L(`Sezon ${MONTH_RANGES[index]} ${year}`, `Season ${MONTH_RANGES[index]} ${year}`),
  };
}

/** Sezon bezpośrednio przed podanym. */
export const previousSeason = (season) => seasonOf(season.start - 86400000);

/** Najwyższy zdobyty próg i następny do zdobycia. */
export function seasonTier(workoutCount) {
  const reached = SEASON_TIERS.filter((tier) => workoutCount >= tier.workouts);
  return { tier: reached.at(-1) ?? null, next: SEASON_TIERS[reached.length] ?? null };
}

/** Liczby sezonu do podanego momentu (domyślnie do końca sezonu). Trening liczy się, gdy ma serię roboczą. */
export function seasonTotals(workouts, season, recordEntries = [], until = season.end) {
  const end = Math.min(until, season.end);
  const inSeason = workouts.filter((w) => w.startedAt >= season.start && w.startedAt < end
    && w.exercises.some((item) => item.sets.some(isWorking)));
  return {
    workouts: inSeason.length,
    volume: inSeason.reduce((sum, w) => sum + workoutVolume(w), 0),
    sets: inSeason.reduce((sum, w) => sum + workingSetCount(w), 0),
    records: recordEntries.filter((entry) => entry.date >= season.start && entry.date < end).length,
  };
}

/** Medale sezonów od wprowadzenia sezonów: [{ season, tier }]. */
export function seasonMedals(workouts, now = Date.now()) {
  const medals = [];
  const latest = Math.max(now, ...workouts.map((w) => w.startedAt));
  for (let season = seasonOf(SEASONS_FROM); season.start <= latest; season = seasonOf(season.end)) {
    const { tier } = seasonTier(seasonTotals(workouts, season).workouts);
    if (tier) medals.push({ season, tier });
  }
  return medals;
}

export const seasonXp = (medals) => medals.reduce((sum, { tier }) => sum + tier.xp, 0);

/** Sezony z treningami, od najnowszego, z wynikami i medalem. */
export function seasonHistory(workouts, recordEntries = [], now = Date.now()) {
  if (!workouts.length) return [];
  const first = Math.min(...workouts.map((w) => w.startedAt));
  const list = [];
  for (let season = seasonOf(now); season.end > first; season = previousSeason(season)) {
    const totals = seasonTotals(workouts, season, recordEntries);
    if (totals.workouts) list.push({ season, totals, ...seasonTier(totals.workouts), counts: season.start >= seasonOf(SEASONS_FROM).start });
  }
  return list;
}
