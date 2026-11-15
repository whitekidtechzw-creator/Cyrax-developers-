const crypto = require('crypto'), fs = require('fs'), path = require('path');
const { db, json, limit, clean, url, body, EMAIL } = require('../util');
const { QUIZ, assess } = require('../assess');
const count = s => String(s || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean).length;
async function img(d, folder) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(d || '');
  if (!m) throw new Error('Only image uploads are accepted.');
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > 700000 || buf[0] !== 0xFF || buf[1] !== 0xD8) throw new Error('Invalid or oversized image.');
  const dir = path.join(db.UPLOADS, folder); await fs.promises.mkdir(dir, { recursive: true });
  const name = crypto.randomBytes(8).toString('hex') + '.jpg';
  await fs.promises.writeFile(path.join(dir, name), buf);
  return `/uploads/${folder}/${name}`;
}
module.exports = async req => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    if (db.data.content.join_open === 'no') return json(403, { error: 'Recruitment is currently closed.' });
    if (!limit(req, 'apply', 3, 3600)) return json(429, { error: 'Too many applications from your network. Try again later.' });
    const b = body(req); if (!b) return json(400, { error: 'Invalid request' });
    if (b.website || Date.now() - Number(b.t) < 5000) return json(400, { error: 'Request rejected.' });
    const f = { full_name: clean(b.full_name, 80), username: clean(b.username, 30), country: clean(b.country, 60), email: clean(b.email, 120).toLowerCase(), whatsapp: clean(b.whatsapp, 25),
      bio: clean(b.bio, 600), languages: clean(b.languages, 300), skills: clean(b.skills, 400), frameworks: clean(b.frameworks, 300), tools: clean(b.tools, 300),
      previous_experience: clean(b.previous_experience, 1200), telegram: clean(b.telegram, 40).replace(/^@/, ''), challenge: clean(b.challenge, 4000) };
    const years = parseInt(b.experience_years), github = url(b.github), portfolio = url(b.portfolio);
    const age = b.age === '' || b.age == null ? null : parseInt(b.age);
    const err = [];
    if (f.full_name.length < 3) err.push('Full name is required.');
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(f.username)) err.push('Username must be 3-30 letters, numbers, . _ -');
    if (!f.country) err.push('Country is required.');
    if (!EMAIL.test(f.email)) err.push('A valid email is required.');
    if (!/^\+?[0-9 ()-]{7,20}$/.test(f.whatsapp)) err.push('A valid WhatsApp number is required (e.g. +263...).');
    if (age !== null && (isNaN(age) || age < 18)) err.push('Applicants must be 18 or older.');
    if (!count(f.languages)) err.push('List at least one programming language.');
    if (isNaN(years) || years < 0 || years > 60) err.push('Enter your years of experience.');
    if (github === null || portfolio === null) err.push('GitHub and portfolio must be full http(s) links.');
    const projects = [], imgs = [];
    for (const p of (Array.isArray(b.projects) ? b.projects.slice(0, 5) : [])) {
      const q = { name: clean(p.name, 80), description: clean(p.description, 600), category: clean(p.category, 40), tech: clean(p.tech, 200), repo: url(p.repo), demo: url(p.demo), contribution: clean(p.contribution, 500), shots: [] };
      if (!q.name && !q.description) continue;
      if (!q.name || !q.description || !q.contribution) err.push('Each project needs a name, description and your contribution.');
      if (q.repo === null || q.demo === null) err.push(`Project "${q.name}" has an invalid link.`);
      q.shotsIn = (Array.isArray(p.shots) ? p.shots : []).slice(0, 3); imgs.push(...q.shotsIn); projects.push(q);
    }
    if (!projects.length) err.push('Submit at least one project.');
    if (imgs.length + (b.avatar ? 1 : 0) > 10) err.push('Too many images (max 10).');
    const ans = Array.isArray(b.quiz) ? b.quiz.map(Number) : [];
    if (ans.length !== QUIZ.length) err.push('Please answer every assessment question.');
    if (err.length) return json(400, { error: err.join(' ') });
    const since = Date.now() - 30 * 864e5;
    if (db.data.applications.some(a => a.email === f.email && Date.parse(a.created_at) >= since)) return json(409, { error: 'An application with this email was already submitted recently. Use the Track page to check it.' });
    const avatar_url = b.avatar ? await img(b.avatar, 'avatars') : null;
    for (const p of projects) { for (const s of p.shotsIn) p.shots.push(await img(s, 'shots')); delete p.shotsIn; }
    const ref = 'CYX-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    const a = { ...f, github, portfolio, age, experience_years: years, projects };
    const score = assess(a, ans);
    db.data.applications.push({ id: db.id(), ref, created_at: db.now(), status: 'Application Received', ...a, avatar_url, quiz: ans, score, public_note: '', admin_notes: '' });
    await db.save();
    return json(200, { ref, score });
  } catch (x) { return json(400, { error: x.message || 'Server error' }); }
};
