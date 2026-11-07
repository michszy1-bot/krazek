// Język aplikacji: polski albo angielski. Teksty stoją parami w kodzie, np. L('Zapisz', 'Save'),
// więc przy każdej zmianie widać obie wersje. Zmiana języka przeładowuje aplikację,
// dlatego stałe z tekstami mogą powstać raz, przy wczytaniu modułu.

const STORAGE_KEY = 'forma-lang';
const SUPPORTED = ['pl', 'en'];

export const LANGUAGES = [
  { id: 'pl', label: 'Polski' },
  { id: 'en', label: 'English' },
];

/**
 * Język z adresu (?lang=en), potem zapisany wybór, a na końcu język telefonu.
 * Poza przeglądarką, czyli w testach, zawsze polski.
 */
function startLanguage() {
  if (typeof window === 'undefined') return 'pl';
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (SUPPORTED.includes(fromUrl)) {
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
  } catch {
    // Bez dostępu do pamięci przeglądarki decyduje język telefonu.
  }
  return (window.navigator?.language ?? 'pl').toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

let current = startLanguage();

export const language = () => current;
export const isEnglish = () => current === 'en';

/** Tekst w bieżącym języku. */
export const L = (pl, en) => (current === 'en' ? en : pl);

/** Oznaczenie dla Intl: liczby, daty i odmiana. Angielski brytyjski, bo ciężar jest w kilogramach. */
export const locale = () => (current === 'en' ? 'en-GB' : 'pl-PL');

/** Zapamiętuje język i przeładowuje aplikację, żeby wszystkie teksty powstały od nowa. */
export function setLanguage(next) {
  if (!SUPPORTED.includes(next)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Zmiana zadziała do zamknięcia aplikacji.
  }
  const url = new URL(window.location.href);
  url.searchParams.delete('lang');
  window.location.replace(url.toString());
}

/** Tylko do testów: przełącza język bez przeładowania. */
export function useLanguageInTests(next) {
  current = next;
}
