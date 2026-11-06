// Profil i dziennik wagi: reguły bez zależności od DOM, więc da się je testować w Node.

export const WEIGHT_MIN = 20;
export const WEIGHT_MAX = 400;
export const HEIGHT_MIN = 50;
export const HEIGHT_MAX = 260;

export const EMPTY_PROFILE = { birthDate: null, heightCm: null };

/** Czy to istniejący dzień kalendarza w zapisie RRRR-MM-DD. Odrzuca np. 2026-02-30. */
export function isDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Początek dnia w czasie lokalnym. new Date('RRRR-MM-DD') dałby północ UTC, czyli czasem inny dzień. */
export function dayTime(day) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).getTime();
}

/** Wiek w pełnych latach. Urodziny dziś liczą się już jako kolejny rok. */
export function ageOn(birthDate, now = new Date()) {
  const [year, month, day] = birthDate.split('-').map(Number);
  const hadBirthday = now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day);
  return now.getFullYear() - year - (hadBirthday ? 0 : 1);
}

export const roundWeight = (kg) => Math.round(kg * 10) / 10;

/**
 * Wpisy od najnowszego, najwyżej jeden na dzień: wpis z tego samego dnia zastępuje poprzedni.
 * movedFrom to dotychczasowy dzień wpisu, gdy przy edycji zmieniono mu datę.
 */
export function putWeight(list, entry, movedFrom = null) {
  return [...list.filter((item) => item.day !== entry.day && item.day !== movedFrom), entry]
    .sort((a, b) => (a.day < b.day ? 1 : -1));
}

export const removeWeight = (list, day) => list.filter((item) => item.day !== day);

/** Zmiana względem wcześniejszego wpisu albo null, gdy to pierwszy wpis. */
export function weightChange(list, index) {
  const earlier = list[index + 1];
  return earlier ? roundWeight(list[index].kg - earlier.kg) : null;
}

const validWeight = (kg) => typeof kg === 'number' && kg >= WEIGHT_MIN && kg <= WEIGHT_MAX;

/** Dane z pliku kopii. Niepoprawne pole profilu przepada, bo użytkownik łatwo wpisze je ponownie. */
export function cleanProfile(raw) {
  const height = raw?.heightCm;
  return {
    birthDate: isDay(raw?.birthDate) ? raw.birthDate : null,
    heightCm: typeof height === 'number' && height >= HEIGHT_MIN && height <= HEIGHT_MAX ? height : null,
  };
}

/** Wpisy wagi z pliku kopii. Zwraca null, gdy któryś jest niepoprawny. */
export function cleanWeights(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.some((item) => !isDay(item?.day) || !validWeight(item?.kg))) return null;
  return raw.reduce((list, { day, kg }) => putWeight(list, { day, kg }), []);
}
