// Sklep za XP: katalog, saldo i zakupy. Poziom liczy się z całego XP, więc wydawanie go nie obniża.

import { L } from './i18n.js';

const BAR = 'bar';
const PLATES = 'plates';
const CLAMP = 'clamp';
const TITLE = 'title';
const THEME = 'theme';
const INSCRIPTION = 'inscription';
const SHIELD = 'shield';
const ACCENT = 'accent';
const DUST = 'dust';
const SPARK = 'spark';

export const SHOP_SECTIONS = [
  { slot: SHIELD, label: L("Tarcza serii", "Streak shield") },
  { slot: BAR, label: L("Gryf", "Bar"), worn: L("Założony", "Equipped") },
  { slot: PLATES, label: L("Krążki", "Plates"), worn: L("Założone", "Equipped") },
  { slot: CLAMP, label: L("Zaciski", "Collars"), worn: L("Założone", "Equipped") },
  { slot: DUST, label: L("Efekt nowego krążka", "New plate effect"), worn: L("Wybrany", "Selected") },
  { slot: SPARK, label: L("Efekt rekordu", "Record effect"), worn: L("Wybrany", "Selected") },
  { slot: INSCRIPTION, label: L("Napis przy gryfie", "Bar inscription") },
  { slot: TITLE, label: L("Tytuł w profilu", "Profile title"), worn: L("Wybrany", "Selected") },
  { slot: THEME, label: L("Tło aplikacji", "App background"), worn: L("Włączone", "On") },
  { slot: ACCENT, label: L("Kolor przycisków", "Button colour"), worn: L("Włączony", "On") },
];

