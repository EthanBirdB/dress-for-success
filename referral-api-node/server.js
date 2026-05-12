const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = 8080;
const JWT_SECRET = 'dfs-hackathon-jwt-secret-key-2026';

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// JWT auth middleware
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Input validation helpers
const VALID_REASONS = ['INTERVIEW', 'WEDDING', 'COURT_APPEARANCE', 'JOB_START', 'OTHER'];
const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const VALID_SOURCES = ['WEB', 'PHONE_AI'];
const PHONE_RE = /^[+]?[0-9\s\-()\\.]{7,20}$/;

// ─── Seed default users ───────────────────────────────────────────────────────

async function seedUsers() {
  if (!db.userExists('admin')) {
    db.createUser({
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      displayName: 'Admin User',
      role: 'ADMIN',
    });
    console.log('Created default user: admin / admin123');
  }
  if (!db.userExists('staff')) {
    db.createUser({
      username: 'staff',
      passwordHash: await bcrypt.hash('staff123', 10),
      displayName: 'Staff Member',
      role: 'STAFF',
    });
    console.log('Created default user: staff / staff123');
  }
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.findUserByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: user.username, displayName: user.displayName, role: user.role });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.findUserByUsername(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ username: user.username, displayName: user.displayName, role: user.role });
});

// ─── Referral Routes ─────────────────────────────────────────────────────────

// Public – submit referral
app.post('/api/referrals', (req, res) => {
  const { firstName, lastName, phoneNumber, email, referralReason,
          referralReasonOther, dressSize, shoeSize, topSize, bottomSize, source } = req.body || {};

  const errors = {};
  if (!firstName?.trim()) errors.firstName = 'First name is required';
  if (!lastName?.trim()) errors.lastName = 'Last name is required';
  if (!phoneNumber?.trim()) errors.phoneNumber = 'Phone number is required';
  else if (!PHONE_RE.test(phoneNumber.trim())) errors.phoneNumber = 'Invalid phone number format';
  if (!referralReason) errors.referralReason = 'Referral reason is required';
  else if (!VALID_REASONS.includes(referralReason)) errors.referralReason = 'Invalid referral reason';
  if (referralReason === 'OTHER' && !referralReasonOther?.trim())
    errors.referralReasonOther = 'Please specify the reason';
  if (source && !VALID_SOURCES.includes(source)) errors.source = 'Invalid source';

  if (Object.keys(errors).length > 0) return res.status(400).json({ error: 'Validation failed', fields: errors });

  const referral = db.createReferral({
    firstName, lastName, phoneNumber, email, referralReason, referralReasonOther,
    dressSize, shoeSize, topSize, bottomSize, source,
  });
  res.status(201).json({ ...referral, notes: [] });
});

// Protected – list referrals
app.get('/api/referrals', requireAuth, (req, res) => {
  const { status, search, page = '0', size = '20', sortDir = 'desc' } = req.query;
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const result = db.getReferrals({
    status: status || null,
    search: search || null,
    page: parseInt(page, 10),
    size: parseInt(size, 10),
    sortDir,
  });
  res.json(result);
});

// Protected – get single referral
app.get('/api/referrals/:id', requireAuth, (req, res) => {
  const referral = db.getReferralById(req.params.id);
  if (!referral) return res.status(404).json({ error: 'Referral not found' });
  res.json(referral);
});

// Protected – update status
app.patch('/api/referrals/:id/status', requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!status || !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const referral = db.updateReferralStatus(req.params.id, status);
  if (!referral) return res.status(404).json({ error: 'Referral not found' });
  res.json(referral);
});

// Protected – add note
app.post('/api/referrals/:id/notes', requireAuth, (req, res) => {
  const { noteText } = req.body || {};
  if (!noteText?.trim()) return res.status(400).json({ error: 'Note text is required' });
  const note = db.addNote(req.params.id, noteText, req.user.username);
  if (!note) return res.status(404).json({ error: 'Referral not found' });
  res.status(201).json(note);
});

// Protected – get notes
app.get('/api/referrals/:id/notes', requireAuth, (req, res) => {
  res.json(db.getNotes(req.params.id));
});

// ─── Start ────────────────────────────────────────────────────────────────────

seedUsers().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Referral API running at http://localhost:${PORT}`);
    console.log(`   Staff login: admin / admin123  |  staff / staff123\n`);
  });
});
