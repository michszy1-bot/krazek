// Ekran sklepu za XP.

import { ask, h, icon, openSheet, pageHeader, toast } from './ui.js';
import { fmtNum } from './format.js';
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
    'aria-label': 'Napis przy gryfie',
  });
  openSheet((close) => h('form.sheet-body', {
    onsubmit: async (event) => {
      event.preventDefault();
      await saveShop({ ...state.shop, inscription: cleanInscription(input.value) });
      close();
    },
  },
  h('h2.sheet-title', 'Napis przy gryfie'),
  h('p.sheet-text', `Widać go pod sztangą na ekranie startowym. Najwyżej ${INSCRIPTION_MAX} znaków, a zmiana jest darmowa.`),
  input,
  h('button.btn.btn-primary.btn-block', { type: 'submit' }, 'Zapisz'),
  h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, 'Anuluj')),
  { label: 'Napis przy gryfie' });
}

async function buy(item, xp) {
  const confirmed = await ask({
    title: `Kupić: ${item.name}?`,
    text: item.consumable
      ? `Wydasz ${fmtXp(item.price)}, a poziom się nie zmieni. Tarcza zużyje się sama, gdy tydzień bez wykonanego celu przerwałby serię. Działa tylko przy ustawionym celu tygodniowym.`
      : `Wydasz ${fmtXp(item.price)}. Zakupu nie można cofnąć, ale poziom się nie zmieni.`,
    confirm: `Kup za ${fmtXp(item.price)}`,
  });
  if (!confirmed) return;
  const bought = buyItem(state.shop, item.id, xp);
  if (!bought) return;
  await saveShop(bought);
  await applyDueShields();
  toast(`Kupiono: ${item.name}.`);
  if (item.id === 'inscription') inscriptionForm();
}

function preview(item) {
  if (item.slot === 'shield') return h('span.shop-preview.shop-preview-shield', icon('shield', 30));
  if (item.slot === 'theme') return h(`span.shop-preview.shop-swatch-${item.id}`);
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
  let meta = item.consumable ? `${item.meta}. Masz: ${state.shop.shields}` : item.meta;
  if (item.slot === 'inscription' && owned) {
    meta = shownInscription(state.shop) || 'Jeszcze bez napisu';
    action = h('button.shop-action.wear', { type: 'button', onclick: inscriptionForm }, 'Zmień');
  } else if (owned && worn) {
    action = h('span.shop-action.on', wornLabel);
  } else if (owned) {
    action = h('button.shop-action.wear', { type: 'button', onclick: () => saveShop(wearItem(state.shop, item.id)) }, 'Załóż');
  } else if (missing > 0) {
    action = h('button.shop-action.far', { type: 'button', disabled: true }, fmtXp(item.price));
    meta = `${item.consumable ? `${meta}. ` : ''}Brakuje ${fmtXp(missing)}`;
  } else {
    action = h('button.shop-action', { type: 'button', onclick: () => buy(item, xp), 'aria-label': `Kup: ${item.name} za ${fmtXp(item.price)}` }, fmtXp(item.price));
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
    pageHeader('Sklep', { back: '#/profil' }),
    h('section.shop-balance',
      h('strong', fmtXp(spendable(progress.xp, state.shop))),
      h('span', `do wydania. Zakupy nie obniżają poziomu, zostajesz na poziomie ${progress.level}.`)),
    SHOP_SECTIONS.map(({ slot, label, worn }) => h('section.block',
      h('h2.block-title', label),
      h('div.shop-list', SHOP_ITEMS.filter((item) => item.slot === slot).map((item) => itemRow(item, progress.xp, worn))))));
}
