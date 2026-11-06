// Sygnał końca przerwy.
//
// iPhone zatrzymuje skrypty strony na zablokowanym ekranie, więc samo odliczanie nie włączy dźwięku.
// Dlatego przy odhaczeniu serii rusza nagranie: długa cisza, a na końcu sygnał. Nagranie startuje od
// miejsca, po którym do sygnału zostaje dokładnie tyle, ile trwa przerwa.
// Bez dotknięcia ekranu Safari nie pozwoli niczego zagrać, stąd wywołania w obsłudze stuknięć.

export const SILENCE_SECONDS = 600;
const SAMPLE_RATE = 8000;
const HEADER_BYTES = 44;
const BEEPS = [
  { hz: 1000, seconds: 0.18 },
  { hz: 1000, seconds: 0.18 },
  { hz: 1500, seconds: 0.4 },
];
const GAP_SECONDS = 0.09;

/** Plik WAV (8 bitów, mono): cisza, a po niej sygnał. Czysta funkcja, testowana w Node. */
export function buildTrack(silenceSeconds = SILENCE_SECONDS, rate = SAMPLE_RATE) {
  const signalSeconds = BEEPS.reduce((sum, beep) => sum + beep.seconds + GAP_SECONDS, 0) + 0.2;
  const samples = Math.round((silenceSeconds + signalSeconds) * rate);
  const bytes = new Uint8Array(HEADER_BYTES + samples).fill(128); // 128 to cisza w 8-bitowym WAV
  const view = new DataView(bytes.buffer);
  const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, samples, true);

  let position = Math.round(silenceSeconds * rate);
  for (const { hz, seconds } of BEEPS) {
    const length = Math.round(seconds * rate);
    const fade = Math.round(0.005 * rate); // bez tego słychać trzaski na brzegach
    for (let i = 0; i < length; i += 1) {
      const envelope = Math.min(1, i / fade, (length - i) / fade);
      bytes[HEADER_BYTES + position + i] = Math.round(128 + 118 * envelope * Math.sin((2 * Math.PI * hz * i) / rate));
    }
    position += length + Math.round(GAP_SECONDS * rate);
  }
  return bytes;
}

let element = null;
let context = null;

function setSession(takeOver) {
  // ambient miesza się z muzyką, playback ma pierwszeństwo, ale może ją zatrzymać.
  if ('audioSession' in navigator) navigator.audioSession.type = takeOver ? 'playback' : 'ambient';
}

function trackElement() {
  if (!element) {
    element = new Audio(URL.createObjectURL(new Blob([buildTrack()], { type: 'audio/wav' })));
    element.preload = 'auto';
  }
  return element;
}

function playFrom(position, takeOver) {
  setSession(takeOver);
  const audio = trackElement();
  const seek = () => { audio.currentTime = Math.max(0, position); };
  if (audio.readyState >= 1) seek();
  else audio.addEventListener('loadedmetadata', seek, { once: true });
  audio.play().catch(() => {});
}

/** Przygotowuje zapasowy dźwięk. Wywoływane przy każdym dotknięciu ekranu. */
export function unlock() {
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (!Context) return;
  context ??= new Context();
  if (context.state !== 'running') context.resume().catch(() => {});
}

/** Rusza odliczanie w nagraniu: sygnał zagra za `seconds` sekund. Tylko w obsłudze stuknięcia. */
export function startRest(seconds, { takeOver = false } = {}) {
  playFrom(SILENCE_SECONDS - Math.min(seconds, SILENCE_SECONDS), takeOver);
}

/** Po zmianie długości przerwy przesuwa nagranie. */
export function syncRest(secondsLeft, options) {
  if (secondsLeft <= 0) stopRest();
  else startRest(secondsLeft, options);
}

export function stopRest() {
  element?.pause();
}

export const isTrackPlaying = () => Boolean(element && !element.paused && !element.ended);

/** Zapasowy sygnał, gdy nagranie nie działa. Odzywa się tylko przy otwartej aplikacji. */
export function beepNow() {
  if (!context || context.state !== 'running') return;
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
}
