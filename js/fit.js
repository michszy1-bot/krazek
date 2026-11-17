// Zapis treningu do pliku .FIT (Garmin FIT SDK, protokół 2.0), żeby można go było wczytać
// w aplikacjach zegarków, np. w Zepp przez „Import danych treningowych”.
// Serie nie mają własnych godzin, więc rozkładam je równo na czas treningu.

import { FIT_EXERCISES, FIT_MUSCLE_CATEGORY } from './fit-exercises.js';

const FIT_EPOCH = Date.UTC(1989, 11, 31) / 1000; // początek liczenia czasu w FIT
const PROFILE_VERSION = 2132;

// Typy pól FIT: rozmiar w bajtach i wartość „brak”.
const T = {
  enum: { id: 0x00, size: 1, none: 0xff },
  uint8: { id: 0x02, size: 1, none: 0xff },
  uint16: { id: 0x84, size: 2, none: 0xffff },
  uint32: { id: 0x86, size: 4, none: 0xffffffff },
  uint32z: { id: 0x8c, size: 4, none: 0 },
};

const CRC_TABLE = [0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400];

export function fitCrc(bytes, start = 0, end = bytes.length) {
  let crc = 0;
  for (let i = start; i < end; i += 1) {
    const byte = bytes[i];
    let tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[byte & 0xf];
    tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[(byte >> 4) & 0xf];
  }
  return crc;
}

// Komunikaty FIT: numer globalny i pola [nazwa, numer pola, typ].
const MESSAGES = {
  fileId: [0, [['type', 0, T.enum], ['manufacturer', 1, T.uint16], ['product', 2, T.uint16], ['serial', 3, T.uint32z], ['created', 4, T.uint32]]],
  event: [21, [['timestamp', 253, T.uint32], ['event', 0, T.enum], ['eventType', 1, T.enum]]],
  record: [20, [['timestamp', 253, T.uint32]]],
  set: [225, [['timestamp', 254, T.uint32], ['duration', 0, T.uint32], ['reps', 3, T.uint16], ['weight', 4, T.uint16], ['setType', 5, T.uint8], ['start', 6, T.uint32], ['category', 7, T.uint16], ['subtype', 8, T.uint16], ['index', 10, T.uint16]]],
  lap: [19, [['timestamp', 253, T.uint32], ['event', 0, T.enum], ['eventType', 1, T.enum], ['start', 2, T.uint32], ['elapsed', 7, T.uint32], ['timer', 8, T.uint32], ['sport', 25, T.enum], ['subSport', 39, T.enum], ['index', 254, T.uint16]]],
  session: [18, [['timestamp', 253, T.uint32], ['event', 0, T.enum], ['eventType', 1, T.enum], ['start', 2, T.uint32], ['sport', 5, T.enum], ['subSport', 6, T.enum], ['elapsed', 7, T.uint32], ['timer', 8, T.uint32], ['firstLap', 25, T.uint16], ['laps', 26, T.uint16], ['index', 254, T.uint16]]],
  activity: [34, [['timestamp', 253, T.uint32], ['timer', 0, T.uint32], ['sessions', 1, T.uint16], ['type', 2, T.enum], ['event', 3, T.enum], ['eventType', 4, T.enum], ['local', 5, T.uint32]]],
};

const SPORT_TRAINING = 10;
const SUB_SPORT_STRENGTH = 20;
const EVENT = { timer: 0, session: 8, lap: 9, activity: 26 };
const EVENT_TYPE = { start: 0, stop: 1, stopAll: 4 };

class FitWriter {
  constructor() {
    this.bytes = [];
    this.local = new Map();
  }

  push(value, size) {
    for (let i = 0; i < size; i += 1) this.bytes.push((value / 2 ** (8 * i)) & 0xff);
  }

  write(name, values) {
    const [global, fields] = MESSAGES[name];
    if (!this.local.has(name)) {
      const slot = this.local.size;
      this.local.set(name, slot);
      this.bytes.push(0x40 | slot, 0, 0); // nagłówek definicji, zarezerwowany bajt, little endian
      this.push(global, 2);
      this.bytes.push(fields.length);
      for (const [, num, type] of fields) this.bytes.push(num, type.size, type.id);
    }
    this.bytes.push(this.local.get(name));
    for (const [key, , type] of fields) {
      const value = values[key];
      this.push(value == null || !Number.isFinite(value) ? type.none : Math.max(0, Math.round(value)), type.size);
    }
  }

  finish() {
    const header = [14, 0x20];
    const size = this.bytes.length;
    const head = new Uint8Array(14);
    head.set(header);
    head[2] = PROFILE_VERSION & 0xff;
    head[3] = PROFILE_VERSION >> 8;
    for (let i = 0; i < 4; i += 1) head[4 + i] = (size >>> (8 * i)) & 0xff;
    head.set([0x2e, 0x46, 0x49, 0x54], 8); // ".FIT"
    const headCrc = fitCrc(head, 0, 12);
    head[12] = headCrc & 0xff;
    head[13] = headCrc >> 8;
    const out = new Uint8Array(14 + size + 2);
    out.set(head);
    out.set(this.bytes, 14);
    const crc = fitCrc(out, 0, 14 + size);
    out[14 + size] = crc & 0xff;
    out[15 + size] = crc >> 8;
    return out;
  }
}

