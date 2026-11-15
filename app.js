(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safe = u => /^https?:\/\//i.test(u || '') ? u : '#';
const api = async (p, o = {}) => { const r = await fetch('/api/' + p, { ...o, headers: { 'content-type': 'application/json', ...(o.headers || {}) } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Request failed'); return j; };
const post = (p, b, tok) => api(p, { method: 'POST', body: JSON.stringify(b), headers: tok ? { authorization: 'Bearer ' + tok } : {} });
const CATS = ['Android Applications', 'VPN & Networking', 'Telegram & WhatsApp Bots', 'Artificial Intelligence', 'Web Development', 'Developer Utilities', 'Software Engineering'];
const STACK = [['JavaScript', 'javascript/javascript-original', 'Interactive frontends and Node services.'], ['Python', 'python/python-original', 'Automation, bots and AI tooling.'], ['HTML5', 'html5/html5-original', 'Semantic, accessible markup.'], ['CSS3', 'css3/css3-original', 'Modern responsive interfaces.'], ['React', 'react/react-original', 'Component-driven web apps.'], ['Node.js', 'nodejs/nodejs-original', 'APIs, bots and realtime backends.'], ['Java', 'java/java-original', 'Android and enterprise software.'], ['Kotlin', 'kotlin/kotlin-original', 'Native Android with Jetpack Compose.'], ['PHP', 'php/php-original', 'Server-rendered web platforms.'], ['GitHub', 'github/github-original', 'Version control and CI/CD.'], ['Firebase', 'firebase/firebase-plain', 'Auth, realtime data and hosting.'], ['APIs', null, 'REST and webhook integrations.', '{ }'], ['Android Development', 'android/android-original', 'APK builds and mobile products.'], ['Linux', 'linux/linux-original', 'Servers, tooling and networking.'], ['Cloud Computing', null, 'Deployment on modern cloud platforms.', '☁']];
let D = { projects: [], announcements: [], team: [], posts: [], content: {}, stats: {}, quiz: [] }, tok = null, me = {}, pf = 'all', formT = Date.now();
try { tok = localStorage.getItem('cx-token'); } catch {}
const setTok = t => { tok = t; try { t ? localStorage.setItem('cx-token', t) : localStorage.removeItem('cx-token'); } catch {} };
const msg = (el, t, k = 'err') => el.innerHTML = t ? `<div class="msg ${k}">${esc(t)}</div>` : '';

// theme, menu, year
const setTheme = t => { document.documentElement.dataset.theme = t; try { localStorage.setItem('cx-theme', t); } catch {} };
try { setTheme(localStorage.getItem('cx-theme') || 'dark'); } catch {}
$('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
$('#menu').onclick = () => $('#nav').classList.toggle('open');
$('#yr').textContent = new Date().getFullYear();
document.addEventListener('click', e => {
  const d = e.target.closest('[data-dlg]'); if (d) { e.preventDefault(); $('#' + d.dataset.dlg).showModal(); }
  if (e.target.closest('#nav a')) $('#nav').classList.remove('open');
  const t = e.target.closest('.ti'); if (t) t.querySelector('small').textContent = t.dataset.d;
});
document.addEventListener('pointermove', e => { const c = e.target.closest?.('.card'); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); } });

// animated background
(() => {
  const c = $('#bg'), x = c.getContext('2d'); let w, h, P = [];
  const rs = () => { w = c.width = innerWidth; h = c.height = innerHeight; P = Array.from({ length: Math.min(70, Math.floor(w / 18)) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4 })); };
  rs(); addEventListener('resize', rs);
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  (function f() { x.clearRect(0, 0, w, h); P.forEach((p, i) => { p.x = (p.x + p.vx + w) % w; p.y = (p.y + p.vy + h) % h; x.fillStyle = 'rgba(0,229,255,.7)'; x.fillRect(p.x, p.y, 2, 2);
    for (let j = i + 1; j < P.length; j++) { const d = Math.hypot(p.x - P[j].x, p.y - P[j].y); if (d < 120) { x.strokeStyle = `rgba(80,130,255,${.25 * (1 - d / 120)})`; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(P[j].x, P[j].y); x.stroke(); } } }); requestAnimationFrame(f); })();
})();

// rendering
const card = p => {
  const st = p.status === 'Live' ? '' : p.status === 'In Development' ? ' dev' : ' soon';
  const links = (p.links || []).map(l => l.url ? `<a class="btn sm" href="${esc(safe(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a>` : `<span class="chip">${esc(l.label)}: ${esc(l.text)}</span>`).join('');
  return `<div class="card"><div class="ico">${esc(p.icon || '⚡')}</div><h3>${esc(p.name)}</h3><span class="chip st${st}">${esc(p.status)}</span><span class="chip">${esc(p.category)}</span><p style="margin:.5rem 0">${esc(p.description)}</p>${(p.technologies || []).map(t => `<span class="chip">${esc(t)}</span>`).join('')}<div class="links">${links}</div></div>`;
};
const fmt = d => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
function render() {
  const s = D.stats, c = D.content;
  $('#stats').innerHTML = [['Projects', s.projects], ['Team Members', s.team], ['Applications Received', s.applications], ['Community Members', s.members]].map(([k, v]) => `<div class="stat"><b>${v ?? 0}</b>${k}</div>`).join('');
  if (c.hero_description) $('#heroDesc').textContent = c.hero_description;
  if (c.about_text) $('#aboutText').textContent = c.about_text;
  $('#joinClosed').hidden = c.join_open !== 'no'; $('#applyForm').hidden = c.join_open === 'no';
  $('#stack').innerHTML = STACK.map(([n, i, d, g]) => `<div class="card ti" data-d="${esc(d)}">${i ? `<img alt="${esc(n)}" loading="lazy" src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/${i}.svg">` : `<span class="g">${g}</span>`}<b style="font-size:.85rem">${esc(n)}</b><small>Tap to explore</small></div>`).join('');
  const f = D.projects.filter(p => p.featured); $('#featured').innerHTML = (f.length ? f : D.projects.slice(0, 3)).map(card).join('') || '<p class="meta">No projects yet.</p>';
  $('#ann').innerHTML = D.announcements.map(a => `<div class="card"><div class="meta">${fmt(a.created_at)}</div><h3>${esc(a.title)}</h3><p>${esc(a.body)}</p></div>`).join('') || '<div class="card"><p>No announcements yet — check back soon.</p></div>';
  $('#filters').innerHTML = ['All', ...CATS].map(k => `<a class="btn sm" href="#/tools/${encodeURIComponent(k)}" data-f="${esc(k)}">${esc(k)}</a>`).join('');
  $('#team').innerHTML = D.team.map(t => `<div class="card">${t.avatar_url ? `<img class="av" alt="" src="${esc(safe(t.avatar_url))}">` : '<div class="ico">👤</div>'}<h3>${esc(t.name)}</h3><span class="chip">${esc(t.role)}</span><p>${esc(t.bio || '')}</p><div class="links">${(t.links || []).filter(l => l.url).map(l => `<a class="btn sm" target="_blank" rel="noopener noreferrer" href="${esc(safe(l.url))}">${esc(l.label)}</a>`).join('')}</div></div>`).join('') || '<div class="card"><p>Team profiles will appear here.</p></div>';
  renderPosts();
}
function setFilter(k) {
  $$('#filters a').forEach(a => a.classList.toggle('on', a.dataset.f === k));
  const l = k === 'All' ? D.projects : D.projects.filter(p => p.category === k);
  $('#tools').innerHTML = l.map(card).join('') || '<div class="card"><p>Nothing here yet — projects in this category are coming soon.</p></div>';
}
const KIND = { all: 'All', discussion: 'Discussions', collaboration: 'Collaborations', achievement: 'Achievements', showcase: 'Showcases', news: 'Tech News' };
function renderPosts() {
  $('#pf').innerHTML = Object.entries(KIND).map(([k, v]) => `<button class="btn sm${pf === k ? ' on' : ''}" data-pf="${k}">${v}</button>`).join('');
  const l = D.posts.filter(p => pf === 'all' || p.kind === pf);
  $('#posts').innerHTML = l.map(p => `<div class="card post"><div class="meta">${esc(KIND[p.kind] || p.kind)} · ${esc(p.author_name)} · ${fmt(p.created_at)}</div><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p>${p.link ? `<div class="links"><a class="btn sm" target="_blank" rel="noopener noreferrer" href="${esc(safe(p.link))}">Open link ↗</a></div>` : ''}${me.role === 'admin' ? `<div class="links"><button class="btn sm bad" data-del="${p.id}">Delete</button></div>` : ''}</div>`).join('') || '<div class="card"><p>No posts yet. Approved members can start the conversation.</p></div>';
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-pf]'); if (b) { pf = b.dataset.pf; renderPosts(); }
  const d = e.target.closest('[data-del]'); if (d && confirm('Delete this post?')) { await post('member', { action: 'delete', id: d.dataset.del }, tok); await load(); }
});

// router
function route() {
  let h = location.hash.replace(/^#\/?/, ''); 
  const [pg, arg] = h.split('/').map(decodeURIComponent);
  const id = ({ '': 'home', tools: 'tools', join: 'join', track: 'track', community: 'community', contact: 'contact' })[pg || ''];
  $$('.page').forEach(p => p.classList.remove('active')); $('#p-' + (id || '404')).classList.add('active'); scrollTo(0, 0);
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (id === 'home' ? '' : id)));
  if (id === 'tools') setFilter(arg || 'All');
  document.title = id === 'home' ? 'CYRAX DEVELOPERS — Engineering Tomorrow, Today.' : (id ? id[0].toUpperCase() + id.slice(1) : '404') + ' — CYRAX DEVELOPERS';
}
addEventListener('hashchange', route);