export const SHOP_ITEMS = [
  { id: 'shield', slot: SHIELD, name: L("Tarcza serii", "Streak shield"), meta: L("Tydzień bez celu nie zeruje tygodni z rzędu", "A week without the goal doesn’t reset your streak"), price: 2000, consumable: true },
  { id: 'bar-steel', slot: BAR, name: L("Stalowy", "Steel"), meta: L("Podstawowy", "Standard"), price: 0 },
  { id: 'bar-copper', slot: BAR, name: L("Miedziany", "Copper"), meta: L("Ciepły połysk", "Warm sheen"), price: 1500 },
  { id: 'bar-black', slot: BAR, name: L("Czarny", "Black"), meta: L("Matowa czerń", "Matte black"), price: 1500 },
  { id: 'bar-chrome', slot: BAR, name: L("Chromowany", "Chrome"), meta: L("Mocny połysk", "High shine"), price: 1500 },
  { id: 'bar-titanium', slot: BAR, name: L("Tytanowy", "Titanium"), meta: L("Chłodny szaroniebieski", "Cool blue-grey"), price: 2000 },
  { id: 'bar-gold', slot: BAR, name: L("Złoty", "Gold"), meta: L("Dla cierpliwych", "For the patient"), price: 5000 },
  { id: 'plates-colour', slot: PLATES, name: L("Kolory z zawodów", "Competition colours"), meta: L("Kolor mówi o liczbie serii", "Colour shows the number of sets"), price: 0 },
  { id: 'plates-stripe', slot: PLATES, name: L("Czarne z paskiem", "Black with stripe"), meta: L("Kolor paska mówi o liczbie serii", "Stripe colour shows the number of sets"), price: 3000 },
  { id: 'plates-iron', slot: PLATES, name: L("Żeliwne", "Cast iron"), meta: L("Jak w piwnicznej siłowni", "Like a basement gym"), price: 3000 },
  { id: 'plates-neon', slot: PLATES, name: L("Neonowe", "Neon"), meta: L("Świecą w kolorze liczby serii", "Glow in the colour of your sets"), price: 5000 },
  { id: 'plates-gold', slot: PLATES, name: L("Złote", "Gold"), meta: L("Na długie miesiące treningów", "For months of training"), price: 10000 },
  { id: 'clamp-steel', slot: CLAMP, name: L("Stalowe", "Steel"), meta: L("Podstawowe", "Standard"), price: 0 },
  { id: 'clamp-red', slot: CLAMP, name: L("Czerwone", "Red"), meta: L("Widać je po wykonaniu celu", "Shown once the goal is met"), price: 800 },
  { id: 'clamp-gold', slot: CLAMP, name: L("Złote", "Gold"), meta: L("Widać je po wykonaniu celu", "Shown once the goal is met"), price: 800 },
  { id: 'clamp-blue', slot: CLAMP, name: L("Niebieskie", "Blue"), meta: L("Widać je po wykonaniu celu", "Shown once the goal is met"), price: 800 },
  { id: 'clamp-green', slot: CLAMP, name: L("Zielone", "Green"), meta: L("Widać je po wykonaniu celu", "Shown once the goal is met"), price: 800 },
  { id: 'clamp-black', slot: CLAMP, name: L("Czarne", "Black"), meta: L("Widać je po wykonaniu celu", "Shown once the goal is met"), price: 800 },
  { id: 'dust-none', slot: DUST, name: L("Bez efektu", "No effect"), meta: L("Sam krążek", "Just the plate"), price: 0 },
  { id: 'dust-chalk', slot: DUST, name: L("Pył magnezji", "Chalk dust"), meta: L("Chmurka, gdy krążek uderza o sztangę", "A puff when the plate hits the bar"), price: 2500 },
  { id: 'spark-none', slot: SPARK, name: L("Bez efektu", "No effect"), meta: L("Sama lista rekordów", "Just the list of records"), price: 0 },
  { id: 'spark-on', slot: SPARK, name: L("Iskry", "Sparks"), meta: L("W podsumowaniu treningu z nowym rekordem", "In the summary of a workout with a new record"), price: 2500 },
  { id: 'inscription', slot: INSCRIPTION, name: L("Własny napis", "Custom inscription"), meta: L("Imię albo motto pod sztangą", "Your name or motto under the bar"), price: 1000 },
  { id: 'title-none', slot: TITLE, name: L("Bez tytułu", "No title"), meta: L("Sam poziom", "Level only"), price: 0 },
  { id: 'title-iron', slot: TITLE, name: L("Żelazny", "Iron"), meta: L("Tytuł przy poziomie", "Title next to your level"), price: 500 },
  { id: 'title-squat', slot: TITLE, name: L("Król przysiadu", "Squat King"), meta: L("Tytuł przy poziomie", "Title next to your level"), price: 500 },
  { id: 'title-deadlift', slot: TITLE, name: L("Mistrz martwego ciągu", "Deadlift Master"), meta: L("Tytuł przy poziomie", "Title next to your level"), price: 500 },
  { id: 'title-steel', slot: TITLE, name: L("Stalowa forma", "Steel Form"), meta: L("Tytuł przy poziomie", "Title next to your level"), price: 500 },
  { id: 'title-no-excuses', slot: TITLE, name: L("Bez wymówek", "No Excuses"), meta: L("Tytuł przy poziomie", "Title next to your level"), price: 500 },
  { id: 'theme-graphite', slot: THEME, name: L("Grafitowe", "Graphite"), meta: L("Podstawowe", "Standard"), price: 0, themeColor: '#181C21' },
  { id: 'theme-black', slot: THEME, name: L("Czarne", "Black"), meta: L("Najlepiej wygląda na ekranie OLED", "Looks best on an OLED screen"), price: 2000, themeColor: '#000000' },
  { id: 'theme-navy', slot: THEME, name: L("Granatowe", "Navy"), meta: L("Ciemny granat", "Dark navy"), price: 2000, themeColor: '#101A2B' },
  { id: 'theme-burgundy', slot: THEME, name: L("Bordowe", "Burgundy"), meta: L("Ciemne wino", "Dark wine"), price: 2000, themeColor: '#1F1216' },
  { id: 'theme-forest', slot: THEME, name: L("Leśne", "Forest"), meta: L("Ciemna zieleń", "Dark green"), price: 2000, themeColor: '#121C17' },
  { id: 'accent-blue', slot: ACCENT, name: L("Niebieski", "Blue"), meta: L("Podstawowy", "Standard"), price: 0 },
  { id: 'accent-orange', slot: ACCENT, name: L("Pomarańczowy", "Orange"), meta: L("Też wykresy i pola wyboru", "Also charts and selections"), price: 1500 },
  { id: 'accent-purple', slot: ACCENT, name: L("Fioletowy", "Purple"), meta: L("Też wykresy i pola wyboru", "Also charts and selections"), price: 1500 },
  { id: 'accent-teal', slot: ACCENT, name: L("Turkusowy", "Teal"), meta: L("Też wykresy i pola wyboru", "Also charts and selections"), price: 1500 },
];

