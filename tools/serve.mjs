// Lokalny serwer do podglądu na komputerze. Bez pamięci podręcznej, żeby zmiany było widać od razu.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const safe = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  const file = join(ROOT, safe === '' || safe === '.' ? 'index.html' : safe);
  if (!file.startsWith(normalize(ROOT + sep)) || file.includes(`${sep}.`)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Nie znaleziono');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Krążek: http://localhost:${PORT}`);
});
