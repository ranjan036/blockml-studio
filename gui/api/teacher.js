// BlockML Studio teacher answers (MIT): POST /api/teacher {"password": "..."}
// The fix-the-bug answers are not on the lesson pages, which students read; this function
// gives them to the teacher page (/lessons/teacher/) after checking the password, which
// is set in the Vercel project's settings as the environment variable TEACHER_PASSWORD
// (never in the code). The answers are written by the lesson builders into _teacher/*.json;
// teacher-only material that must not be readable in the public repository (the Teacher
// Guide's reference code) is in _teacher/*.enc, encrypted (AES-256-GCM) with the key in the
// TEACHER_DATA_KEY environment variable (extensions/starters/teacher-secret.mjs).
//
// Keep this file the same as gui/api/teacher.js (one of the two is used, depending
// on the Vercel project's root folder; tests check they match).

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '_teacher');
const GROUPS = ['games', 'robotics'];

// The encrypted groups (_teacher/*.enc), or a note when the key is missing or wrong.
function secretGroups() {
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.enc')).sort() : [];
  if (!files.length) return { groups: [], notes: [] };
  const key = process.env.TEACHER_DATA_KEY ? Buffer.from(process.env.TEACHER_DATA_KEY.trim(), 'base64') : null;
  if (!key || key.length !== 32) return { groups: [], notes: ['The reference code is locked: TEACHER_DATA_KEY is not set up in Vercel.'] };
  const groups = [];
  const notes = [];
  for (const f of files) {
    try {
      const sealed = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(sealed.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'));
      const plain = Buffer.concat([decipher.update(Buffer.from(sealed.data, 'base64')), decipher.final()]).toString('utf8');
      groups.push(JSON.parse(plain));
    } catch {
      notes.push(`Could not unlock ${f}: TEACHER_DATA_KEY does not match.`);
    }
  }
  return { groups, notes };
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Compares in constant time (hashing first makes the lengths equal).
function same(a, b) {
  const h = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(JSON.parse(req.body || '{}'));
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 10000) reject(new Error('too big')); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  const secret = process.env.TEACHER_PASSWORD;
  if (!secret) return send(res, 503, { error: 'The teacher password has not been set up yet (TEACHER_PASSWORD in Vercel).' });
  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, { error: 'Bad request.' });
  }
  if (!body || typeof body.password !== 'string' || !same(body.password, secret)) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    return send(res, 401, { error: 'Wrong password.' });
  }
  const sealed = secretGroups();
  const groups = GROUPS
    .map((g) => JSON.parse(fs.readFileSync(path.join(DIR, `${g}.json`), 'utf8')))
    .concat(sealed.groups)
    .sort((a, b) => a.order - b.order)
    .map(({ name, items }) => ({ name, items }));
  return send(res, 200, { groups, notes: sealed.notes });
};
