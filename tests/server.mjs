// GitHub Pages と同じく /design-lab/ 配下で site/ を配信する確認用サーバー。
// サブパスでの参照切れを検出するため、/design-lab/ 以外へのリクエストは 404 にする。

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../site/', import.meta.url));
const BASE = '/design-lab/';
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/design-lab') {
    res.writeHead(301, { Location: BASE }).end();
    return;
  }
  if (!pathname.startsWith(BASE)) {
    res.writeHead(404).end('Not found (outside /design-lab/)');
    return;
  }
  const relative = decodeURIComponent(pathname.slice(BASE.length)) || 'index.html';
  const file = normalize(join(ROOT, relative));
  if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, 'index.html') : file;
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': TYPES[extname(target)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => {
  console.log(`http://localhost:${PORT}${BASE}`);
});
