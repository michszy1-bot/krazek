// Sygnał końca przerwy. Gra go aplikacja przez Web Audio, które nakłada się na muzykę.
// iPhone wstrzymuje aplikację na zablokowanym ekranie i w tle, więc wtedy sygnał nie zagra.
// Działający silnik dźwięku może zatrzymać muzykę, dlatego budzi się dopiero na przerwę
// (Safari wymaga do tego stuknięcia) i zasypia zaraz po sygnale.

import { L } from './i18n.js';

const BEEPS = [
  { hz: 1000, seconds: 0.18 },
  { hz: 1000, seconds: 0.18 },
  { hz: 1500, seconds: 0.4 },
];
const GAP_SECONDS = 0.09;

let context = null;
let lastError = null;
let suspendTimer = null;

// Od samego startu aplikacja ma nie przeszkadzać muzyce, jeszcze zanim cokolwiek zagra.
if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
  try {
    navigator.audioSession.type = 'ambient';
  } catch {
    // Brak zmiany trybu nie może zablokować samego sygnału.
  }
}

function wakeEngine() {
  clearTimeout(suspendTimer);
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (!Context) return;
  if (context?.state === 'closed') context = null;
  context ??= new Context();
  if (context.state !== 'running') {
    // Kontekst przerwany przez blokadę, którego nie da się wznowić, powstanie przy następnym dotknięciu.
    context.resume().catch(() => { context = null; });
  }
}

function sleepEngine(afterMs = 0) {
  clearTimeout(suspendTimer);
  suspendTimer = setTimeout(() => { context?.suspend?.().catch?.(() => {}); }, afterMs);
}

/** Początek przerwy. Tylko w obsłudze stuknięcia. */
export function startRest() {
  lastError = null;
  wakeEngine();
}

/** Sygnał od razu, do sprawdzenia dźwięku. Tylko w obsłudze stuknięcia. */
export function playNow() {
  lastError = null;
  wakeEngine();
  beepNow();
}

/** Po zmianie długości przerwy może się okazać, że już się skończyła. */
export function syncRest(secondsLeft) {
  if (secondsLeft <= 0) stopRest();
  else startRest();
}

export function stopRest() {
  sleepEngine();
}

/** Stan dźwięku pokazywany w Ustawieniach, żeby dało się ustalić, co robi telefon. */
export function status() {
  return {
    session: 'audioSession' in navigator ? navigator.audioSession.type : L('brak', 'none'),
    engine: context?.state ?? L('brak', 'none'),
    error: lastError,
  };
}

export function beepNow() {
  if (!context) return;
  if (context.state !== 'running') {
    // Kontekst wstrzymany na chwilę, np. przez dźwięk z innej aplikacji, zwykle da się wznowić.
    const paused = context;
    paused.resume().then(() => { if (paused === context) playBeeps(); }).catch(() => { lastError = L('nie można wznowić dźwięku', 'can’t resume sound'); });
    return;
  }
  playBeeps();
}

function playBeeps() {
  let offset = 0;
  for (const { hz, seconds } of BEEPS) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const at = context.currentTime + offset;
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.8, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    osc.connect(gain).connect(context.destination);
    osc.start(at);
    osc.stop(at + seconds);
    offset += seconds + GAP_SECONDS;
  }
  sleepEngine(offset * 1000 + 300);
}
