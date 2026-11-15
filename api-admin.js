const fs = require('fs'), path = require('path');
const { db, json, clean, body, role, EMAIL, hashPw } = require('./util');
const STATUSES = ['Application Received', 'Under Review', 'Assessment Required', 'Shortlisted', 'Approved', 'Rejected'];
const T = {
  projects: ['name', 'category', 'icon', 'description', 'technologies', 'status', 'links', 'featured', 'sort'],
  announcements: ['title', 'body'], team: ['name', 'role', 'bio', 'avatar_url', 'links', 'sort'], posts: [], messages: [], members: []
};
const REQ = { projects: ['name', 'category', 'description'], announcements: ['title', 'body'], team: ['name', 'role'] };
const bySort = (a, b) => (a.sort ?? 100) - (b.sort ?? 100) || String(a.created_at).localeCompare(String(b.created_at));
const newest = (a, b) => String(b.created_at).localeCompare(String(a.created_at));
function norm(t, d) {
  const o = {};
  for (const k of T[t]) {
    if (d[k] === undefined) continue; let v = d[k];
    if (k === 'technologies') v = (Array.isArray(v) ? v : String(v).split(',')).map(x => clean(x, 40)).filter(Boolean).slice(0, 12);
    else if (k === 'links') v = (Array.isArray(v) ? v : []).map(l => ({ label: clean(l.label, 40), url: l.url ? clean(l.url, 300) : undefined, text: l.text ? clean(l.text, 120) : undefined })).filter(l => l.label && (l.url ? /^https?:\/\//i.test(l.url) : l.text)).slice(0, 10);
    else if (k === 'featured') v = !!v;
    else if (k === 'sort') v = parseInt(v) || 100;
    else if (k === 'avatar_url') { v = clean(v, 300); if (v && !/^https?:\/\//i.test(v)) v = ''; }
    else v = clean(v, ['description', 'body', 'bio'].includes(k) ? 2000 : 200);
    o[k] = v;
  }
  return o;
}
const rmFile = u => { const m = /^\/uploads\/(avatars|shots)\/([a-f0-9]+\.jpg)$/.exec(u || ''); if (m) fs.promises.unlink(path.join(db.UPLOADS, m[1], m[2])).catch(() => {}); };
const memberRow = u => ({ user_id: u.id, display_name: u.display_name, email: u.email, created_at: u.created_at });
module.exports = async req => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const r = role(req);
  if (r.role !== 'admin') return json(403, { error: 'Administrators only.' });
  const D = db.data, b = body(req) || {}, id = clean(b.id, 40);
  const table = T[b.table] ? b.table : null;
  const coll = () => table === 'members' ? D.users : D[table];
  switch (b.action) {
    case 'stats': {
      const by = Object.fromEntries(STATUSES.map(s => [s, 0])); D.applications.forEach(x => { by[x.status] = (by[x.status] || 0) + 1; });
      return json(200, { total: D.applications.length, by, projects: D.projects.length, announcements: D.announcements.length, team: D.team.length, members: D.users.filter(u => u.role === 'member').length, posts: D.posts.length, messages: D.messages.length });
    }
    case 'applications':
      return json(200, { rows: [...D.applications].sort(newest).slice(0, 500).map(({ id, ref, created_at, status, full_name, username, country, email, score }) => ({ id, ref, created_at, status, full_name, username, country, email, score })) });
    case 'application': return json(200, { row: D.applications.find(a => a.id === id) || null });
    case 'setStatus': {
      if (!STATUSES.includes(b.status)) return json(400, { error: 'Invalid status' });
      const a = D.applications.find(x => x.id === id); if (!a) return json(404, { error: 'Application not found' });
      a.status = b.status; a.public_note = clean(b.public_note, 500); a.admin_notes = clean(b.admin_notes, 2000); await db.save();
      return json(200, { ok: true });
    }
    case 'deleteApplication': {
      const i = D.applications.findIndex(x => x.id === id);
      if (i >= 0) { const [a] = D.applications.splice(i, 1); rmFile(a.avatar_url); (a.projects || []).forEach(p => (p.shots || []).forEach(rmFile)); await db.save(); }
      return json(200, { ok: true });
    }
    case 'list': {
      if (!table) return json(400, { error: 'Bad table' });
      if (table === 'members') return json(200, { rows: D.users.filter(u => u.role === 'member').sort(newest).map(memberRow) });
      return json(200, { rows: [...D[table]].sort(table === 'projects' || table === 'team' ? bySort : newest) });
    }
    case 'save': {
      if (!table || !REQ[table]) return json(400, { error: 'Bad table' });
      const d = norm(table, b.data || {});
      if (REQ[table].some(k => !d[k])) return json(400, { error: 'Please fill all required fields.' });
      if (id) { const row = D[table].find(x => x.id === id); if (!row) return json(404, { error: 'Not found' }); Object.assign(row, d); }
      else D[table].push({ id: db.id(), created_at: db.now(), ...d });
      await db.save(); return json(200, { ok: true });
    }
    case 'delete': {
      if (!table) return json(400, { error: 'Bad table' });
      const c = coll(), i = c.findIndex(x => x.id === id && (table !== 'members' || x.role === 'member'));
      if (i >= 0) { c.splice(i, 1); await db.save(); }
      return json(200, { ok: true });
    }
    case 'addMember': {
      const email = clean(b.email, 120).toLowerCase(), name = clean(b.name, 60), pw = String(b.password || '');
      if (!EMAIL.test(email) || !name) return json(400, { error: 'Name and valid email required.' });
      if (pw.length < 8 || pw.length > 200) return json(400, { error: 'Password must be 8-200 characters.' });
      if (D.users.some(u => u.email === email)) return json(400, { error: 'That email already has an account.' });
      D.users.push({ id: db.id(), email, role: 'member', display_name: name, hash: await hashPw(pw), created_at: db.now() }); await db.save();
      return json(200, { ok: true });
    }
    case 'resetMemberPassword': {
      const u = D.users.find(x => x.id === id && x.role === 'member'), pw = String(b.password || '');
      if (!u) return json(404, { error: 'Member not found.' });
      if (pw.length < 8 || pw.length > 200) return json(400, { error: 'Password must be 8-200 characters.' });
      u.hash = await hashPw(pw); await db.save(); return json(200, { ok: true });
    }
    case 'setContent': {
      if (!['about_text', 'hero_description', 'join_open'].includes(b.key)) return json(400, { error: 'Bad key' });
      D.content[b.key] = clean(b.value, 2000); await db.save(); return json(200, { ok: true });
    }
    case 'content': return json(200, { rows: Object.entries(D.content).map(([key, value]) => ({ key, value })) });
    default: return json(400, { error: 'Unknown action' });
  }
};
