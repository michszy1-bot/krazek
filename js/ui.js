// Małe narzędzia interfejsu: tworzenie elementów, ikony, arkusze, potwierdzenia i komunikaty.

const SVG_NS = 'http://www.w3.org/2000/svg';

/** h('div.karta', { onclick }, 'tekst', dziecko). Tekst zawsze trafia do DOM jako węzeł tekstowy. */
export function h(spec, props, ...children) {
  const [tag, ...classes] = spec.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  // Drugi argument jest opcjonalny: zwykły obiekt to ustawienia, a cokolwiek innego to już treść.
  const isProps = props != null && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props);
  if (isProps) applyProps(el, props);
  else children.unshift(props);
  append(el, children);
  return el;
}

function applyProps(el, props) {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = `${el.className} ${value}`.trim();
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style') el.style.cssText = value;
    else if (key in el && !key.includes('-')) el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

const ICONS = {
  home: '<path d="M4 9h2v6H4zM7 6h2v12H7zM15 6h2v12h-2zM18 9h2v6h-2zM2 11h2v2H2zM20 11h2v2h-2zM9 11h6v2H9z"/>',
  book: '<path fill-rule="evenodd" d="M5 3h13a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5zm3 5v2h8V8zm0 4v2h6v-2z"/>',
  chart: '<path d="M4 20V4h2v14h14v2z"/><path d="m8.7 15.7-1.4-1.4 4.2-4.3 3 3 4.8-5.7 1.4 1.3-6.2 7.2-3-3z"/>',
  list: '<path d="M4 5h3v3H4zM9 5h11v3H9zM4 10.5h3v3H4zM9 10.5h11v3H9zM4 16h3v3H4zM9 16h11v3H9z"/>',
  gear: '<path fill-rule="evenodd" d="M10.3 2h3.4l.5 2.6c.5.2 1 .4 1.4.7l2.3-1.4 2.4 2.4-1.4 2.3c.3.4.5.9.7 1.4l2.4.5v3.4l-2.6.5c-.2.5-.4 1-.7 1.4l1.4 2.3-2.4 2.4-2.3-1.4c-.4.3-.9.5-1.4.7l-.5 2.7h-3.4l-.5-2.7c-.5-.2-1-.4-1.4-.7l-2.3 1.4-2.4-2.4 1.4-2.3c-.3-.4-.5-.9-.7-1.4L2 13.7v-3.4l2.6-.5c.2-.5.4-1 .7-1.4L3.9 6.1l2.4-2.4 2.3 1.4c.4-.3.9-.5 1.4-.7zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>',
  person: '<path d="M12 3a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM4 21v-1.5C4 16.5 7.6 14 12 14s8 2.5 8 5.5V21z"/>',
  back: '<path d="M15.4 4.6 8 12l7.4 7.4 1.6-1.6L11.2 12 17 6.2z"/>',
  down: '<path d="M4.6 8.6 12 16l7.4-7.4L17.8 7 12 12.8 6.2 7z"/>',
  up: '<path d="M4.6 15.4 12 8l7.4 7.4-1.6 1.6L12 11.2 6.2 17z"/>',
  more: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>',
  plus: '<path d="M10.8 4h2.4v6.8H20v2.4h-6.8V20h-2.4v-6.8H4v-2.4h6.8z"/>',
  check: '<path d="m9.5 17.8-5.3-5.3 1.8-1.8 3.5 3.5 8.5-8.5 1.8 1.8z"/>',
  close: '<path d="m6.2 4.5 5.8 5.8 5.8-5.8 1.7 1.7-5.8 5.8 5.8 5.8-1.7 1.7-5.8-5.8-5.8 5.8-1.7-1.7 5.8-5.8-5.8-5.8z"/>',
  search: '<path fill-rule="evenodd" d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/>',
  pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  timer: '<path fill-rule="evenodd" d="M9 1h6v2h-2v1.1A8.5 8.5 0 1 1 4.6 8.9l-.3.1L3 7.6l1.4-1.4 1.2 1.2A8.5 8.5 0 0 1 11 4.1V3H9zm3 5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm-1 2h2v5h-2z"/>',
};

export function icon(name, size = 24) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name];
  return svg;
}