// application form
const toJpeg = (file, max = 1000) => new Promise((res, rej) => {
  if (!/^image\//.test(file.type)) return rej(new Error('Only image files are allowed.'));
  const img = new Image(), u = URL.createObjectURL(file);
  img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', .72)); };
  img.onerror = () => rej(new Error('Could not read image.')); img.src = u;
});
function addProj() {
  const n = $$('.proj').length; if (n >= 5) return;
  const el = document.createElement('div'); el.className = 'proj card';
  el.innerHTML = `<h3>Project ${n + 1}</h3><div style="display:grid;gap:.7rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))"><label>Project name<input data-k="name" maxlength="80"></label><label>Category<select data-k="category">${CATS.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
  <label style="grid-column:1/-1">Description<textarea data-k="description" maxlength="600"></textarea></label><label>Technologies used<input data-k="tech"></label><label>GitHub repository<input data-k="repo" type="url"></label><label>Live demo<input data-k="demo" type="url"></label><label>Screenshots (up to 3)<input data-k="shots" type="file" accept="image/*" multiple></label>
  <label style="grid-column:1/-1">Your actual contribution<textarea data-k="contribution" maxlength="500"></textarea></label></div>`;
  $('#projs').append(el);
}
$('#addProj').onclick = addProj;
$('#applyForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, m = $('#applyMsg'), btn = $('#applyBtn'); msg(m, '');
  if (!$('#consent').checked) return msg(m, 'Please accept the Terms and Privacy Policy.');
  const q = D.quiz.map((_, i) => { const r = $(`input[name=q${i}]:checked`); return r ? +r.value : -1; });
  if (q.includes(-1)) return msg(m, 'Please answer every assessment question.');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    const v = n => f.elements[n].value, body = { t: formT, website: v('website'), quiz: q, projects: [] };
    ['full_name', 'username', 'country', 'age', 'email', 'whatsapp', 'bio', 'languages', 'experience_years', 'skills', 'frameworks', 'tools', 'previous_experience', 'github', 'portfolio', 'telegram', 'challenge'].forEach(k => body[k] = v(k));
    const av = f.elements.avatar.files[0]; if (av) body.avatar = await toJpeg(av, 500);
    for (const p of $$('.proj')) { const o = { shots: [] }; $$('[data-k]', p).forEach(i => { if (i.type !== 'file') o[i.dataset.k] = i.value; }); for (const file of [...$('[data-k=shots]', p).files].slice(0, 3)) o.shots.push(await toJpeg(file)); body.projects.push(o); }
    const r = await post('apply', body); f.hidden = true; showResult(r);
  } catch (x) { msg(m, x.message); btn.disabled = false; btn.textContent = 'Submit Application'; }
});
function showResult({ ref, score: s }) {
  const el = $('#applyDone'); el.hidden = false; scrollTo(0, 0);
  el.innerHTML = `<div class="banner"><h3>Application Received</h3><p>Your reference number:</p><div class="big">${esc(ref)}</div><p>Save it — you need it with your email to <a href="#/track">track your status</a>.</p></div>
  <div class="card" style="margin-top:1rem"><h3>Preliminary screening result</h3><div class="big">${s.overall}<small style="font-size:1rem">/100</small></div><p><b>${esc(s.level)}</b></p>
  ${Object.entries(s.breakdown).map(([k, v]) => `<div>${esc(k)} <span class="meta">${v.pts}/${v.max}</span><div class="bar"><i style="width:${v.pts / v.max * 100}%"></i></div></div>`).join('')}
  <p><b>Strongest areas:</b> ${s.strengths.map(esc).join(', ')}<br><b>Areas to improve:</b> ${s.improvements.map(esc).join(', ')}</p><p><b>Portfolio:</b> ${esc(s.portfolio)}</p><p><b>Recommendation:</b> ${esc(s.recommendation)}</p>
  <div class="msg">${esc(s.disclaimer)}</div></div>`;
}

