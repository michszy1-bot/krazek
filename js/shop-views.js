// Ekran sklepu za XP: zakładki, przymierzalnia na górze i lista przedmiotów z rzadkością.

import { ask, h, icon, openSheet, pageHeader, particles, segmented, toast } from './ui.js';
import { fmtNum } from './format.js';
import { L } from './i18n.js';
import { bestGroup, levelProgress, rankOf } from './level.js';
import { levelOptions } from './level-views.js';
import { applyDueShields, exerciseById, saveShop, state } from './store.js';
import { buyItem, cleanInscription, INSCRIPTION_MAX, itemById, ownsItem, rarityOf, SHOP_ITEMS, SHOP_SECTIONS, SHOP_TABS, shownInscription, spendable, wearItem, wornItem } from './shop.js';
import { confetti, fireworks, framedBadge, rankUpBadge } from './effects.js';

const fmtXp = (xp) => `${fmtNum(xp)} XP`;

// Wybrana zakładka zostaje po zakupie i powrocie do sklepu. Przymierzane rzeczy: miejsce -> id przedmiotu.
let tab = 'bar';
let trying = {};

const kindOf = (item) => item.id.slice(item.slot.length + 1);
/** Przedmiot widoczny w przymierzalni: przymierzany albo założony. */
const shownItem = (slot) => itemById(trying[slot]) ?? wornItem(state.shop, slot);

function inscriptionForm() {
  const input = h('input.shop-input', {
    type: 'text',
    maxLength: INSCRIPTION_MAX,
    value: state.shop.inscription,
    autocomplete: 'off',
    enterKeyHint: 'done',
    'aria-label': L("Napis przy gryfie", "Bar inscription"),
  });
  openSheet((close) => h('form.sheet-body', {
    onsubmit: async (event) => {
      event.preventDefault();
      await saveShop({ ...state.shop, inscription: cleanInscription(input.value) });
      close();
    },
  },
  h('h2.sheet-title', L("Napis przy gryfie", "Bar inscription")),
  h('p.sheet-text', L(`Widać go pod sztangą na ekranie startowym. Najwyżej ${INSCRIPTION_MAX} znaków, a zmiana jest darmowa.`, `It shows under the bar on the home screen. Up to ${INSCRIPTION_MAX} characters, and changing it is free.`)),
  input,
  h('button.btn.btn-primary.btn-block', { type: 'submit' }, L("Zapisz", "Save")),
  h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, L("Anuluj", "Cancel"))),
  { label: L("Napis przy gryfie", "Bar inscription") });
}

async function buy(item, xp) {
  const rarity = rarityOf(item);
  const confirmed = await ask({
    title: L(`Kupić: ${item.name}?`, `Buy: ${item.name}?`),
    text: item.consumable
      ? L(`Wydasz ${fmtXp(item.price)}, a poziom się nie zmieni. Tarcza zużyje się sama, gdy tydzień bez wykonanego celu przerwałby serię. Działa tylko przy ustawionym celu tygodniowym.`, `You’ll spend ${fmtXp(item.price)} and your level won’t change. The shield is used automatically when a week without the goal would break your streak. It only works with a weekly goal set.`)
      : L(`${rarity.name} przedmiot. Wydasz ${fmtXp(item.price)}. Zakupu nie można cofnąć, ale poziom się nie zmieni.`, `${rarity.name} item. You’ll spend ${fmtXp(item.price)}. Purchases can’t be undone, but your level won’t change.`),
    confirm: L(`Kup za ${fmtXp(item.price)}`, `Buy for ${fmtXp(item.price)}`),
  });
  if (!confirmed) return;
  const bought = buyItem(state.shop, item.id, xp);
  if (!bought) return;
  delete trying[item.slot];
  await saveShop(bought);
  await applyDueShields();
  toast(L(`Kupiono: ${item.name}.`, `Bought: ${item.name}.`));
  if (item.id === 'inscription') inscriptionForm();
}

/** Najwyższa ranga użytkownika, potrzebna do ramki, fajerwerków i efektu rangi. */
function topRankId() {
  if (!state.bodyWeights.length) return null;
  const group = bestGroup(levelProgress(state.workouts, exerciseById, levelOptions()).muscles);
  return group ? rankOf(group.level).id : null;
}

/** Mała sztanga: krążki z jednej strony, a w przymierzalni z obu. */
function miniLoad(mirrored = false) {
  return h(`span.mini-load${mirrored ? '.mini-load-left' : ''}`,
    ['red', 'blue', 'yellow', 'green'].map((tier) => h(`i.tier-${tier}`)),
    h('b'));
}