const fitTime = (ms) => Math.floor(ms / 1000) - FIT_EPOCH;

/**
 * Plik .FIT z jednym treningiem siłowym. Serie robocze i rozgrzewkowe idą jako serie aktywne,
 * a odstępy między nimi jako przerwy. Ciężar w kilogramach, tak jak w bazie Formy.
 */
export function workoutToFit(workout, { localTime = true, exerciseOf = () => null } = {}) {
  const start = workout.startedAt;
  const end = Math.max(workout.endedAt || start + 3600000, start + 60000);
  const sets = workout.exercises.flatMap((item) => {
    const known = FIT_EXERCISES[item.exerciseId];
    const category = known ? known[0] : FIT_MUSCLE_CATEGORY[exerciseOf(item.exerciseId)?.muscle];
    return item.sets.map((set) => ({ ...set, category, subtype: known?.[1] }));
  });
  const offset = -new Date(start).getTimezoneOffset() * 60;
  // Zepp pokazuje godzinę z pliku tak, jakby była czasem lokalnym, więc przesuwam ją o strefę.
  const shift = localTime ? offset : 0;
  const t0 = fitTime(start) + shift;
  const t1 = fitTime(end) + shift;
  const total = t1 - t0;

  const fit = new FitWriter();
  fit.write('fileId', { type: 4, manufacturer: 255, product: 0, serial: (start / 1000) >>> 0, created: t1 });
  fit.write('event', { timestamp: t0, event: EVENT.timer, eventType: EVENT_TYPE.start });
  fit.write('record', { timestamp: t0 });

  // Każda seria dostaje równy kawałek treningu: najpierw wysiłek, potem przerwa do następnej.
  const slot = sets.length ? total / sets.length : total;
  const laps = [];
  let index = 0;
  sets.forEach((set, i) => {
    const slotStart = t0 + Math.round(i * slot);
    const slotEnd = t0 + Math.round((i + 1) * slot);
    const work = Math.min(slotEnd - slotStart, set.seconds > 0 ? set.seconds : Math.min(45, Math.max(10, (set.reps || 8) * 4)));
    fit.write('set', {
      timestamp: slotStart + work, start: slotStart, duration: work * 1000, setType: 1, index: index++,
      category: set.category, subtype: set.subtype,
      reps: set.reps > 0 ? set.reps : null,
      weight: set.weight > 0 ? set.weight * 16 : null,
    });
    // Zepp liczy serie po okrążeniach, więc każda seria z przerwą po niej to osobne okrążenie.
    laps.push({ start: slotStart, end: slotEnd });
    if (slotEnd - slotStart - work > 0) {
      fit.write('set', { timestamp: slotEnd, start: slotStart + work, duration: (slotEnd - slotStart - work) * 1000, setType: 0, index: index++ });
    }
  });

  fit.write('record', { timestamp: t1 });
  fit.write('event', { timestamp: t1, event: EVENT.timer, eventType: EVENT_TYPE.stopAll });
  const sport = { sport: SPORT_TRAINING, subSport: SUB_SPORT_STRENGTH };
  if (!laps.length) laps.push({ start: t0, end: t1 });
  laps.forEach((lap, i) => {
    const length = (lap.end - lap.start) * 1000;
    fit.write('lap', { ...sport, timestamp: lap.end, start: lap.start, elapsed: length, timer: length, event: EVENT.lap, eventType: EVENT_TYPE.stop, index: i });
  });
  fit.write('session', { ...sport, timestamp: t1, start: t0, elapsed: total * 1000, timer: total * 1000, event: EVENT.session, eventType: EVENT_TYPE.stop, firstLap: 0, laps: laps.length, index: 0 });
  fit.write('activity', { timestamp: t1, timer: total * 1000, sessions: 1, type: 0, event: EVENT.activity, eventType: EVENT_TYPE.stop, local: t1 + offset - shift });
  return fit.finish();
}

/** Nazwa pliku z datą treningu, np. forma-2026-11-17.fit. */
export function fitFileName(workout) {
  const d = new Date(workout.startedAt);
  const pad = (n) => String(n).padStart(2, '0');
  return `forma-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.fit`;
}

// --- Odczyt plików FIT z zegarków i opasek (np. Zepp → Eksportuj dane → format FIT) ---

const INVALID = { 1: [0xff], 2: [0xffff], 4: [0xffffffff] };

