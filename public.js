const { db, json, limit, clean, body, EMAIL } = require('../util');
const { publicQuiz } = require('../assess');
const bySort = (a, b) => (a.sort ?? 100) - (b.sort ?? 100) || String(a.created_at).localeCompare(String(b.created_at));
const newest = (a, b) => String(b.created_at).localeCompare(String(a.created_at));
module.exports = async req => {
  const D = db.data;
  if (req.method === 'POST') {
    if (!limit(req, 'contact', 3, 3600)) return json(429, { error: 'Too many messages. Try again later.' });
    const b = body(req); if (!b || b.website) return json(400, { error: 'Request rejected' });
    const m = { name: clean(b.name, 80), email: clean(b.email, 120), body: clean(b.body, 2000) };
    if (!m.name || !EMAIL.test(m.email) || m.body.length < 10) return json(400, { error: 'Please provide your name, a valid email and a message (10+ characters).' });
    D.messages.push({ id: db.id(), ...m, created_at: db.now() }); await db.save();
    return json(200, { ok: true });
  }
  const projects = [...D.projects].sort(bySort);
  return json(200, {
    projects,
    announcements: [...D.announcements].sort(newest).slice(0, 10),
    team: [...D.team].sort(bySort).map(({ id, name, role, bio, avatar_url, links }) => ({ id, name, role, bio, avatar_url, links })),
    posts: [...D.posts].sort(newest).slice(0, 50).map(({ id, author_name, kind, title, body, link, created_at }) => ({ id, author_name, kind, title, body, link, created_at })),
    content: D.content,
    stats: { projects: projects.length, team: D.team.length, applications: D.applications.length, members: D.users.filter(u => u.role === 'member').length },
    quiz: publicQuiz()
  });
};
