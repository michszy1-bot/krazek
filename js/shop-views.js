// Ekran sklepu za XP.

import { ask, h, icon, openSheet, pageHeader, particles, toast } from './ui.js';
import { fmtNum } from './format.js';
import { L } from './i18n.js';
import { levelProgress } from './level.js';
import { levelOptions } from './level-views.js';
import { applyDueShields, exerciseById, saveShop, state } from './store.js';
import { buyItem, cleanInscription, INSCRIPTION_MAX, ownsItem, SHOP_ITEMS, SHOP_SECTIONS, shownInscription, spendable, wearItem, wornItem } from './shop.js';

const fmtXp = (xp) => `${fmtNum(xp)} XP`;

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
  const confirmed = await ask({
    title: L(`Kupić: ${item.name}?`, `Buy: ${item.name}?`),
    text: item.consumable
      ? L(`Wydasz ${fmtXp(item.price)}, a poziom się nie zmieni. Tarcza zużyje się sama, gdy tydzień bez wykonanego celu przerwałby serię. Działa tylko przy ustawionym celu tygodniowym.`, `You’ll spend ${fmtXp(item.price)} and your level won’t change. The shield is used automatically when a week without the goal would break your streak. It only works with a weekly goal set.`)
      : L(`Wydasz ${fmtXp(item.price)}. Zakupu nie można cofnąć, ale poziom się nie zmieni.`, `You’ll spend ${fmtXp(item.price)}. Purchases can’t be undone, but your level won’t change.`),
    confirm: L(`Kup za ${fmtXp(item.price)}`, `Buy for ${fmtXp(item.price)}`),
  });
  if (!confirmed) return;
  const bought = buyItem(state.shop, item.id, xp);
  if (!bought) return;
  await saveShop(bought);
  await applyDueShields();
  toast(L(`Kupiono: ${item.name}.`, `Bought: ${item.name}.`));
  if (item.id === 'inscription') inscriptionForm();
}

function preview(item) {
  if (item.slot === 'shield') return h('span.shop-preview.shop-preview-shield', icon('shield', 30));
  if (item.slot === 'theme') return h(`span.shop-preview.shop-swatch-${item.id}`);
  if (item.slot === 'accent') return h(`span.shop-preview.shop-swatch-${item.id}`);
  if (item.id === 'dust-chalk') return h('span.shop-preview', h('span.preview-burst', particles('chalk', 12, 20)));
  if (item.id === 'spark-on') return h('span.shop-preview', h('span.preview-burst', particles('spark', 12, 20)));
  if (item.slot === 'dust' || item.slot === 'spark') return h('span.shop-preview.shop-preview-text', L("Brak", "None"));
  if (item.slot === 'title') return h('span.shop-preview', icon('person', 26));
  if (item.slot === 'inscription') return h('span.shop-preview.shop-preview-text', 'Abc');
  const look = (slot) => `look-${item.slot === slot ? item.id : wornItem(state.shop, slot).id}`;
  return h(`span.shop-preview.${look('bar')}.${look('plates')}.${look('clamp')}`,
    h('span.mini-bar'),
    h('span.mini-load',
      ['red', 'blue', 'yellow'].map((tier) => h(`i.tier-${tier}`)),
      h('b'),
    ));
}

function itemRow(item, xp, wornLabel) {
  const owned = ownsItem(state.shop, item);
  const balance = spendable(xp, state.shop);
  const worn = wornItem(state.shop, item.slot)?.id === item.id;
  const missing = item.price - balance;

  let action;
  let meta = item.consumable ? L(`${item.meta}. Masz: ${state.shop.shields}`, `${item.meta}. You have: ${state.shop.shields}`) : item.meta;
  if (item.slot === 'inscription' && owned) {
    meta = shownInscription(state.shop) || L("Jeszcze bez napisu", "No inscription yet");
    action = h('button.shop-action.wear', { type: 'button', onclick: inscriptionForm }, L("Zmień", "Change"));
  } else if (owned && worn) {
    action = h('span.shop-action.on', wornLabel);
  } else if (owned) {
    action = h('button.shop-action.wear', { type: 'button', onclick: () => saveShop(wearItem(state.shop, item.id)) }, L("Załóż", "Equip"));
  } else if (missing > 0) {
    action = h('button.shop-action.far', { type: 'button', disabled: true }, fmtXp(item.price));
    meta = L(`${item.consumable ? `${meta}. ` : ''}Brakuje ${fmtXp(missing)}`, `${item.consumable ? `${meta}. ` : ''}${fmtXp(missing)} to go`);
  } else {
    action = h('button.shop-action', { type: 'button', onclick: () => buy(item, xp), 'aria-label': L(`Kup: ${item.name} za ${fmtXp(item.price)}`, `Buy: ${item.name} for ${fmtXp(item.price)}`) }, fmtXp(item.price));
  }

  return h('div.shop-item',
    preview(item),
    h('div.shop-text',
      h('span.shop-name', item.name),
      h('span.shop-meta', meta),
      !owned && missing > 0 && h('span.shop-progress', h('i', { style: `width:${Math.round((balance / item.price) * 100)}%` }))),
    action);
}

export function shopView() {
  const progress = levelProgress(state.workouts, exerciseById, levelOptions());
  return h('div.page',
    pageHeader(L("Sklep", "Shop"), { back: '#/profil' }),
    h('section.shop-balance',
      h('strong', fmtXp(spendable(progress.xp, state.shop))),
      h('span', L(`do wydania. Zakupy nie obniżają poziomu, zostajesz na poziomie ${progress.level}.`, `to spend. Purchases don’t lower your level: you stay at level ${progress.level}.`))),
    SHOP_SECTIONS.map(({ slot, label, worn }) => h('section.block',
      h('h2.block-title', label),
      h('div.shop-list', SHOP_ITEMS.filter((item) => item.slot === slot).map((item) => itemRow(item, progress.xp, worn))))));
}
