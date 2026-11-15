(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CATS = ['Android Applications', 'VPN & Networking', 'Telegram & WhatsApp Bots', 'Artificial Intelligence', 'Web Development', 'Developer Utilities', 'Software Engineering'];
const ST = ['Application Received', 'Under Review', 'Assessment Required', 'Shortlisted', 'Approved', 'Rejected'];
let tok = null, tab = 'overview'; try { tok = sessionStorage.getItem('cx-admin'); } catch {}
const setTok = t => { tok = t; try { t ? sessionStorage.setItem('cx-admin', t) : sessionStorage.removeItem('cx-admin'); } catch {} };
const rpc = async (ep, body) => { const r = await fetch('/api/' + ep, { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) { if (ep !== 'login' && (r.status === 403 || r.status === 401)) { setTok(null); location.reload(); } throw new Error(j.error || 'Error'); } return j; };
const call = (action, p = {}) => rpc('admin', { action, ...p });
const fmt = d => new Date(d).toLocaleString();
const TABS = [['overview', 'Overview'], ['applications', 'Applications'], ['projects', 'Projects'], ['announcements', 'Announcements'], ['team', 'Team'], ['members', 'Members'], ['posts', 'Community'], ['messages', 'Messages'], ['content', 'Site Content'], ['account', 'My Account']];
const FIELDS = {
  projects: [['name', 'Name'], ['category', 'Category', 'select', CATS], ['icon', 'Icon (emoji)'], ['description', 'Description', 'area'], ['technologies', 'Technologies (comma separated)'], ['status', 'Status', 'select', ['Live', 'Beta', 'In Development', 'Coming Soon']], ['links', 'Links — one per line: "Label | https://url" or "Label | text: info"', 'area'], ['featured', 'Featured on homepage', 'check'], ['sort', 'Sort order', 'number']],
  announcements: [['title', 'Title'], ['body', 'Announcement', 'area']],
  team: [['name', 'Name'], ['role', 'Role'], ['bio', 'Bio', 'area'], ['avatar_url', 'Avatar image URL (https)'], ['links', 'Links — "Label | https://url" per line', 'area'], ['sort', 'Sort order', 'number']]
};
const linksOut = l => (l || []).map(x => x.url ? `${x.label} | ${x.url}` : `${x.label} | text: ${x.text}`).join('\n');
const linksIn = s => s.split('\n').map(l => l.split('|').map(x => x.trim())).filter(a => a[0] && a[1]).map(([label, v]) => /^text:/i.test(v) ? { label, text: v.replace(/^text:\s*/i, '') } : { label, url: v });
const toast = t => alert(t);

async function start() {
  if (!tok) return;
  try { await call('stats'); } catch { setTok(null); return; }
  $('#login').hidden = true; $('#app').hidden = false; $('#out').hidden = false;
  $('#side').innerHTML = TABS.map(([k, v]) => `<button class="btn sm" data-t="${k}">${v}</button>`).join(''); go('overview');
}
$('#lf').onsubmit = async e => {
  e.preventDefault();
  try {
    const j = await rpc('login', { email: e.target.e.value, password: e.target.p.value });
    if (j.role !== 'admin') throw new Error('This account is not an authorized administrator.');
    setTok(j.token); $('#lm').innerHTML = ''; start();
  } catch (x) { $('#lm').innerHTML = `<div class="msg err">${esc(x.message)}</div>`; }
};
$('#out').onclick = () => { setTok(null); location.reload(); };
document.addEventListener('click', e => {
  const t = e.target.closest('[data-t]'); if (t) go(t.dataset.t);
  const a = e.target.closest('[data-a]'); if (a) act(a.dataset.a, a.dataset.id, a.dataset.tb, a.dataset.n);
});
async function go(t) { tab = t; $$('#side .btn').forEach(b => b.classList.toggle('pri', b.dataset.t === t)); const el = $('#ad'); el.innerHTML = '<p class="meta">Loading…</p>'; try { await VIEWS[t](el); } catch (x) { el.innerHTML = `<div class="msg err">${esc(x.message)}</div>`; } }
const tbl = (h, rows) => `<div class="tw card"><table><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${rows.join('') || `<tr><td colspan="${h.length}">Nothing yet.</td></tr>`}</table></div>`;
const VIEWS = {
  async overview(el) { const s = await call('stats'); el.innerHTML = `<h2>Platform Statistics</h2><div class="stats">${[['Applications', s.total], ...ST.map(k => [k, s.by[k]]), ['Projects', s.projects], ['Team', s.team], ['Members', s.members], ['Posts', s.posts], ['Announcements', s.announcements], ['Messages', s.messages]].map(([k, v]) => `<div class="card stat"><b>${v ?? 0}</b>${k}</div>`).join('')}</div>`; },
  async applications(el) { const { rows } = await call('applications'); el.innerHTML = `<h2>Applications</h2>` + tbl(['Ref', 'Name', 'Country', 'Score', 'Status', 'Date', ''], rows.map(r => `<tr><td>${esc(r.ref)}</td><td>${esc(r.full_name)}<br><span class="meta">@${esc(r.username)}</span></td><td>${esc(r.country)}</td><td>${r.score ? r.score.overall + '/100' : '-'}</td><td>${esc(r.status)}</td><td>${fmt(r.created_at)}</td><td><button class="btn sm" data-a="open" data-id="${r.id}">Review</button></td></tr>`)); },
  async projects(el) { const { rows } = await call('list', { table: 'projects' }); el.innerHTML = `<h2>Projects &amp; Tools <button class="btn sm pri" data-a="new" data-tb="projects">+ Add</button></h2>` + tbl(['Name', 'Category', 'Status', 'Featured', ''], rows.map(r => `<tr><td>${esc(r.icon)} ${esc(r.name)}</td><td>${esc(r.category)}</td><td>${esc(r.status)}</td><td>${r.featured ? 'Yes' : ''}</td><td><button class="btn sm" data-a="edit" data-tb="projects" data-id="${r.id}">Edit</button> <button class="btn sm bad" data-a="del" data-tb="projects" data-id="${r.id}">Delete</button></td></tr>`)); window._rows = { ...window._rows, projects: rows }; },
  async announcements(el) { const { rows } = await call('list', { table: 'announcements' }); window._rows = { ...window._rows, announcements: rows }; el.innerHTML = `<h2>Announcements <button class="btn sm pri" data-a="new" data-tb="announcements">+ Publish</button></h2>` + tbl(['Title', 'Date', ''], rows.map(r => `<tr><td>${esc(r.title)}</td><td>${fmt(r.created_at)}</td><td><button class="btn sm" data-a="edit" data-tb="announcements" data-id="${r.id}">Edit</button> <button class="btn sm bad" data-a="del" data-tb="announcements" data-id="${r.id}">Delete</button></td></tr>`)); },
  async team(el) { const { rows } = await call('list', { table: 'team' }); window._rows = { ...window._rows, team: rows }; el.innerHTML = `<h2>Team Members <button class="btn sm pri" data-a="new" data-tb="team">+ Add</button></h2>` + tbl(['Name', 'Role', ''], rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.role)}</td><td><button class="btn sm" data-a="edit" data-tb="team" data-id="${r.id}">Edit</button> <button class="btn sm bad" data-a="del" data-tb="team" data-id="${r.id}">Remove</button></td></tr>`)); },
  async members(el) { const { rows } = await call('list', { table: 'members' }); el.innerHTML = `<h2>Community Members</h2><form id="inv" class="card"><p class="meta">Create a login for an approved developer. Give them the email and password you set; they can change it themselves after signing in.</p><label>Display name<input name="n" required></label><label>Email<input name="e" type="email" required></label><label>Password (min 8 characters)<input name="p" type="text" minlength="8" required></label><button class="btn pri sm">Create member</button></form>` + tbl(['Name', 'Email', ''], rows.map(r => `<tr><td>${esc(r.display_name)}</td><td>${esc(r.email)}</td><td><button class="btn sm" data-a="pw" data-id="${r.user_id}" data-n="${esc(r.display_name)}">Reset password</button> <button class="btn sm bad" data-a="del" data-tb="members" data-id="${r.user_id}">Remove</button></td></tr>`));
    $('#inv').onsubmit = async e => { e.preventDefault(); try { await call('addMember', { name: e.target.n.value, email: e.target.e.value, password: e.target.p.value }); toast('Member created.'); go('members'); } catch (x) { toast(x.message); } }; },
  async posts(el) { const { rows } = await call('list', { table: 'posts' }); el.innerHTML = `<h2>Community Posts</h2>` + tbl(['Type', 'Title', 'Author', 'Date', ''], rows.map(r => `<tr><td>${esc(r.kind)}</td><td>${esc(r.title)}</td><td>${esc(r.author_name)}</td><td>${fmt(r.created_at)}</td><td><button class="btn sm bad" data-a="del" data-tb="posts" data-id="${r.id}">Delete</button></td></tr>`)); },
  async messages(el) { const { rows } = await call('list', { table: 'messages' }); el.innerHTML = `<h2>Contact Messages</h2>` + tbl(['From', 'Message', 'Date', ''], rows.map(r => `<tr><td>${esc(r.name)}<br><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td><td>${esc(r.body)}</td><td>${fmt(r.created_at)}</td><td><button class="btn sm bad" data-a="del" data-tb="messages" data-id="${r.id}">Delete</button></td></tr>`)); },
  async content(el) { const { rows } = await call('content'); const c = Object.fromEntries(rows.map(r => [r.key, r.value]));
    el.innerHTML = `<h2>Site Content</h2><form id="cf" class="card"><label>Homepage description (leave empty for default)<textarea name="hero_description">${esc(c.hero_description)}</textarea></label><label>About text (leave empty for default)<textarea name="about_text">${esc(c.about_text)}</textarea></label><label>Recruitment<select name="join_open"><option value="yes">Open</option><option value="no"${c.join_open === 'no' ? ' selected' : ''}>Closed</option></select></label><button class="btn pri">Save</button></form>`;
    $('#cf').onsubmit = async e => { e.preventDefault(); try { for (const k of ['hero_description', 'about_text', 'join_open']) await call('setContent', { key: k, value: e.target[k].value }); toast('Saved.'); } catch (x) { toast(x.message); } }; },
  async account(el) { el.innerHTML = `<h2>My Account</h2><form id="pf2" class="card"><p class="meta">Change the administrator password.</p><label>Current password<input name="c" type="password" required></label><label>New password (min 8 characters)<input name="p" type="password" minlength="8" required></label><button class="btn pri sm">Change password</button></form>`;
    $('#pf2').onsubmit = async e => { e.preventDefault(); try { const r = await rpc('member', { action: 'changePassword', current: e.target.c.value, password: e.target.p.value }); setTok(r.token); e.target.reset(); toast('Password changed.'); } catch (x) { toast(x.message); } }; }
};
async function act(a, id, tb, nm) {
  try {
    if (a === 'open') return openApp(id);
    if (a === 'pw') { const n = prompt('New password for ' + (nm || 'this member') + ' (min 8 characters):'); if (n) { await call('resetMemberPassword', { id, password: n }); toast('Password updated.'); } return; }
    if (a === 'del') { if (confirm('Delete permanently?')) { await call('delete', { table: tb, id }); go(tab); } return; }
    if (a === 'new' || a === 'edit') return editor(tb, a === 'edit' ? window._rows[tb].find(r => r.id === id) : null);
  } catch (x) { toast(x.message); }
}
function editor(tb, row) {
  const f = $('#edf'); $('#edt').textContent = (row ? 'Edit ' : 'New ') + tb.slice(0, -1);
  f.innerHTML = FIELDS[tb].map(([k, l, t, o]) => { let v = row ? row[k] : ''; if (k === 'links') v = linksOut(v); if (k === 'technologies') v = (v || []).join(', ');
    const inp = t === 'area' ? `<textarea name="${k}">${esc(v)}</textarea>` : t === 'select' ? `<select name="${k}">${o.map(x => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>` : t === 'check' ? `<input type="checkbox" name="${k}" style="width:auto"${v ? ' checked' : ''}>` : `<input name="${k}" type="${t || 'text'}" value="${esc(v ?? (k === 'sort' ? 100 : ''))}">`;
    return `<label>${l}${inp}</label>`; }).join('') + '<div style="display:flex;gap:.5rem"><button class="btn pri">Save</button><button type="button" class="btn" id="cx">Cancel</button></div>';
  $('#cx').onclick = () => $('#ed').close();
  f.onsubmit = async e => { e.preventDefault(); const d = {}; FIELDS[tb].forEach(([k, , t]) => { const i = f.elements[k]; d[k] = t === 'check' ? i.checked : k === 'links' ? linksIn(i.value) : i.value; });
    try { await call('save', { table: tb, id: row?.id, data: d }); $('#ed').close(); go(tab); } catch (x) { toast(x.message); } };
  $('#ed').showModal();
}
async function openApp(id) {
  const { row: r } = await call('application', { id }), s = r.score || { breakdown: {} }, el = $('#ad');
  const wa = r.whatsapp.replace(/[^0-9]/g, '');
  el.innerHTML = `<button class="btn sm" id="bk">← Back</button><h2 style="margin-top:1rem">${esc(r.full_name)} <span class="meta">${esc(r.ref)}</span></h2>
  <div class="card">${r.avatar_url ? `<img class="av" alt="" src="${esc(r.avatar_url)}">` : ''}<p><b>@${esc(r.username)}</b> · ${esc(r.country)}${r.age ? ' · age ' + r.age : ''}<br>${esc(r.email)} · WhatsApp ${esc(r.whatsapp)}${r.telegram ? ' · Telegram @' + esc(r.telegram) : ''}</p><p>${esc(r.bio)}</p>
  <p><b>Languages:</b> ${esc(r.languages)} · <b>Experience:</b> ${r.experience_years} yrs<br><b>Skills:</b> ${esc(r.skills)}<br><b>Frameworks:</b> ${esc(r.frameworks)}<br><b>Tools:</b> ${esc(r.tools)}</p><p><b>Previous experience:</b> ${esc(r.previous_experience)}</p>
  <div class="links">${r.github ? `<a class="btn sm" target="_blank" rel="noopener noreferrer" href="${esc(r.github)}">GitHub</a>` : ''}${r.portfolio ? `<a class="btn sm" target="_blank" rel="noopener noreferrer" href="${esc(r.portfolio)}">Portfolio</a>` : ''}</div></div>
  <div class="card" style="margin-top:1rem"><h3>Automated screening: ${s.overall ?? '-'}/100 — ${esc(s.level || '')}</h3>${Object.entries(s.breakdown).map(([k, v]) => `<div>${esc(k)} <span class="meta">${v.pts}/${v.max}</span><div class="bar"><i style="width:${v.pts / v.max * 100}%"></i></div></div>`).join('')}<p class="meta">Quiz: ${s.quizCorrect}/${s.quizTotal} · Strengths: ${(s.strengths || []).map(esc).join(', ')} · Improve: ${(s.improvements || []).map(esc).join(', ')}</p><p>${esc(s.recommendation)}</p><p class="meta">${esc(s.disclaimer)}</p></div>
  <h3 style="margin:1rem 0 .5rem">Submitted projects</h3><div class="grid">${(r.projects || []).map(p => `<div class="card"><h3>${esc(p.name)}</h3><span class="chip">${esc(p.category)}</span><p>${esc(p.description)}</p><p><b>Tech:</b> ${esc(p.tech)}<br><b>Contribution:</b> ${esc(p.contribution)}</p><div class="links">${p.repo ? `<a class="btn sm" target="_blank" rel="noopener noreferrer" href="${esc(p.repo)}">Repo</a>` : ''}${p.demo ? `<a class="btn sm" target="_blank" rel="noopener noreferrer" href="${esc(p.demo)}">Demo</a>` : ''}</div><div class="links">${(p.shots || []).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img class="shot" alt="" src="${esc(u)}"></a>`).join('')}</div></div>`).join('')}</div>
  <h3 style="margin:1rem 0 .5rem">Coding challenge answer</h3><pre>${esc(r.challenge) || '(empty)'}</pre>
  <form id="sf" class="card" style="margin-top:1rem"><label>Status<select name="status">${ST.map(x => `<option${x === r.status ? ' selected' : ''}>${x}</option>`).join('')}</select></label><label>Message shown to applicant on Track page<textarea name="pn">${esc(r.public_note)}</textarea></label><label>Private admin notes<textarea name="an">${esc(r.admin_notes)}</textarea></label>
  <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn pri">Save status</button><a class="btn wa sm" id="nw" target="_blank" rel="noopener noreferrer" href="#">Notify via WhatsApp</a><a class="btn sm" id="ne" href="#">Notify via email</a><button type="button" class="btn bad sm" id="dl">Delete application</button></div></form>`;
  const notify = () => { const t = `Hello ${r.full_name}, your CYRAX DEVELOPERS application (${r.ref}) status is now: ${$('#sf').status.value}. Check details at the Track page on our website.`; $('#nw').href = `https://wa.me/${wa}?text=${encodeURIComponent(t)}`; $('#ne').href = `mailto:${r.email}?subject=${encodeURIComponent('CYRAX DEVELOPERS application ' + r.ref)}&body=${encodeURIComponent(t)}`; };
  notify(); $('#sf').status.onchange = notify; $('#bk').onclick = () => go('applications');
  $('#sf').onsubmit = async e => { e.preventDefault(); try { await call('setStatus', { id, status: e.target.status.value, public_note: e.target.pn.value, admin_notes: e.target.an.value }); toast('Status saved. The applicant sees it on the Track page.'); } catch (x) { toast(x.message); } };
  $('#dl').onclick = async () => { if (confirm('Permanently delete this application?')) { await call('deleteApplication', { id }); go('applications'); } };
}
start();
})();
