// Sygnał końca przerwy.
//
// iPhone zatrzymuje skrypty strony na zablokowanym ekranie, więc samo odliczanie nie włączy dźwięku.
// Dlatego przy odhaczeniu serii rusza nagranie o długości przerwy: cisza, a na końcu sygnał.
// Nagranie powstaje na każdą przerwę osobno i gra od początku. Bez przewijania, bo iPhone
// może je zignorować i wtedy grałaby sama cisza.
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

function setSession(takeOver) {
  // ambient miesza się z muzyką, playback ma pierwszeństwo, ale może ją zatrzymać.
  if ('audioSession' in navigator) navigator.audioSession.type = takeOver ? 'playback' : 'ambient';
}

function playTrack(silenceSeconds, takeOver) {
  setSession(takeOver);
  lastError = null;
  if (!element) {
    element = new Audio();
    element.preload = 'auto';
    element.addEventListener('error', () => { lastError = element.error?.message || `kod ${element.error?.code}`; });
  }
  if (trackUrl) URL.revokeObjectURL(trackUrl);
  trackUrl = URL.createObjectURL(new Blob([buildTrack(silenceSeconds)], { type: 'audio/wav' }));
  element.src = trackUrl;
  element.play().catch((error) => {
    lastError = error.name;
    // Nagranie odrzucone: spróbuj chociaż dźwięku zapasowego, jeśli sygnał ma zagrać teraz.
    if (silenceSeconds === 0) beepNow();
  });
}

/** Przygotowuje zapasowy dźwięk. Wywoływane przy każdym dotknięciu ekranu. */
export function unlock() {
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (!Context) return;
  context ??= new Context();
  if (context.state !== 'running') context.resume().catch(() => {});
}

/** Rusza nagranie: sygnał zagra za `seconds` sekund. Tylko w obsłudze stuknięcia. */
export function startRest(seconds, { takeOver = false } = {}) {
  playTrack(Math.min(Math.max(0, seconds), MAX_REST_SECONDS), takeOver);
}

/** Po zmianie długości przerwy nagranie powstaje od nowa. */
export function syncRest(secondsLeft, options) {
  if (secondsLeft <= 0) stopRest();
  else startRest(secondsLeft, options);
}

export function stopRest() {
  element?.pause();
}

/** Czy sygnał wybrzmiał lub właśnie wybrzmiewa z nagrania. Stojące nagranie się nie liczy. */
export function isTrackPlaying() {
  if (!element || lastError || !(element.currentTime > 0)) return false;
  return element.ended || !element.paused;
}

/** Stan odtwarzania pokazywany w Ustawieniach, żeby dało się ustalić, co robi telefon. */
export function status() {
  return {
    state: !element ? 'nie uruchomiono' : element.ended ? 'zakończone' : element.paused ? 'zatrzymane' : 'gra',
    time: element?.currentTime ?? 0,
    duration: Number.isFinite(element?.duration) ? element.duration : 0,
    error: lastError,
    session: 'audioSession' in navigator ? navigator.audioSession.type : 'brak',
    backup: context?.state ?? 'brak',
  };
}

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
