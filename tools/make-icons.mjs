// Rysuje ikony aplikacji (krążek widziany z przodu) i zapisuje je jako PNG, bez bibliotek.

import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../icons/', import.meta.url));

const BG = [24, 28, 33];
const PLATE = [47, 107, 234];
const RIM = [31, 77, 176];
const RAISED = [78, 132, 245];
const HOLE = [24, 28, 33];
const SLEEVE = [190, 197, 205];

function colorAt(r) {
  // Promień liczony względem połowy ikony. Krążek mieści się w strefie bezpiecznej ikon maskowanych.
  if (r > 0.74) return BG;
  if (r > 0.68) return RIM;
  if (r > 0.34) return PLATE;
  if (r > 0.28) return RAISED;
  if (r > 0.18) return SLEEVE;
  if (r > 0.1) return HOLE;
  return HOLE;
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
  const samples = 4; // wygładzanie krawędzi
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const dx = (x + (sx + 0.5) / samples) / size - 0.5;
          const dy = (y + (sy + 0.5) / samples) / size - 0.5;
          const color = colorAt(Math.hypot(dx, dy) * 2);
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
