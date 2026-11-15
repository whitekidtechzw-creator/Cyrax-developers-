// CYRAX DEVELOPERS — self-contained server. No external services, no npm packages.
const fs = require('fs'), path = require('path'), http = require('http');

// Load .env (simple KEY=VALUE lines). Real environment variables win.
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i.exec(line);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {}

const db = require('./server/db');
const { json, ensureAdmin } = require('./server/util');
const ROUTES = { login: 'login', public: 'public', apply: 'apply', status: 'status', member: 'member', admin: 'admin' };
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp' };
const SEC = {
  'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};
const headers = (req, extra = {}) => ({ ...SEC, ...(req.headers['x-forwarded-proto'] === 'https' ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}), ...extra });

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    let n = 0; const parts = [];
    req.on('data', c => { n += c.length; if (n > max) { reject(Object.assign(new Error('Too large'), { code: 413 })); req.destroy(); } else parts.push(c); });
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
    req.on('error', reject);
  });
}
function sendFile(req, res, file, extra = {}) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(req, res);
    res.writeHead(200, headers(req, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, ...extra }));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}
function notFound(req, res) {
  const f = path.join(PUBLIC, '404.html');
  fs.readFile(f, (e, d) => { res.writeHead(404, headers(req, { 'Content-Type': 'text/html; charset=utf-8' })); res.end(req.method === 'HEAD' ? undefined : (e ? 'Not found' : d)); });
}
async function api(req, res, name) {
  const send = (r) => { const b = JSON.stringify(r.body); res.writeHead(r.statusCode, headers(req, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(b) })); res.end(b); };
  try {
    const raw = req.method === 'POST' ? await readBody(req, name === 'apply' ? 14e6 : 2e5) : '';
    const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const handler = require('./server/routes/' + ROUTES[name]);
    send(await handler({ method: req.method, headers: req.headers, body: raw, ip: xff || req.socket.remoteAddress || 'unknown' }));
  } catch (e) {
    if (e.code === 413) return send(json(413, { error: 'Upload too large. Use smaller images.' }));
    console.error('API error:', e); send(json(500, { error: 'Server error' }));
  }
}

const server = http.createServer((req, res) => {
  let pathname; try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  if (pathname.startsWith('/api/')) {
    const name = pathname.slice(5).replace(/\/$/, '');
    if (!Object.hasOwn(ROUTES, name)) { res.writeHead(404, headers(req, { 'Content-Type': 'application/json' })); return res.end('{"error":"Not found"}'); }
    return api(req, res, name);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  if (pathname.startsWith('/uploads/')) {
    const f = path.join(db.UPLOADS, pathname.slice(9));
    if (!f.startsWith(db.UPLOADS + path.sep)) return notFound(req, res);
    return sendFile(req, res, f, { 'Cache-Control': 'public, max-age=31536000, immutable' });
  }
  if (pathname === '/') pathname = '/index.html'; else if (pathname === '/admin') pathname = '/admin.html';
  const f = path.join(PUBLIC, pathname);
  if (!f.startsWith(PUBLIC + path.sep)) return notFound(req, res);
  sendFile(req, res, f, { 'Cache-Control': 'no-cache' });
});

(async () => {
  db.seed(); await ensureAdmin();
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`\n  CYRAX DEVELOPERS running → http://localhost:${port}\n  Admin panel            → http://localhost:${port}/admin.html\n  Data folder            → ${db.DATA_DIR}\n`));
})();
