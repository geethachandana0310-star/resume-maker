const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const fs = require('fs');
const crypto = require('crypto');

/* JWT secret: from the JWT_SECRET env variable, otherwise a random one saved in .secret (git-ignored) */
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const f = path.join(__dirname, '.secret');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(48).toString('hex'));
  return fs.readFileSync(f, 'utf8').trim();
}
const SECRET = loadSecret();
const PORT = process.env.PORT || 3000;

/* ---------- Database (creates resume.db automatically) ---------- */
const db = new DatabaseSync(path.join(__dirname, 'resume.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS resumes (
    user_id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const app = express();
app.use(express.json({ limit: '200kb' }));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

/* Simple rate limit for login/signup: 20 attempts per IP every 15 minutes */
const hits = new Map();
setInterval(() => hits.clear(), 60 * 60 * 1000).unref();
function limit(req, res, next) {
  const now = Date.now(), rec = (hits.get(req.ip) || []).filter(t => now - t < 15 * 60 * 1000);
  if (rec.length >= 20) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  rec.push(now); hits.set(req.ip, rec); next();
}

const makeToken = id => jwt.sign({ id }, SECRET, { expiresIn: '7d' });

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.uid = jwt.verify(token, SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'Please log in again.' });
  }
}

/* ---------- Sign up ---------- */
app.post('/api/signup', limit, (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || email.length > 200 || typeof password !== 'string' || password.length < 6 || password.length > 100)
    return res.status(400).json({ error: 'Enter your name, a valid email and a password of 6+ characters.' });

  const mail = email.toLowerCase();
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(mail))
    return res.status(409).json({ error: 'This email already has a profile. Use Log in.' });

  const r = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
    .run(name.trim(), mail, bcrypt.hashSync(password, 10));
  res.json({ token: makeToken(r.lastInsertRowid) });
});

/* ---------- Log in ---------- */
app.post('/api/login', limit, (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string')
    return res.status(400).json({ error: 'Enter your email and password.' });
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!u || !bcrypt.compareSync(password, u.password))
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  res.json({ token: makeToken(u.id) });
});

/* ---------- Current user + saved resume ---------- */
app.get('/api/me', auth, (req, res) => {
  const u = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.uid);
  if (!u) return res.status(401).json({ error: 'Please log in again.' });
  const r = db.prepare('SELECT data FROM resumes WHERE user_id = ?').get(req.uid);
  res.json({ user: u, resume: r ? JSON.parse(r.data) : null });
});

/* ---------- Save resume ---------- */
app.put('/api/resume', auth, (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
    return res.status(400).json({ error: 'Invalid resume data.' });
  db.prepare(`
    INSERT INTO resumes (user_id, data) VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
  `).run(req.uid, JSON.stringify(req.body));
  res.json({ ok: true });
});

/* ---------- Delete account and all data ---------- */
app.delete('/api/account', auth, (req, res) => {
  db.prepare('DELETE FROM resumes WHERE user_id = ?').run(req.uid);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.uid);
  res.json({ ok: true });
});

app.use((err, req, res, next) => res.status(400).json({ error: 'Invalid request.' }));

app.listen(PORT, () => console.log(`Resume Maker running at http://localhost:${PORT}`));