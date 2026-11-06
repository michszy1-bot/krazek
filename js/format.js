// Formatowanie po polsku i parsowanie wpisów. Bez zależności od DOM, więc da się to testować w Node.

const numberFmt = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });
const oneDecimal = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });
const pluralRules = new Intl.PluralRules('pl-PL');

export const fmtNum = (n) => numberFmt.format(n);

/** Tekst do pola formularza: 82,5 zamiast 82.5, pusty dla braku wartości. */
export const inputValue = (n) => (n == null ? '' : String(n).replace('.', ','));

/** Czyta liczbę wpisaną z przecinkiem lub kropką. Zwraca null, gdy wpis jest niepoprawny. */
export function parseNum(raw, { max = Infinity, integer = false } = {}) {
  if (raw == null) return null;
  const text = String(raw).trim().replace(',', '.');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value > max) return null;
  return integer ? Math.round(value) : value;
}

export function plural(n, one, few, many) {
  if (!Number.isInteger(n)) return few;
  const form = pluralRules.select(n);
  if (form === 'one') return one;
  return form === 'few' ? few : many;
}

export const countOf = (n, one, few, many) => `${fmtNum(n)} ${plural(n, one, few, many)}`;

export function fmtVolume(kg) {
  if (kg >= 10000) return `${oneDecimal.format(kg / 1000)} t`;
  return `${fmtNum(Math.round(kg))} kg`;
}

/** 90 -> 1:30, 3700 -> 1:01:40 */
export function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Czas treningu słownie: 58 min, 1 h 12 min. */
export function fmtDuration(ms) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${Math.floor(minutes / 60)} h`;
}

function setResult(set, type, compact) {
  if (type === 'time') return set.seconds ? fmtClock(set.seconds) : '';
  if (type === 'bodyweight') {
    if (!set.reps) return '';
    if (set.weight > 0) return compact ? `+${fmtNum(set.weight)} × ${set.reps}` : `+${fmtNum(set.weight)} kg × ${set.reps}`;
    return compact ? `× ${set.reps}` : countOf(set.reps, 'powtórzenie', 'powtórzenia', 'powtórzeń');
  }
  if (set.weight == null || !set.reps) return '';
  return compact ? `${fmtNum(set.weight)} × ${set.reps}` : `${fmtNum(set.weight)} kg × ${set.reps}`;
}

/** Skrócony zapis serii. `compact` pomija jednostki i dopisuje ocenę wysiłku, np. do kolumny "Poprzednio". */
export function fmtSet(set, type, { compact = false } = {}) {
  if (!set) return '';
  const result = setResult(set, type, compact);
  return compact && result && set.rpe ? `${result} @${set.rpe}` : result;
}

const signed = (value, unit) => `${value > 0 ? '+' : '−'}${fmtNum(Math.abs(value))} ${unit}`;

/** Zmiana względem poprzedniego razu słownie, np. +2,5 kg, −1 powt. albo RPE 9 → 8. */
export function fmtSetChange({ weight, reps, seconds, rpe }) {
  const parts = [];
  if (weight) parts.push(signed(weight, 'kg'));
  if (reps) parts.push(signed(reps, 'powt.'));
  if (seconds) parts.push(signed(seconds, 's'));
  if (rpe) parts.push(`RPE ${rpe.from} → ${rpe.to}`);
  return parts.join(', ') || 'Bez zmian';
}

/** Wartość wskaźnika lub rekordu z jednostką. */
export function fmtUnit(value, unit) {
  if (unit === 'seconds') return fmtClock(value);
  if (unit === 'volume') return fmtVolume(value);
  if (unit === 'reps') return countOf(Math.round(value), 'powtórzenie', 'powtórzenia', 'powtórzeń');
  return `${oneDecimal.format(value)} kg`;
}

// --- Daty (zawsze w czasie lokalnym, tydzień od poniedziałku) ---

const pad = (n) => String(n).padStart(2, '0');

export const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date) {
  const d = startOfDay(date);
  return addDays(d, -((d.getDay() + 6) % 7));
}

const dayLongFmt = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
const dayMediumFmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
const dayShortFmt = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' });
const monthFmt = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' });

export const fmtDayLong = (d) => dayLongFmt.format(new Date(d));
export const fmtDayMedium = (d) => dayMediumFmt.format(new Date(d));
export const fmtDayShort = (d) => dayShortFmt.format(new Date(d));
export const fmtTime = (d) => timeFmt.format(new Date(d));
export const fmtMonth = (d) => monthFmt.format(new Date(d));

/**
 * Domyślny początek wcześniejszego treningu: wybrany dzień (albo wczoraj) o 18:00.
 * Jeśli wypadłoby to w przyszłości, czyli dziś przed 18:00, trening kończy się teraz.
 */
export function pastWorkoutStart(day, now = new Date(), lengthMs = 3600000) {
  const start = day ? new Date(day) : addDays(now, -1);
  start.setHours(18, 0, 0, 0);
  return start.getTime() > now.getTime() ? now.getTime() - lengthMs : start.getTime();
}

/** Wartość do pola datetime-local. */
export function toLocalInput(date) {
  const d = new Date(date);
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