/** Prosty dekoder FIT: zwraca komunikaty jako { numer globalny: [ { numer pola: wartość } ] }. */
export function readFit(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 14 || String.fromCharCode(...bytes.slice(8, 12)) !== '.FIT') throw new Error('not-fit');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = bytes[0];
  const end = Math.min(bytes.length, headerSize + view.getUint32(4, true));
  const defs = new Map();
  const out = {};
  let pos = headerSize;
  let lastTime = 0;
  while (pos < end) {
    const head = bytes[pos++];
    if (!(head & 0x80) && head & 0x40) {
      const little = bytes[pos + 1] === 0;
      const global = view.getUint16(pos + 2, little);
      const count = bytes[pos + 4];
      pos += 5;
      const fields = [];
      for (let i = 0; i < count; i += 1, pos += 3) fields.push({ num: bytes[pos], size: bytes[pos + 1], type: bytes[pos + 2] });
      let extra = 0;
      if (head & 0x20) {
        const devCount = bytes[pos++];
        for (let i = 0; i < devCount; i += 1, pos += 3) extra += bytes[pos + 1];
      }
      defs.set(head & 0x0f, { global, little, fields, extra });
      continue;
    }
    const compressed = head & 0x80;
    const def = defs.get(compressed ? (head >> 5) & 0x03 : head & 0x0f);
    if (!def) throw new Error('bad-fit');
    const values = {};
    for (const field of def.fields) {
      const { size } = field;
      if (size === 1 || size === 2 || size === 4) {
        const signed = (field.type & 0x1f) === 0x01 || (field.type & 0x1f) === 0x03 || (field.type & 0x1f) === 0x05;
        if (signed) {
          const value = size === 1 ? view.getInt8(pos) : size === 2 ? view.getInt16(pos, def.little) : view.getInt32(pos, def.little);
          if (value !== 2 ** (size * 8 - 1) - 1) values[field.num] = value;
        } else {
          const value = size === 1 ? bytes[pos] : size === 2 ? view.getUint16(pos, def.little) : view.getUint32(pos, def.little);
          if (!INVALID[size].includes(value)) values[field.num] = value;
        }
      }
      pos += size;
    }
    pos += def.extra;
    if (values[253] != null) lastTime = values[253];
    if (compressed) {
      const offset = head & 0x1f;
      lastTime += (offset - (lastTime & 0x1f) + 0x20) & 0x1f;
      values[253] = lastTime;
    }
    (out[def.global] ||= []).push(values);
  }
  return out;
}

// Strefy tętna jak w Zepp: od 50, 60, 70, 80 i 90% tętna maksymalnego.
export const HR_ZONES = [0.5, 0.6, 0.7, 0.8, 0.9];

/** Granice stref w uderzeniach na minutę dla danego tętna maksymalnego. */
export const zoneBounds = (maxHr) => HR_ZONES.map((share) => Math.floor(maxHr * share));

/**
 * Dane z opaski do zapisania przy treningu: tętno, kalorie, efekt i obciążenie treningu,
 * czas w strefach tętna i krzywa tętna co 15 s. Serie i ćwiczenia zostają z Formy.
 * Godzin nie biorę, bo Zepp zapisuje je z przesunięciem strefy czasowej.
 */
export function bandFromFit(input, { maxHr = 190 } = {}) {
  const messages = readFit(input);
  const session = messages[18]?.[0];
  if (!session) throw new Error('no-session');
  const start = session[2] ?? messages[20]?.[0]?.[253];
  const records = (messages[20] || []).filter((r) => r[3] > 0 && r[253] != null);
  const buckets = new Map();
  for (const r of records) {
    const key = Math.floor((r[253] - start) / 15);
    const b = buckets.get(key) || [0, 0];
    b[0] += r[3];
    b[1] += 1;
    buckets.set(key, b);
  }
  const hr = [...buckets.entries()].filter(([key]) => key >= 0).sort((a, b) => a[0] - b[0]).map(([key, [sum, n]]) => [key * 15, Math.round(sum / n)]);
  // Czas w strefach z pomiarów co sekundę; przerwa w zapisie liczy się najwyżej jako 5 s.
  const bounds = zoneBounds(maxHr);
  const zones = [0, 0, 0, 0, 0];
  records.forEach((r, i) => {
    const next = records[i + 1];
    const seconds = next ? Math.min(5, Math.max(0, next[253] - r[253])) : 1;
    let zone = -1;
    bounds.forEach((bound, z) => { if (r[3] >= bound) zone = z; });
    if (zone >= 0) zones[zone] += seconds;
  });
  const band = {
    avgHr: session[16] ?? null,
    maxHr: session[17] ?? null,
    minHr: session[64] ?? null,
    kcal: session[11] ?? null,
    effect: session[24] != null ? session[24] / 10 : null,
    anaerobic: session[137] != null ? session[137] / 10 : null,
    load: session[168] != null ? Math.round(session[168] / 65536) : null,
    seconds: session[7] != null ? Math.round(session[7] / 1000) : null,
    date: start != null ? (start + FIT_EPOCH) * 1000 : null,
    zoneMaxHr: maxHr,
    zones,
    hr,
  };
  if (band.avgHr == null && band.kcal == null && !hr.length) throw new Error('empty');
  return band;
}