// tracking
const FLOW = ['Application Received', 'Under Review', 'Assessment Required', 'Shortlisted', 'Approved'];
$('#trackForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, o = $('#trackOut'); o.innerHTML = '<p class="meta">Checking…</p>';
  try {
    const r = await post('status', { ref: f.ref.value, email: f.email.value }), i = FLOW.indexOf(r.status);
    o.innerHTML = `<div class="card"><h3>${esc(r.name)} — ${esc(r.ref)}</h3><p class="meta">Submitted ${fmt(r.created_at)}</p><div class="tl">${r.status === 'Rejected' ? '<span class="rej">Rejected</span>' : FLOW.map((s, k) => `<span class="${k < i ? 'done' : k === i ? 'cur' : ''}">${s}</span>`).join('')}</div>${r.note ? `<div class="msg">${esc(r.note)}</div>` : ''}${r.score ? `<p class="meta">Screening score: ${r.score.overall}/100 (${esc(r.score.level)}) — a screening signal only.</p>` : ''}</div>` +
      (r.reveal ? `<div class="banner" style="margin-top:1rem"><h3>${esc(r.reveal.headline)}</h3><p>For recruitment negotiations and joining arrangements, contact the founder on WhatsApp:</p><p class="big" style="font-size:1.6rem">${esc(r.reveal.number)}</p><a class="btn wa" target="_blank" rel="noopener noreferrer" href="${esc(r.reveal.link)}">Chat with the Founder on WhatsApp</a></div>` : '');
  } catch (x) { o.innerHTML = `<div class="msg err">${esc(x.message)}</div>`; }
});

