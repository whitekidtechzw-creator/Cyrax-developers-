const { db, json, limit, clean, body } = require('./util');
module.exports = async req => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!limit(req, 'status', 20, 600)) return json(429, { error: 'Too many lookups. Try again in a few minutes.' });
  const b = body(req) || {};
  const ref = clean(b.ref, 20).toUpperCase(), email = clean(b.email, 120).toLowerCase();
  const data = db.data.applications.find(a => a.ref === ref && a.email === email);
  if (!data) return json(404, { error: 'No application found for that reference and email.' });
  const out = { ref: data.ref, name: data.full_name, status: data.status, created_at: data.created_at, note: data.public_note, score: data.score && { overall: data.score.overall, level: data.score.level } };
  const n = (process.env.FOUNDER_WHATSAPP || '').replace(/[^0-9]/g, '');
  if (['Shortlisted', 'Approved'].includes(data.status) && n) {
    out.reveal = { headline: 'CONGRATULATIONS! YOU HAVE BEEN SHORTLISTED FOR CYRAX DEVELOPERS.', number: '+' + n,
      link: `https://wa.me/${n}?text=${encodeURIComponent(`Hello, I am ${data.full_name}. My CYRAX DEVELOPERS application reference is ${data.ref} (${data.status}). I would like to discuss joining arrangements.`)}` };
  }
  return json(200, out);
};
