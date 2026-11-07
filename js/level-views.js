// Poziomy na ekranie: sekcje profilu i wynik w podsumowaniu treningu.

import { h, icon } from './ui.js';
import { badge } from './badges.js';
import { countOf, fmtMultiplier, fmtNum } from './format.js';
import { L } from './i18n.js';
import { muscleName } from './exercises.js';
import { shownTitle, spendable } from './shop.js';
import { streakStatus } from './stats.js';
import { levelProgress, MAX_MUSCLE_LEVEL, strengthCategory, strengthColour, XP_GOAL, XP_RECORD, XP_WORKOUT } from './level.js';
import { strengthMap } from './muscle-map.js';
import { exerciseById, state } from './store.js';

export const levelOptions = () => ({ weeklyGoal: state.settings.weeklyGoal, bodyWeights: state.bodyWeights, shieldedWeeks: state.shop.shieldedWeeks });

/** Co jeszcze trzeba zrobić, żeby mnożnik wzrósł. */
function nextMultiplierText(next) {
  if (!next) return L("To najwyższy mnożnik. Utrzymaj serię.", "This is the top multiplier. Keep the streak going.");
  const target = fmtMultiplier(next.multiplier);
  return next.left > 0
    ? L(`Jeszcze ${countOf(next.left, 'udany tydzień', 'udane tygodnie', 'udanych tygodni')} do ${target}`, `${countOf(next.left, '', '', '', 'more successful week', 'more successful weeks')} to ${target}`)
    : L(`${target} od następnego tygodnia`, `${target} from next week`);
}