// contact
$('#contactForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, m = $('#contactMsg');
  try { await post('public', { name: f.name.value, email: f.email.value, body: f.body.value, website: f.website.value }); f.reset(); msg(m, 'Message sent. We will get back to you.', 'ok'); } catch (x) { msg(m, x.message); }
});

// auth + community posting
async function refreshMe() {
  me = {}; if (tok) { try { me = await post('member', { action: 'me' }, tok); } catch {} if (!me.role) setTok(null); }
  $('#login').textContent = tok ? 'Sign out' : 'Member Login'; $('#chpw').hidden = !tok; $('#postBox').hidden = !me.role; renderPosts();
}
$('#login').onclick = async () => { if (tok) { setTok(null); await refreshMe(); } else $('#auth').showModal(); };
$('#chpw').onclick = () => $('#pw').showModal();
$('#authForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target;
  try { const r = await post('login', { email: f.email.value, password: f.password.value }); setTok(r.token); f.reset(); msg($('#authMsg'), ''); $('#auth').close(); await refreshMe(); location.hash = '#/community'; }
  catch (x) { msg($('#authMsg'), x.message); }
});
$('#forgot').onclick = () => msg($('#authMsg'), 'Passwords are reset by a CYRAX administrator. Please contact us and we will set a new one for you.', 'ok');
$('#pwForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target;
  try { const r = await post('member', { action: 'changePassword', current: f.c.value, password: f.p.value }, tok); setTok(r.token); f.reset(); msg($('#pwMsg'), ''); $('#pw').close(); }
  catch (x) { msg($('#pwMsg'), x.message); }
});
$('#postForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target;
  try { await post('member', { action: 'post', kind: f.kind.value, title: f.title.value, body: f.body.value, link: f.link.value }, tok); f.reset(); msg($('#postMsg'), ''); await load(); } catch (x) { msg($('#postMsg'), x.message); }
});
// quiz + boot
async function load() { try { D = await api('public'); } catch (x) { console.error(x); } render(); route();
  $('#quiz').innerHTML = D.quiz.map((q, i) => `<div class="q"><b>${i + 1}. ${esc(q.q)}</b>${q.o.map((o, j) => `<label><input type="radio" name="q${i}" value="${j}"> ${esc(o)}</label>`).join('')}</div>`).join(''); }
addProj();
Promise.all([load(), refreshMe(), new Promise(r => setTimeout(r, 700))]).then(() => $('#loader').classList.add('off'));
})();