function preview(item) {
  const look = (slot) => `look-${item.slot === slot ? item.id : wornItem(state.shop, slot).id}`;
  switch (item.slot) {
    case 'shield': return h('span.shop-preview.shop-preview-shield', icon('shield', 30));
    case 'theme':
    case 'accent': return h(`span.shop-preview.shop-swatch-${item.id}`);
    case 'title': return h('span.shop-preview', icon('person', 26));
    case 'inscription': return h('span.shop-preview.shop-preview-text', 'Abc');
    case 'frame': return h('span.shop-preview.shop-preview-badge', framedBadge('gold', kindOf(item) === 'none' ? null : kindOf(item), 46));
    case 'rankup': return h('span.shop-preview.shop-preview-badge', item.price ? h('span.rankup-still', rankUpBadge('gold', kindOf(item), 38)) : rankUpBadge('gold', null, 38));
    case 'finish':
      if (item.id === 'finish-confetti') return h('span.shop-preview.shop-preview-confetti', ['#e5484d', '#2f6bea', '#f6c62e', '#35b371', '#f1f3f5', '#e5484d', '#f6c62e'].map((colour, i) => h('i', { style: `background:${colour};left:${10 + i * 12}%;top:${[18, 52, 30, 64, 22, 46, 70][i]}%;transform:rotate(${i * 47}deg)` })));
      if (item.id === 'finish-fireworks') return h('span.shop-preview', h('span.preview-burst.preview-firework', particles('spark', 12, 18)));
      return h('span.shop-preview.shop-preview-text', L("Brak", "None"));
    case 'dust':
    case 'spark':
      if (item.id === 'dust-chalk') return h('span.shop-preview', h('span.preview-burst', particles('chalk', 12, 20)));
      if (item.id === 'spark-on') return h('span.shop-preview', h('span.preview-burst', particles('spark', 12, 20)));
      return h('span.shop-preview.shop-preview-text', L("Brak", "None"));
    default:
      return h(`span.shop-preview.${look('bar')}.${look('plates')}.${look('clamp')}`, h('span.mini-bar'), miniLoad());
  }
}

// --- Przymierzalnia ---

function barStage() {
  const looks = ['bar', 'plates', 'clamp'].map((slot) => `look-${shownItem(slot).id}`).join('.');
  const text = trying.inscription ? L('Twój napis', 'Your text') : shownInscription(state.shop);
  return h(`div.stage-bar.shop-preview.${looks}`,
    h('span.mini-bar'),
    h('span.stage-load', miniLoad(true), h('span.stage-gap'), miniLoad()),
    text && h('span.stage-inscription', text));
}

function effectStage() {
  const item = itemById(trying[Object.keys(trying)[0]]) ?? ['finish', 'rankup', 'spark', 'dust'].map((slot) => wornItem(state.shop, slot)).find((worn) => worn.price > 0);
  if (!item || item.price === 0) {
    return h('div.stage-effect', h('p.stage-hint', L('Stuknij efekt na liście, żeby go zobaczyć.', 'Tap an effect in the list to see it.')));
  }
  const rank = topRankId() ?? 'gold';
  const scene = {
    'dust-chalk': () => h('span.stage-center', h('span.stage-mini.shop-preview', h('span.mini-bar'), miniLoad()), h('span.chalk-puff', particles('chalk.stage-chalk', 16, 40))),
    'spark-on': () => [h('span.stage-center', h('span.pr-chip', 'PR')), h('span.spark-burst.stage-sparks', particles('spark', 22, 90))],
    'finish-confetti': () => [h('strong.stage-caption', L('Trening zapisany', 'Workout saved')), confetti(34)],
    'finish-fireworks': () => [h('strong.stage-caption', L('Trening zapisany', 'Workout saved')), fireworks(rank)],
    'rankup-glow': () => h('span.stage-center', rankUpBadge(rank, 'glow', 74)),
    'rankup-burst': () => h('span.stage-center', rankUpBadge(rank, 'burst', 74)),
  }[item.id];
  return h('div.stage-effect',
    scene(),
    h('button.stage-replay', { type: 'button', onclick: refresh }, icon('play', 18), L('Jeszcze raz', 'Replay')));
}

function lookStage() {
  return h(`div.stage-phone.look-${shownItem('theme').id}.look-${shownItem('accent').id}`,
    h('span.stage-phone-card',
      h('span.stage-phone-line.wide'),
      h('span.stage-phone-line'),
      h('span.stage-phone-bar', h('i'))),
    h('span.stage-phone-card.short', h('span.stage-phone-line'), h('span.stage-phone-chip')),
    h('span.stage-phone-button', L('Zacznij trening', 'Start workout')));
}

function profileStage(progress) {
  const frame = shownItem('frame');
  const title = shownItem('title');
  return h('div.stage-profile',
    framedBadge(topRankId() ?? 'gold', frame.price ? kindOf(frame) : null, 92),
    h('span.stage-profile-text',
      title.price > 0 && h('span.level-title', title.name),
      h('strong.level-name', L(`Poziom ${progress.level}`, `Level ${progress.level}`)),
      h('span.stage-profile-meta', icon('shield', 16), L(`Tarcze serii: ${state.shop.shields}`, `Streak shields: ${state.shop.shields}`))));
}

