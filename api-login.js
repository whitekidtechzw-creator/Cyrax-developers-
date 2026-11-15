const { db, json, clean, body, limit, checkPw, DUMMY_HASH, sign, nameOf } = require('./util');
module.exports = async req => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!limit(req, 'login', 10, 600)) return json(429, { error: 'Too many attempts. Try again in a few minutes.' });
  const b = body(req) || {}, email = clean(b.email, 120).toLowerCase();
  const u = db.data.users.find(x => x.email === email);
  const ok = await checkPw(String(b.password || '').slice(0, 200), u ? u.hash : DUMMY_HASH);
  if (!u || !ok) return json(401, { error: 'Invalid email or password.' });
  return json(200, { token: sign(u), role: u.role, name: nameOf(u) });
};
