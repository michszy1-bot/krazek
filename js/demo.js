// Animowana demonstracja ćwiczenia. GIF ładuje się z serwera ExerciseDB tylko wtedy, gdy jest potrzebny.

import { h, icon } from './ui.js';
import { ANIMATION_BASE, ANIMATIONS } from './animations.js';
import { L } from './i18n.js';

export const hasDemo = (exerciseId) => Boolean(ANIMATIONS[exerciseId]);
export const demoUrl = (exerciseId) => `${ANIMATION_BASE}${ANIMATIONS[exerciseId]}.gif`;

const THUMB_PIXELS = 156; // 52 punkty na ekranie iPhone'a, który ma 3 piksele na punkt

/**
 * Nieruchoma miniatura na listy. GIF ładuje się dopiero przy wjeździe na ekran, a po wczytaniu
 * zastępuje go jedna klatka, bo setki grających animacji obciążałyby telefon przy przewijaniu.
 * Własne ćwiczenia i brak internetu dają zastępczą ikonę hantla.
 */
export function exerciseThumb(exercise) {
  const box = h('span.thumb', { 'aria-hidden': 'true' });
  const showPlaceholder = () => {
    box.classList.add('thumb-empty');
    box.replaceChildren(icon('home', 24));
  };
  if (!hasDemo(exercise.id)) {
    showPlaceholder();
    return box;
  }
  // loading musi być ustawione przed src, inaczej Safari pobierze od razu całą listę.
  const image = h('img', {
    loading: 'lazy',
    decoding: 'async',
    referrerPolicy: 'no-referrer',
    alt: '',
    width: 52,
    height: 52,
    src: demoUrl(exercise.id),
    onerror: showPlaceholder,
    onload: () => {
      const frame = h('canvas', { width: THUMB_PIXELS, height: THUMB_PIXELS });
      try {
        frame.getContext('2d').drawImage(image, 0, 0, THUMB_PIXELS, THUMB_PIXELS);
        image.replaceWith(frame);
      } catch {
        // Bez klatki zostaje grający GIF, co też pozwala rozpoznać ćwiczenie.
      }
    },
  });
  box.append(image);
  return box;
}

/** Duży podgląd z pauzą. Zwraca null, gdy ćwiczenie nie ma animacji, np. własne. */
export function exerciseDemo(exercise) {
  if (!hasDemo(exercise.id)) return null;

  const image = h('img.demo-image', {
    src: demoUrl(exercise.id),
    alt: L(`Animacja: ${exercise.name}`, `Animation: ${exercise.name}`),
    width: 180,
    height: 180,
    referrerPolicy: 'no-referrer',
    decoding: 'async',
  });
  // Pauza zatrzymuje bieżącą klatkę na płótnie, bo sam GIF nie umie się zatrzymać.
  const frozen = h('canvas.demo-image', { width: 360, height: 360, hidden: true, 'aria-hidden': 'true' });
  const pauseIcon = h('span.demo-icon', icon('pause', 20));
  const playIcon = h('span.demo-icon', { hidden: true }, icon('play', 20));

  let paused = false;
  const setPaused = (value) => {
    paused = value;
    if (paused) frozen.getContext('2d').drawImage(image, 0, 0, frozen.width, frozen.height);
    frozen.hidden = !paused;
    image.hidden = paused;
    pauseIcon.hidden = paused;
    playIcon.hidden = !paused;
    toggle.setAttribute('aria-label', paused ? L('Wznów animację', 'Resume animation') : L('Zatrzymaj animację', 'Pause animation'));
    toggle.title = toggle.getAttribute('aria-label');
  };

  const toggle = h('button.demo-toggle', { type: 'button', 'aria-label': L('Zatrzymaj animację', 'Pause animation'), title: L('Zatrzymaj animację', 'Pause animation'), onclick: () => setPaused(!paused) }, pauseIcon, playIcon);

  const stage = h('div.demo-stage', image, frozen, toggle);
  const root = h('figure.demo', stage);

  image.addEventListener('load', () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true);
  }, { once: true });
  image.addEventListener('error', () => {
    root.replaceChildren(h('p.demo-offline', L('Animacja wymaga internetu. Sprawdź połączenie i otwórz ten ekran ponownie.', 'The animation needs an internet connection. Check it and open this screen again.')));
  }, { once: true });

  return root;
}