function stage(progress) {
  const tried = Object.values(trying).map(itemById).filter(Boolean);
  const body = { bar: barStage, effects: effectStage, look: lookStage, profile: () => profileStage(progress) }[tab]();
  return h('section.shop-stage',
    body,
    h('div.stage-foot',
      tried.length
        ? [h('span.stage-label', L(`Przymierzasz: ${tried.map((item) => item.name).join(', ')}`, `Trying on: ${tried.map((item) => item.name).join(', ')}`)),
          h('button.stage-reset', { type: 'button', onclick: () => { trying = {}; refresh(); } }, L('Zdejmij', 'Take off'))]
        : h('span.stage-label', tab === 'effects'
          ? L('Przymierzalnia. Stuknij efekt, żeby go odtworzyć.', 'Fitting room. Tap an effect to play it.')
          : L('Przymierzalnia. Stuknij przedmiot, żeby go przymierzyć.', 'Fitting room. Tap an item to try it on.'))));
}

// --- Lista ---

function tryOn(item) {
  if (item.consumable) return;
  if (tab === 'effects') trying = {};
  if (ownsItem(state.shop, item) && wornItem(state.shop, item.slot).id === item.id && tab !== 'effects') delete trying[item.slot];
  else trying = { ...trying, [item.slot]: item.id };
  refresh();
}

function itemRow(item, xp, wornLabel) {
  const owned = ownsItem(state.shop, item);
  const balance = spendable(xp, state.shop);
  const worn = wornItem(state.shop, item.slot)?.id === item.id;
  const missing = item.price - balance;
  const rarity = rarityOf(item);

  let action;
  let meta = item.consumable ? L(`${item.meta}. Masz: ${state.shop.shields}`, `${item.meta}. You have: ${state.shop.shields}`) : item.meta;
  if (item.slot === 'inscription' && owned) {
    meta = shownInscription(state.shop) || L("Jeszcze bez napisu", "No inscription yet");
    action = h('button.shop-action.wear', { type: 'button', onclick: inscriptionForm }, L("Zmień", "Change"));
  } else if (owned && worn) {
    action = h('span.shop-action.on', wornLabel);
  } else if (owned) {
    action = h('button.shop-action.wear', { type: 'button', onclick: () => { delete trying[item.slot]; saveShop(wearItem(state.shop, item.id)); } }, L("Załóż", "Equip"));
  } else if (missing > 0) {
    action = h('button.shop-action.far', { type: 'button', disabled: true }, fmtXp(item.price));
    meta = L(`${item.consumable ? `${meta}. ` : ''}Brakuje ${fmtXp(missing)}`, `${item.consumable ? `${meta}. ` : ''}${fmtXp(missing)} to go`);
  } else {
    action = h('button.shop-action', { type: 'button', onclick: () => buy(item, xp), 'aria-label': L(`Kup: ${item.name} za ${fmtXp(item.price)}`, `Buy: ${item.name} for ${fmtXp(item.price)}`) }, fmtXp(item.price));
  }

  const isTried = trying[item.slot] === item.id;
  return h(`div.shop-item${rarity ? `.rarity-${rarity.id}` : ''}${isTried ? '.trying' : ''}`,
    h('button.shop-try', {
      type: 'button',
      onclick: () => tryOn(item),
      'aria-pressed': item.consumable ? null : String(isTried),
      'aria-label': item.consumable ? item.name : L(`Przymierz: ${item.name}`, `Try on: ${item.name}`),
    },
    preview(item),
    h('span.shop-text',
      h('span.shop-name', item.name, rarity && h('span.rarity-chip', rarity.name)),
      h('span.shop-meta', meta),
      !owned && missing > 0 && h('span.shop-progress', h('i', { style: `width:${Math.round((balance / item.price) * 100)}%` })))),
    action);
}

let root = null;

function content() {
  const progress = levelProgress(state.workouts, exerciseById, levelOptions());
  const { slots } = SHOP_TABS.find((entry) => entry.id === tab);
  return [
    pageHeader(L("Sklep", "Shop"), { back: '#/profil' }),
    h('section.shop-balance',
      h('strong', fmtXp(spendable(progress.xp, state.shop))),
      h('span', L(`do wydania. Zakupy nie obniżają poziomu, zostajesz na poziomie ${progress.level}.`, `to spend. Purchases don’t lower your level: you stay at level ${progress.level}.`))),
    segmented(SHOP_TABS.map((entry) => ({ value: entry.id, label: entry.label })), tab, (value) => { tab = value; trying = {}; refresh(); }, L('Działy sklepu', 'Shop sections')),
    stage(progress),
    SHOP_SECTIONS.filter(({ slot }) => slots.includes(slot)).sort((a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot)).map(({ slot, label, worn }) => h('section.block',
      h('h2.block-title', label),
      h('div.shop-list', SHOP_ITEMS.filter((item) => item.slot === slot).map((item) => itemRow(item, progress.xp, worn))))),
  ];
}

/** Przerysowuje sam sklep, bez przewijania na górę. */
function refresh() {
  if (root?.isConnected) root.replaceChildren(...content().flat());
}

export function shopView() {
  root = h('div.page', content());
  return root;
}
