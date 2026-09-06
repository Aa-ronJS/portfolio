/* Local dev: static files from this folder, /api/* routed to the handlers with
   a small Vercel-shaped req/res. Reads .env.local if present. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z_]/g, '');
    let body = '';
    for await (const chunk of req) body += chunk;
    req.query = Object.fromEntries(url.searchParams);
    try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
    const r = {
      status(c) { res.statusCode = c; return r; },
      setHeader: (k, v) => res.setHeader(k, v),
      json(o) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); },
      send(s) { res.end(s); },
      redirect(c, l) { res.statusCode = typeof c === 'number' ? c : 302; res.setHeader('location', typeof c === 'number' ? l : c); res.end(); },
    };
    try {
      const mod = await import(pathToFileURL(path.join(root, 'api', name + '.js')).href);
      await mod.default(req, r);
    } catch (e) { console.error(e); r.status(500).json({ error: String(e.message || e) }); }
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(root, p);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  else if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('dev on http://localhost:' + (process.env.PORT || 3000)));
