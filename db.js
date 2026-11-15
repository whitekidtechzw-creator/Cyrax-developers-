// Tiny file-based database: everything lives in <DATA_DIR>/db.json (atomic writes + daily backups).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const UPLOADS = path.join(DATA_DIR, 'uploads'), BACKUPS = path.join(DATA_DIR, 'backups'), FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(UPLOADS, { recursive: true }); fs.mkdirSync(BACKUPS, { recursive: true });

const empty = () => ({ applications: [], projects: [], announcements: [], team: [], users: [], posts: [], messages: [], content: {}, seeded: false, adminEnvFp: '' });
let data = empty();
if (fs.existsSync(FILE)) {
  try { data = { ...empty(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; }
  catch (e) {
    fs.copyFileSync(FILE, FILE + '.corrupt-' + Date.now());
    throw new Error('data/db.json is unreadable. A copy was saved next to it. Restore it from data/backups or delete it to start fresh.');
  }
}
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

let chain = Promise.resolve(), lastBackup = '';
async function write() {
  const tmp = FILE + '.tmp';
  await fs.promises.writeFile(tmp, JSON.stringify(data));
  await fs.promises.rename(tmp, FILE);
  const day = new Date().toISOString().slice(0, 10);
  if (day !== lastBackup) {
    lastBackup = day;
    await fs.promises.copyFile(FILE, path.join(BACKUPS, `db-${day}.json`));
    const old = (await fs.promises.readdir(BACKUPS)).filter(f => /^db-.*\.json$/.test(f)).sort().slice(0, -14);
    for (const f of old) await fs.promises.unlink(path.join(BACKUPS, f)).catch(() => {});
  }
}
const save = () => (chain = chain.then(write).catch(e => console.error('Could not save database:', e.message)));

function seed() {
  if (data.seeded) return;
  const P = require('./seed');
  P.forEach((p, i) => data.projects.push({ id: id(), icon: '⚡', technologies: [], links: [], featured: false, sort: (i + 1) * 10, created_at: now(), ...p }));
  if (!data.content.join_open) data.content.join_open = 'yes';
  data.seeded = true; save();
}
module.exports = { get data() { return data; }, id, now, save, seed, DATA_DIR, UPLOADS };
