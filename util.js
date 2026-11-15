const crypto = require('crypto'), fs = require('fs'), path = require('path'), { promisify } = require('util');
const db = require('./db');
const scrypt = promisify(crypto.scrypt);

const json = (code, body) => ({ statusCode: code, body });
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const url = v => { v = clean(v, 300); return !v ? '' : /^https?:\/\/[^\s]+$/i.test(v) ? v : null; };
const body = req => { try { return JSON.parse(req.body || '{}'); } catch { return null; } };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---- rate limiting (in memory) ----
const hits = new Map();
function limit(req, action, max, windowSec) {
  const key = req.ip + ':' + action, t = Date.now(), from = t - windowSec * 1000;
  const a = (hits.get(key) || []).filter(x => x > from);
  if (a.length >= max) { hits.set(key, a); return false; }
  a.push(t); hits.set(key, a); return true;
}
setInterval(() => { const from = Date.now() - 864e5; for (const [k, a] of hits) if (!a.length || a[a.length - 1] < from) hits.delete(k); }, 36e5).unref();

// ---- passwords + session tokens ----
async function hashPw(pw) { const salt = crypto.randomBytes(16); return salt.toString('hex') + ':' + (await scrypt(pw, salt, 64)).toString('hex'); }
async function checkPw(pw, stored) {
  const [s, h] = String(stored || '').split(':'); if (!s || !h) return false;
  const calc = await scrypt(String(pw), Buffer.from(s, 'hex'), 64), hb = Buffer.from(h, 'hex');
  return hb.length === calc.length && crypto.timingSafeEqual(hb, calc);
}
const DUMMY_HASH = '00000000000000000000000000000000:' + '00'.repeat(64);
function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const f = path.join(db.DATA_DIR, 'secret.key');
  try { return fs.readFileSync(f, 'utf8').trim(); } catch {}
  const s = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(f, s, { mode: 0o600 }); return s;
}
const SECRET = secret();
const fp = u => crypto.createHash('sha256').update(u.hash).digest('hex').slice(0, 12);
const mac = p => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
function sign(u) {
  const ttl = u.role === 'admin' ? 12 * 3600e3 : 14 * 864e5;
  const p = Buffer.from(JSON.stringify({ u: u.id, e: Date.now() + ttl, h: fp(u) })).toString('base64url');
  return p + '.' + mac(p);
}
function userFromToken(tok) {
  const [p, m] = String(tok || '').split('.'); if (!p || !m) return null;
  const good = Buffer.from(mac(p)), got = Buffer.from(m);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
  let c; try { c = JSON.parse(Buffer.from(p, 'base64url').toString()); } catch { return null; }
  if (!c.e || c.e < Date.now()) return null;
  const u = db.data.users.find(x => x.id === c.u);
  return u && fp(u) === c.h ? u : null;
}
const nameOf = u => u.role === 'admin' ? 'CYRAX Team' : u.display_name;
function role(req) {
  const u = userFromToken((req.headers.authorization || '').replace(/^Bearer /i, ''));
  return u ? { u, role: u.role, name: nameOf(u) } : {};
}
// Creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD. Re-applies only when those variables change.
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase(), pw = process.env.ADMIN_PASSWORD || '';
  if (!email || !pw) { if (!db.data.users.some(u => u.role === 'admin')) console.warn('\n  ! No administrator exists. Set ADMIN_EMAIL and ADMIN_PASSWORD (see README) and restart.\n'); return; }
  if (pw.length < 8) { console.warn('\n  ! ADMIN_PASSWORD must be at least 8 characters. Admin not created.\n'); return; }
  const f = crypto.createHash('sha256').update(email + '\n' + pw).digest('hex');
  let u = db.data.users.find(x => x.email === email);
  if (u && db.data.adminEnvFp === f) return;
  if (!u) { u = { id: db.id(), email, role: 'admin', display_name: 'CYRAX Team', created_at: db.now() }; db.data.users.push(u); }
  u.role = 'admin'; u.hash = await hashPw(pw); db.data.adminEnvFp = f;
  await db.save(); console.log('  Admin account ready:', email);
}
module.exports = { db, json, clean, url, body, EMAIL, limit, hashPw, checkPw, DUMMY_HASH, sign, role, nameOf, ensureAdmin };