const itemById = (id) => SHOP_ITEMS.find((item) => item.id === id);
const defaultFor = (slot) => SHOP_ITEMS.find((item) => item.slot === slot && item.price === 0);

export const INSCRIPTION_MAX = 16;
export const EMPTY_SHOP = { owned: [], worn: {}, spent: 0, inscription: '', shields: 0, shieldedWeeks: [] };

/** XP do wydania. Usunięcie treningu może zabrać już wydane XP, ale saldo nie schodzi poniżej zera. */
export const spendable = (xp, shop) => Math.max(0, xp - shop.spent);

export const ownsItem = (shop, item) => item.price === 0 || shop.owned.includes(item.id);

/** Przedmiot założony w danym miejscu, a gdy żaden nie jest wybrany, podstawowy. */
export const wornItem = (shop, slot) => itemById(shop.worn[slot]) ?? defaultFor(slot);

/** Kupuje i od razu zakłada. Zwraca nowy stan albo null, gdy się nie da. */
export function buyItem(shop, id, xp) {
  const item = itemById(id);
  if (!item || ownsItem(shop, item) || spendable(xp, shop) < item.price) return null;
  if (item.consumable) return { ...shop, shields: shop.shields + 1, spent: shop.spent + item.price };
  const bought = { ...shop, owned: [...shop.owned, id], spent: shop.spent + item.price };
  return item.slot === INSCRIPTION ? bought : wearItem(bought, id);
}

export function wearItem(shop, id) {
  const item = itemById(id);
  if (!item || !ownsItem(shop, item)) return null;
  return { ...shop, worn: { ...shop.worn, [item.slot]: id } };
}

/** Zużywa po jednej tarczy na każdy podany tydzień. */
export const useShields = (shop, weeks) => ({
  ...shop,
  shields: shop.shields - weeks.length,
  shieldedWeeks: [...shop.shieldedWeeks, ...weeks],
});

export const cleanInscription = (text) => (typeof text === 'string' ? text.trim().slice(0, INSCRIPTION_MAX) : '');

/** Napis widać tylko po jego kupieniu. */
export const shownInscription = (shop) => (shop.owned.includes('inscription') ? shop.inscription : '');

/** Tytuł przy poziomie albo pusty tekst. */
export function shownTitle(shop) {
  const item = wornItem(shop, TITLE);
  return item.price === 0 ? '' : item.name;
}

/** Klasy wyglądu dla całej aplikacji. */
export const wornLooks = (shop) => [BAR, PLATES, CLAMP, THEME, ACCENT].map((slot) => `look-${wornItem(shop, slot).id}`);

/** Kolor paska systemowego, taki sam jak tło aplikacji. */
export const themeColor = (shop) => wornItem(shop, THEME).themeColor;

export const hasChalkDust = (shop) => wornItem(shop, DUST).id === 'dust-chalk';
export const hasRecordSparks = (shop) => wornItem(shop, SPARK).id === 'spark-on';

/** Dane z kopii zapasowej lub bazy. Nieznane przedmioty przepadają, a brak danych to pusty sklep. */
export function cleanShop(raw) {
  const owned = Array.isArray(raw?.owned)
    ? [...new Set(raw.owned)].filter((id) => itemById(id)?.price > 0)
    : [];
  const shop = {
    owned,
    worn: {},
    spent: Number.isFinite(raw?.spent) && raw.spent > 0 ? raw.spent : 0,
    inscription: cleanInscription(raw?.inscription),
    shields: Number.isInteger(raw?.shields) && raw.shields > 0 ? raw.shields : 0,
    shieldedWeeks: Array.isArray(raw?.shieldedWeeks)
      ? raw.shieldedWeeks.filter((week) => typeof week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(week))
      : [],
  };
  for (const id of Object.values(raw?.worn ?? {})) {
    const item = itemById(id);
    if (item && ownsItem(shop, item)) shop.worn[item.slot] = id;
  }
  return shop;
}