export function iconButton(name, label, onclick, extraClass = '') {
  return h(`button.icon-btn${extraClass ? `.${extraClass}` : ''}`, { type: 'button', 'aria-label': label, title: label, onclick }, icon(name));
}

// --- Arkusz wysuwany od dołu, oparty na <dialog>, więc ma blokadę fokusu i Esc ---

export function openSheet(build, { full = false, label = '', onClose } = {}) {
  const dialog = h(`dialog.sheet${full ? '.sheet-full' : ''}`, { 'aria-label': label });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    dialog.close();
    dialog.remove();
    onClose?.();
  };
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  dialog.append(build(close));
  document.body.append(dialog);
  dialog.showModal();
  return close;
}

/** Arkusz z listą działań. Element: { label, hint, danger, onClick } */
export function actionSheet(title, actions) {
  openSheet((close) => h('div.sheet-body',
    title && h('h2.sheet-title', title),
    h('div.action-list', actions.map((action) => h('button.action-row', {
      type: 'button',
      class: action.danger ? 'danger' : '',
      'aria-pressed': action.selected == null ? null : String(action.selected),
      onclick: () => { close(); action.onClick?.(); },
    }, h('span', action.label), action.hint && h('span.hint', action.hint), action.selected && icon('check', 20)))),
    h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, 'Anuluj')), { label: title });
}

/** Pytanie z potwierdzeniem. Zwraca true, gdy wybrano działanie. */
export function ask({ title, text, confirm, danger = false, cancel = 'Anuluj' }) {
  return new Promise((resolve) => {
    let result = false;
    openSheet((close) => h('div.sheet-body',
      h('h2.sheet-title', title),
      text && h('p.sheet-text', text),
      h('button', {
        type: 'button',
        class: `btn btn-block ${danger ? 'btn-danger' : 'btn-primary'}`,
        onclick: () => { result = true; close(); },
      }, confirm),
      h('button.btn.btn-ghost.btn-block', { type: 'button', onclick: close }, cancel)),
    { label: title, onClose: () => resolve(result) });
  });
}

let toastTimer = null;

export function toast(message, { actionLabel, onAction } = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', role: 'status' });
    document.body.append(el);
  }
  // Komunikat ma być widoczny także nad otwartym arkuszem, który leży w warstwie górnej.
  const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
  (dialog ?? document.body).append(el);
  const hide = () => el.classList.remove('show');
  el.replaceChildren(h('span', message));
  if (actionLabel) {
    el.append(h('button.toast-action', {
      type: 'button',
      onclick: () => { hide(); onAction?.(); },
    }, actionLabel));
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hide, actionLabel ? 6000 : 3200);
}

/** Pasek przełączników, gdzie zawsze wybrana jest jedna opcja. */
export function segmented(options, value, onChange, label) {
  const root = h('div.segmented', { role: 'radiogroup', 'aria-label': label });
  const buttons = options.map((option) => h('button', {
    type: 'button',
    role: 'radio',
    'aria-checked': String(option.value === value),
    onclick: () => {
      buttons.forEach((b) => b.setAttribute('aria-checked', String(b === buttonFor(option))));
      onChange(option.value);
    },
  }, option.label));
  const buttonFor = (option) => buttons[options.indexOf(option)];
  root.append(...buttons);
  return root;
}

export function emptyState(title, text, action) {
  return h('div.empty', h('p.empty-title', title), text && h('p.empty-text', text), action);
}

export function pageHeader(title, { back, actions } = {}) {
  return h('header.page-head',
    back && h('a.icon-btn', { href: back, 'aria-label': 'Wstecz', title: 'Wstecz' }, icon('back')),
    h(`h1.page-title${back ? '.page-title-sub' : ''}`, title),
    actions && h('div.page-actions', actions));
}

export const recordChip = () => h('span.pr-chip', { title: 'Rekord osobisty', 'aria-label': 'Rekord osobisty' }, 'PR');
