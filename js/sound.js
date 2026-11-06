// Sygnał końca przerwy, w dwóch trybach, bo na iPhonie nie da się mieć obu rzeczy naraz.
//
// Przy muzyce: sygnał gra aplikacja dopiero na końcu przerwy, przez Web Audio, które nakłada się
// na muzykę. Działa tylko przy otwartej aplikacji i włączonym ekranie.
//
// Na blokadzie (takeOver): iPhone zatrzymuje skrypty strony na zablokowanym ekranie, więc przy
// odhaczeniu serii rusza nagranie o długości przerwy: cisza, a na końcu sygnał. Takie nagranie
// przejmuje dźwięk telefonu i zatrzymuje muzykę na czas przerwy. Powstaje na każdą przerwę osobno
// i gra od początku, bo przewijanie iPhone może zignorować i wtedy grałaby sama cisza.
//
// Bez dotknięcia ekranu Safari nie pozwoli niczego zagrać, stąd wywołania w obsłudze stuknięć.

const SAMPLE_RATE = 16000;
const HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;
const MAX_REST_SECONDS = 900;
const BEEPS = [
  { hz: 1000, seconds: 0.18 },
  { hz: 1000, seconds: 0.18 },
  { hz: 1500, seconds: 0.4 },
];
const GAP_SECONDS = 0.09;

/** Plik WAV (16 bitów, mono): cisza, a po niej sygnał. Czysta funkcja, testowana w Node. */
export function buildTrack(silenceSeconds, rate = SAMPLE_RATE) {
  const signalSeconds = BEEPS.reduce((sum, beep) => sum + beep.seconds + GAP_SECONDS, 0) + 0.2;
  const samples = Math.round((silenceSeconds + signalSeconds) * rate);
  const dataBytes = samples * BYTES_PER_SAMPLE;
  const bytes = new Uint8Array(HEADER_BYTES + dataBytes); // zera to cisza w 16-bitowym WAV
  const view = new DataView(bytes.buffer);
  const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * BYTES_PER_SAMPLE, true);
  view.setUint16(32, BYTES_PER_SAMPLE, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, dataBytes, true);

  let position = Math.round(silenceSeconds * rate);
  for (const { hz, seconds } of BEEPS) {
    const length = Math.round(seconds * rate);
    const fade = Math.round(0.005 * rate); // bez tego słychać trzaski na brzegach
    for (let i = 0; i < length; i += 1) {
      const envelope = Math.min(1, i / fade, (length - i) / fade);
      const sample = Math.round(30000 * envelope * Math.sin((2 * Math.PI * hz * i) / rate));
      view.setInt16(HEADER_BYTES + (position + i) * BYTES_PER_SAMPLE, sample, true);
    }
    position += length + Math.round(GAP_SECONDS * rate);
  }
  return bytes;
}

let element = null;
let trackUrl = null;
let context = null;
let lastError = null;
let suspendTimer = null;

function setSession(takeOver) {
  // ambient miesza się z muzyką. auto to domyślne zachowanie telefonu: sygnał ma pierwszeństwo,
  // ale może zatrzymać muzykę. Ręczne wymuszanie trybu playback uciszało dźwięk na iPhonie.
  if (typeof navigator === 'undefined' || !('audioSession' in navigator)) return;
  try {
    navigator.audioSession.type = takeOver ? 'auto' : 'ambient';
  } catch {
    // Brak zmiany trybu nie może zablokować samego sygnału.
  }
}

// Od samego startu aplikacja ma nie przeszkadzać muzyce, jeszcze zanim cokolwiek zagra.
setSession(false);

function playTrack(silenceSeconds, takeOver) {
  setSession(takeOver);
  lastError = null;

  // Każde nagranie dostaje nowy odtwarzacz, bo stary po przerwaniu przez blokadę może zostać niemy.
  const previous = element;
  const previousUrl = trackUrl;
  const player = new Audio();
  element = player;
  trackUrl = URL.createObjectURL(new Blob([buildTrack(silenceSeconds)], { type: 'audio/wav' }));
  player.preload = 'auto';
  player.addEventListener('error', () => {
    if (player === element) lastError = player.error?.message || `kod ${player.error?.code}`;
  });
  player.addEventListener('ended', () => { if (player === element) setSession(false); });
  player.src = trackUrl;
  player.play().catch((error) => {
    if (player !== element) return;
    lastError = error.name;
    // Nagranie odrzucone: spróbuj chociaż dźwięku zapasowego, jeśli sygnał ma zagrać teraz.
    if (silenceSeconds === 0) beepNow();
  });

  if (previous) {
    previous.pause();
    previous.removeAttribute('src');
    previous.load();
  }
  if (previousUrl) URL.revokeObjectURL(previousUrl);
}

/**
 * Budzi silnik dźwięku na czas przerwy. Działający silnik może zatrzymać muzykę w iPhonie,
 * więc nie może powstawać przy zwykłym dotknięciu ekranu, a po sygnale znów zasypia.
 */
function unlock() {
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

/** Początek przerwy. Tylko w trybie blokady rusza nagranie, bo ono zatrzymuje muzykę. */
export function startRest(seconds, { takeOver = false } = {}) {
  lastError = null;
  setSession(takeOver);
  if (!takeOver) {
    element?.pause();
    unlock();
    return;
  }
  playTrack(Math.min(Math.max(0, seconds), MAX_REST_SECONDS), true);
}

/** Sygnał od razu, do sprawdzenia dźwięku. Tylko w obsłudze stuknięcia. */
export function playNow({ takeOver = false } = {}) {
  lastError = null;
  setSession(takeOver);
  if (takeOver) {
    playTrack(0, true);
    return;
  }
  element?.pause();
  unlock();
  beepNow();
}

function sleepEngine(afterMs = 0) {
  clearTimeout(suspendTimer);
  suspendTimer = setTimeout(() => { context?.suspend?.().catch?.(() => {}); }, afterMs);
}

/** Po zmianie długości przerwy nagranie powstaje od nowa. */
export function syncRest(secondsLeft, options) {
  if (secondsLeft <= 0) stopRest();
  else startRest(secondsLeft, options);
}

export function stopRest() {
  element?.pause();
  setSession(false);
  sleepEngine();
}

/** Czy sygnał wybrzmiał lub właśnie wybrzmiewa z nagrania. Stojące nagranie się nie liczy. */
export function isTrackPlaying() {
  if (!element || lastError || !(element.currentTime > 0)) return false;
  return element.ended || !element.paused;
}

/** Stan odtwarzania pokazywany w Ustawieniach, żeby dało się ustalić, co robi telefon. */
export function status() {
  return {
    state: !element ? 'bez nagrania' : element.ended ? 'zakończone' : element.paused ? 'zatrzymane' : 'gra',
    time: element?.currentTime ?? 0,
    duration: Number.isFinite(element?.duration) ? element.duration : 0,
    error: lastError,
    session: 'audioSession' in navigator ? navigator.audioSession.type : 'brak',
    backup: context?.state ?? 'brak',
  };
}

/** Sygnał grany przez aplikację, nakłada się na muzykę. Odzywa się tylko przy otwartej aplikacji. */
export function beepNow() {
  if (!context) return;
  if (context.state !== 'running') {
    // Kontekst wstrzymany na chwilę, np. przez dźwięk z innej aplikacji, zwykle da się wznowić.
    const paused = context;
    paused.resume().then(() => { if (paused === context) playBeeps(); }).catch(() => { lastError = 'nie można wznowić dźwięku'; });
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
