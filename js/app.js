// Start aplikacji: wczytanie danych, nawigacja po adresach z # i pasek zakładek.

import { h, icon } from './ui.js';
import { L, language } from './i18n.js';
import { fmtClock } from './format.js';
import { applyDueShields, load, state, subscribe } from './store.js';
import { isWorkoutOpen, resumeWorkout } from './workout.js';
import { exerciseView, homeView, journalView, libraryView, progressView, settingsView, workoutDetailView } from './views.js';
import { profileView } from './profile.js';
import { themeColor, wornLooks } from './shop.js';
import { shopView } from './shop-views.js';
import { achievementsView } from './achievement-views.js';

const main = document.getElementById('view');
const nav = document.getElementById('tabs');
const pill = document.getElementById('active-pill');

const TABS = [
  { href: '#/', label: L('Trening', 'Workout'), icon: 'home' },
  { href: '#/dziennik', label: L('Dziennik', 'History'), icon: 'book' },
  { href: '#/postepy', label: L('Postępy', 'Progress'), icon: 'chart' },
  { href: '#/cwiczenia', label: L('Ćwiczenia', 'Exercises'), icon: 'list' },
];

// Wstecz ze szczegółów ćwiczenia wraca do zakładki, z której przyszedł użytkownik.
let lastTab = '#/cwiczenia';

function route() {
  const hash = location.hash || '#/';
  const [, section = '', id] = hash.split('/');
  switch (section) {
    case '': return { tab: '#/', view: homeView };
    case 'dziennik':
      return { tab: '#/dziennik', view: id ? () => workoutDetailView(decodeURIComponent(id)) : journalView };
    case 'postepy': return { tab: '#/postepy', view: progressView };
    case 'cwiczenia': return { tab: '#/cwiczenia', view: libraryView };
    case 'cwiczenie':
      return { tab: lastTab, view: () => exerciseView(decodeURIComponent(id), lastTab) };
    case 'ustawienia': return { tab: '#/', view: settingsView };
    case 'profil': return { tab: '#/', view: profileView };
    case 'sklep': return { tab: '#/', view: shopView };
    case 'osiagniecia': return { tab: '#/', view: achievementsView };
    default: return { tab: '#/', view: homeView };
  }
}

/** Kupiony wygląd obowiązuje w całej aplikacji. */
function applyLooks() {
  document.documentElement.className = wornLooks(state.shop).join(' ');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor(state.shop));
}

function render({ keepScroll = false } = {}) {
  applyLooks();
  const { tab, view } = route();
  if (['#/postepy', '#/cwiczenia', '#/dziennik', '#/'].includes(tab) && !location.hash.includes('cwiczenie/')) lastTab = tab;
  const scrollY = window.scrollY;
  main.replaceChildren(view());
  window.scrollTo(0, keepScroll ? scrollY : 0);
  nav.querySelectorAll('a').forEach((link) => {
    const current = link.getAttribute('href') === tab;
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  updatePill();
}

function updatePill() {
  const show = Boolean(state.active) && !isWorkoutOpen();
  pill.hidden = !show;
  if (show) pill.querySelector('[data-elapsed]').textContent = fmtClock((Date.now() - state.active.startedAt) / 1000);
}

function tickElapsed() {
  if (!state.active) return;
  document.querySelectorAll('[data-elapsed-from]').forEach((el) => {
    el.textContent = fmtClock((Date.now() - Number(el.dataset.elapsedFrom)) / 1000);
  });
  updatePill();
}

function buildShell() {
  document.documentElement.lang = language();
  nav.setAttribute('aria-label', L('Główna nawigacja', 'Main navigation'));
  nav.append(...TABS.map((tab) => h('a.tab', { href: tab.href }, icon(tab.icon, 24), h('span', tab.label))));
  pill.append(h('span', L('Trening w toku', 'Workout in progress')), h('strong', { dataset: { elapsed: '' } }, '0:00'));
  pill.addEventListener('click', resumeWorkout);
}

async function start() {
  buildShell();
  try {
    await load();
  } catch (error) {
    main.replaceChildren(h('div.empty',
      h('p.empty-title', L('Nie można otworzyć danych', 'Your data can’t be opened')),
      h('p.empty-text', L('Przeglądarka zablokowała zapis na tym urządzeniu. Wyjdź z trybu prywatnego i otwórz aplikację ponownie.', 'The browser blocked storage on this device. Leave private browsing and open the app again.'))));
    console.error(error);
    return;
  }

  // Prośba, żeby system nie kasował danych przy braku miejsca.
  navigator.storage?.persist?.().catch(() => {});

  // Nowy tydzień może zacząć się przy otwartej aplikacji, więc tarcze sprawdzam też po powrocie do niej.
  await applyDueShields();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) applyDueShields(); });

  window.addEventListener('hashchange', () => render());
  subscribe(() => { if (!isWorkoutOpen()) render({ keepScroll: true }); });
  document.addEventListener('workout-collapsed', () => render({ keepScroll: true }));
  setInterval(tickElapsed, 1000);
  render();

  // Trening w toku wraca po ponownym otwarciu aplikacji.
  if (state.active) resumeWorkout();

  // Na lokalnym serwerze pamięć podręczna tylko przeszkadza, chyba że adres ma ?sw=1.
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && (!local || location.search.includes('sw=1'))) {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Tryb offline niedostępny', error));
  }
}

start();
