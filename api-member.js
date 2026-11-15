const { db, json, limit, clean, url, body, role, checkPw, hashPw, sign } = require('./util');
const KINDS = ['discussion', 'collaboration', 'achievement', 'showcase', 'news'];
module.exports = async req => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const r = role(req), b = body(req) || {};
  if (b.action === 'me') return json(200, { role: r.role || null, name: r.name || null });
  if (!r.role) return json(403, { error: 'Approved members only.' });
  if (b.action === 'post') {
    if (!limit(req, 'post', 10, 3600)) return json(429, { error: 'Posting too fast. Try again later.' });
    const p = { title: clean(b.title, 120), body: clean(b.body, 2000), kind: KINDS.includes(b.kind) ? b.kind : 'discussion', link: url(b.link) };
    if (!p.title || !p.body || p.link === null) return json(400, { error: 'Title, message and a valid http(s) link (optional) are required.' });
    db.data.posts.push({ id: db.id(), ...p, link: p.link || null, author_id: r.u.id, author_name: r.name, created_at: db.now() }); await db.save();
    return json(200, { ok: true });
  }
  if (b.action === 'delete') {
    const id = clean(b.id, 40), i = db.data.posts.findIndex(p => p.id === id && (r.role === 'admin' || p.author_id === r.u.id));
    if (i >= 0) { db.data.posts.splice(i, 1); await db.save(); }
    return json(200, { ok: true });
  }
  if (b.action === 'changePassword') {
    if (!limit(req, 'chpw', 8, 600)) return json(429, { error: 'Too many attempts. Try again later.' });
    const np = String(b.password || '');
    if (np.length < 8 || np.length > 200) return json(400, { error: 'New password must be 8-200 characters.' });
    if (!(await checkPw(String(b.current || '').slice(0, 200), r.u.hash))) return json(400, { error: 'Current password is incorrect.' });
    r.u.hash = await hashPw(np); await db.save();
    return json(200, { ok: true, token: sign(r.u) });
  }
  return json(400, { error: 'Unknown action' });
};