/** Seria tygodni i mnożnik XP w karcie poziomu. */
function streakBlock() {
  const status = streakStatus(state.workouts, state.settings.weeklyGoal, state.shop.shieldedWeeks);
  if (!status) return h('p.level-meta', h('span', L("Ustaw cel tygodniowy, żeby liczyć serię tygodni i mnożnik XP.", "Set a weekly goal to track your week streak and XP multiplier.")));
  return [
    h('p.level-streak',
      h('span', L(`Seria: ${countOf(status.streak, 'tydzień', 'tygodnie', 'tygodni')} z rzędu`, `Streak: ${countOf(status.streak, '', '', '', 'week', 'weeks')} in a row`)),
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

const nextText = ({ level, toNext }) => L(`${fmtNum(toNext)} XP do poziomu ${level + 1}`, `${fmtNum(toNext)} XP to level ${level + 1}`);

function muscleRow(row) {
  if (row.level == null) {
    return h('li.level-row',
      h('span.level-row-name', muscleName(row.muscle)),
      h('span.level-row-value', L('Brak wyniku', 'No result')));
  }
  return h('li.level-row',
    h('span.level-row-name', muscleName(row.muscle)),
    h('span.level-row-value', L(`Poziom ${row.level}`, `Level ${row.level}`)),
    h('span.level-row-detail', strengthCategory(row.level)),
    xpBar(L(`${row.muscle}, postęp poziomu ${row.level}`, `${muscleName(row.muscle)}, level ${row.level} progress`), row.share, null, strengthColour(row.level)),
    h('span.level-row-detail', L(`${percent(row.ratio)}% masy ciała · ${row.exercise}`, `${percent(row.ratio)}% of body weight · ${row.exercise}`)),
    row.nextRatio != null && h('span.level-row-detail', L(`Poziom ${row.level + 1} od ${Math.ceil(row.nextRatio * 100)}%`, `Level ${row.level + 1} from ${Math.ceil(row.nextRatio * 100)}%`)));
}

const levelLink = (href, name, label) => h('a.level-link', { href, 'aria-label': label, title: label }, icon(name, 22));

/** Poziom główny, mapa siły i poziomy partii, czyli górna część profilu. */
export function levelSections(onAddWeight) {
  const progress = levelProgress(state.workouts, exerciseById, levelOptions());
  return [
    h('section.level-line',
      shownTitle(state.shop) && h('p.level-title', shownTitle(state.shop)),
      h('div.level-head',
        h('strong.level-name', L(`Poziom ${progress.level}`, `Level ${progress.level}`)),
        levelLink('#/osiagniecia', 'trophy', L(`Medale, zdobyte: ${progress.achievements.filter((item) => item.done).length} z ${progress.achievements.length}`, `Medals, earned: ${progress.achievements.filter((item) => item.done).length} of ${progress.achievements.length}`)),
        levelLink('#/sklep', 'bag', L(`Sklep, do wydania: ${fmtNum(spendable(progress.xp, state.shop))} XP`, `Shop, to spend: ${fmtNum(spendable(progress.xp, state.shop))} XP`))),
      xpBar(L(`Postęp poziomu ${progress.level}`, `Level ${progress.level} progress`), progress.share),
      h('p.level-meta', h('span', `${fmtNum(progress.xp)} XP`), h('span', nextText(progress))),
      streakBlock()),
    h('section.block',
      h('h2.block-title', L("Siła partii", "Muscle strength")),
      state.bodyWeights.length
        ? [strengthMap(progress.muscles), h('h3.list-label', L("Od najsłabszej", "Weakest first")), h('ul.level-list', progress.muscles.map(muscleRow))]
        : h('button.notice', { type: 'button', onclick: onAddWeight },
          h('strong', L("Dodaj swoją wagę", "Add your weight")),
          h('span', L("Siłę partii liczę jako procent masy ciała, więc potrzebny jest choć jeden wpis w dzienniku wagi.", "Muscle strength is measured as a percentage of body weight, so you need at least one entry in the weight log."))),
      state.bodyWeights.length > 0 && h('p.settings-text', L(`Poziomy 1–${MAX_MUSCLE_LEVEL} to najlepszy szacowany ciężar maksymalny względem wagi z dnia treningu, z poprawką na to, że siła rośnie wolniej niż masa ciała. Najpierw liczą się wolne ciężary, potem maszyny i wyciągi, a na końcu ćwiczenia na nogi, w których partia tylko pomaga, np. wykroki dla pośladków. Te ostatnie dają jej tylko 10% wyniku. Normy dla mężczyzn są orientacyjne, a dla ćwiczeń innych niż główne szacunkowe. Własne ćwiczenia i te bez obciążenia się nie liczą.`, `Levels 1–${MAX_MUSCLE_LEVEL} are your best estimated one-rep max relative to your weight on the day, adjusted because strength grows more slowly than body weight. Free weights count first, then machines and cables, and finally leg exercises where the muscle only assists, e.g. lunges for glutes. Those give it only 10% of the result. The standards for men are approximate, and for exercises other than the main lifts they’re estimates. Custom and unweighted exercises don’t count.`))),
  ];
}

/** Zasady punktacji, na dole profilu. */
export function pointsSection() {
  const goal = state.settings.weeklyGoal;
  return h('section.block',
    h('h2.block-title', L("Za co są punkty XP", "How you earn XP")),
    h('ul.level-rules',
      h('li', h('span', L("Trening, raz dziennie", "Workout, once a day")), h('strong', `${XP_WORKOUT} XP`)),
      h('li', h('span', L("Seria robocza, do 16 serii partii w tygodniu", "Working set, up to 16 sets per muscle a week")), h('strong', '5 XP')),
      h('li', h('span', L("Seria na nogi, do 8 serii partii w tygodniu", "Leg set, up to 8 sets per muscle a week")), h('strong', '10 XP')),
      h('li', h('span', L("Nowy rekord w ćwiczeniu", "New record in an exercise")), h('strong', `${XP_RECORD} XP`)),
      h('li', h('span', goal == null ? L('Wykonany cel tygodniowy (nie masz ustawionego celu)', 'Weekly goal met (you have no goal set)') : L('Wykonany cel tygodniowy', 'Weekly goal met')), h('strong', `${XP_GOAL} XP`)),
      h('li', h('span', L("Seria tygodni: co 4 tygodnie z rzędu mnożnik rośnie o 0,1", "Week streak: every 4 weeks in a row the multiplier grows by 0.1")), h('strong', L(`do ${fmtMultiplier(1.5)}`, `up to ${fmtMultiplier(1.5)}`))),
      h('li', h('span', L("Osiągnięcie, bez mnożnika", "Medal, no multiplier")), h('strong', L("od 50 XP", "from 50 XP")))),
    h('p.settings-text', L("Mnożnik działa na całe XP z danego tygodnia, oprócz osiągnięć, i zależy od serii sprzed tego tygodnia. Tydzień bez celu zeruje serię, chyba że masz tarczę.", "The multiplier applies to all XP from a week, except medals, and depends on your streak before that week. A week without the goal resets the streak unless you have a shield.")),
    h('p.settings-text', L("Rozgrzewka się nie liczy. Wszystko wynika z historii, więc usunięcie treningu albo podniesienie celu może obniżyć wynik.", "Warm-ups don’t count. Everything comes from your history, so deleting a workout or raising your goal can lower the total.")));
}

/** Wynik treningu w podsumowaniu. Bez punktów nie ma czego pokazywać. */
export function levelGainBlock({ xp, multiplier, before, after, muscleUps, newAchievements }) {
  if (!(xp > 0)) return null;
  const leveledUp = after.level > before.level;
  return h('div.level-gain',
    h('p.level-line-top', h('strong.level-gain-xp', `+${fmtNum(xp)} XP`), h('span', leveledUp ? L(`Nowy poziom: ${after.level}!`, `New level: ${after.level}!`) : nextText(after))),
    xpBar(L(`Postęp poziomu ${after.level}`, `Level ${after.level} progress`), after.share, leveledUp ? 0 : before.share),
    multiplier > 1 && h('p.level-meta', L(`Z mnożnikiem za serię tygodni: ${fmtMultiplier(multiplier)}`, `With the week streak multiplier: ${fmtMultiplier(multiplier)}`)),
    muscleUps.length > 0 && h('p.level-meta', L(`Siła: ${muscleUps.map((row) => `${row.muscle} ${row.level}`).join(' · ')}`, `Strength: ${muscleUps.map((row) => `${muscleName(row.muscle)} ${row.level}`).join(' · ')}`)),
    newAchievements.map((item) => h('p.level-unlock',
      badge(item, 46),
      h('span.level-unlock-text', h('span.level-unlock-label', L("Nowy medal", "New medal")), h('strong', item.name)),
      h('span.level-unlock-xp', `+${fmtNum(item.xp)} XP`))));
}
