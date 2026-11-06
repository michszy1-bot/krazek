// Rysuje ikony aplikacji (ukośny pomarańczowy hantel) i zapisuje je jako PNG, bez bibliotek.

import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../icons/', import.meta.url));

const BG = [24, 28, 33];
const ORANGE = [249, 115, 22];
const AMBER = [255, 170, 64];
const STEEL = [200, 207, 214];

// Hantel mieści się w kole o promieniu 0,8 połowy ikony, czyli w strefie bezpiecznej ikon maskowanych.
const SCALE = 0.95;
const PARTS = [
  { from: 0.2, to: 0.42, half: 0.52, round: 0.07, color: ORANGE },
  { from: 0.445, to: 0.6, half: 0.36, round: 0.06, color: AMBER },
  { from: 0.625, to: 0.72, half: 0.15, round: 0.04, color: STEEL },
  { from: 0, to: 0.65, half: 0.09, round: 0, color: STEEL }, // gryf, pod krążkami
];

function insideRounded(u, v, { from, to, half, round }) {
  const centerU = (from + to) / 2;
  const qu = Math.abs(u - centerU) - ((to - from) / 2 - round);
  const qv = Math.abs(v) - (half - round);
  return Math.hypot(Math.max(qu, 0), Math.max(qv, 0)) + Math.min(Math.max(qu, qv), 0) <= round;
}

function colorAt(x, y) {
  // Osie obrócone o 45 stopni, a hantel jest symetryczny, więc wystarcza jedna jego połowa.
  const u = (Math.abs(x - y) / Math.SQRT2) * SCALE;
  const v = ((x + y) / Math.SQRT2) * SCALE;
  for (const part of PARTS) {
    if (insideRounded(u, v, part)) return part.color;
  }
  return BG;
}

function crc32(buf) {
  let crc = -1;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function render(size) {
  const samples = 6; // wygładzanie krawędzi
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const dx = ((x + (sx + 0.5) / samples) / size - 0.5) * 2;
          const dy = ((y + (sy + 0.5) / samples) / size - 0.5) * 2;
          const color = colorAt(dx, dy);
          for (let c = 0; c < 3; c += 1) sum[c] += color[c];
        }
      }
      for (let c = 0; c < 3; c += 1) raw[offset + c] = Math.round(sum[c] / samples ** 2);
      offset += 3;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bity na kanał
  header[9] = 2; // RGB, bez przezroczystości, której iOS w ikonach nie lubi
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const size of [180, 192, 512]) {
  writeFileSync(`${OUT}icon-${size}.png`, render(size));
  console.log(`icon-${size}.png`);
}
