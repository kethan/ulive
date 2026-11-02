// Minimal static server for the browser page in krausest/. Serves the repo root so the page
// can import ulive's dist bundle and the competitor packages from bench/node_modules.
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { extname, join, normalize } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = Number(process.env.PORT || 8000);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // browsers always ask for this; answer it instead of logging a 404
    if (p === '/favicon.ico') {
      res.writeHead(204, { 'cache-control': 'max-age=86400' });
      return res.end();
    }
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) throw new Error('outside root');
    const s = await stat(file);
    if (s.isDirectory()) throw new Error('is a directory');
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`benchmark page: http://localhost:${PORT}/bench/krausest/browser/`);
});
