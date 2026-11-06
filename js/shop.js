// Sklep za XP: katalog, saldo i zakupy. Poziom liczy się z całego XP, więc wydawanie go nie obniża.

const BAR = 'bar';
const PLATES = 'plates';
const CLAMP = 'clamp';
const TITLE = 'title';
const THEME = 'theme';
const INSCRIPTION = 'inscription';
const SHIELD = 'shield';

export const SHOP_SECTIONS = [
  { slot: SHIELD, label: 'Tarcza serii' },
  { slot: BAR, label: 'Gryf', worn: 'Założony' },
  { slot: PLATES, label: 'Krążki', worn: 'Założone' },
  { slot: CLAMP, label: 'Zaciski', worn: 'Założone' },
  { slot: INSCRIPTION, label: 'Napis przy gryfie' },
  { slot: TITLE, label: 'Tytuł w profilu', worn: 'Wybrany' },
  { slot: THEME, label: 'Tło aplikacji', worn: 'Włączone' },
];

export const SHOP_ITEMS = [
  { id: 'shield', slot: SHIELD, name: 'Tarcza serii', meta: 'Tydzień bez celu nie zeruje tygodni z rzędu', price: 2000, consumable: true },
  { id: 'bar-steel', slot: BAR, name: 'Stalowy', meta: 'Podstawowy', price: 0 },
  { id: 'bar-copper', slot: BAR, name: 'Miedziany', meta: 'Ciepły połysk', price: 1500 },
  { id: 'bar-black', slot: BAR, name: 'Czarny', meta: 'Matowa czerń', price: 1500 },
  { id: 'plates-colour', slot: PLATES, name: 'Kolory z zawodów', meta: 'Kolor mówi o liczbie serii', price: 0 },
  { id: 'plates-iron', slot: PLATES, name: 'Żeliwne', meta: 'Jak w piwnicznej siłowni', price: 3000 },
  { id: 'plates-gold', slot: PLATES, name: 'Złote', meta: 'Na długie miesiące treningów', price: 10000 },
  { id: 'clamp-steel', slot: CLAMP, name: 'Stalowe', meta: 'Podstawowe', price: 0 },
  { id: 'clamp-red', slot: CLAMP, name: 'Czerwone', meta: 'Widać je po wykonaniu celu', price: 800 },
  { id: 'clamp-gold', slot: CLAMP, name: 'Złote', meta: 'Widać je po wykonaniu celu', price: 800 },
  { id: 'inscription', slot: INSCRIPTION, name: 'Własny napis', meta: 'Imię albo motto pod sztangą', price: 1000 },
  { id: 'title-none', slot: TITLE, name: 'Bez tytułu', meta: 'Sam poziom', price: 0 },
  { id: 'title-iron', slot: TITLE, name: 'Żelazny', meta: 'Tytuł przy poziomie', price: 500 },
  { id: 'title-squat', slot: TITLE, name: 'Król przysiadu', meta: 'Tytuł przy poziomie', price: 500 },
  { id: 'title-deadlift', slot: TITLE, name: 'Mistrz martwego ciągu', meta: 'Tytuł przy poziomie', price: 500 },
  { id: 'title-steel', slot: TITLE, name: 'Stalowa forma', meta: 'Tytuł przy poziomie', price: 500 },
  { id: 'title-no-excuses', slot: TITLE, name: 'Bez wymówek', meta: 'Tytuł przy poziomie', price: 500 },
  { id: 'theme-graphite', slot: THEME, name: 'Grafitowe', meta: 'Podstawowe', price: 0 },
  { id: 'theme-black', slot: THEME, name: 'Czarne', meta: 'Najlepiej wygląda na ekranie OLED', price: 2000 },
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
export const wornLooks = (shop) => [BAR, PLATES, CLAMP, THEME].map((slot) => `look-${wornItem(shop, slot).id}`);

export const isBlackTheme = (shop) => wornItem(shop, THEME).id === 'theme-black';

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
