// Animowana demonstracja ćwiczenia. GIF ładuje się z serwera ExerciseDB tylko wtedy, gdy jest potrzebny.

import { h, icon } from './ui.js';
import { ANIMATION_BASE, ANIMATIONS } from './animations.js';

export const hasDemo = (exerciseId) => Boolean(ANIMATIONS[exerciseId]);
export const demoUrl = (exerciseId) => `${ANIMATION_BASE}${ANIMATIONS[exerciseId]}.gif`;

/** Duży podgląd z pauzą. Zwraca null, gdy ćwiczenie nie ma animacji, np. własne. */
export function exerciseDemo(exercise) {
  if (!hasDemo(exercise.id)) return null;

  const image = h('img.demo-image', {
    src: demoUrl(exercise.id),
    alt: `Animacja: ${exercise.name}`,
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
    toggle.setAttribute('aria-label', paused ? 'Wznów animację' : 'Zatrzymaj animację');
    toggle.title = toggle.getAttribute('aria-label');
  };

  const toggle = h('button.demo-toggle', { type: 'button', 'aria-label': 'Zatrzymaj animację', title: 'Zatrzymaj animację', onclick: () => setPaused(!paused) }, pauseIcon, playIcon);

  const stage = h('div.demo-stage', image, frozen, toggle);
  const root = h('figure.demo', stage);

  image.addEventListener('load', () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true);
  }, { once: true });
  image.addEventListener('error', () => {
    root.replaceChildren(h('p.demo-offline', 'Animacja wymaga internetu. Sprawdź połączenie i otwórz ten ekran ponownie.'));
  }, { once: true });

  return root;
}
