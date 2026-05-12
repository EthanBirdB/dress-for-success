const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultData = { referrals: [], notes: [], staffUsers: [] };

function read() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function write(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- Referrals ---
function createReferral(fields) {
  const db = read();
  const referral = {
    id: uuidv4(),
    firstName: fields.firstName.trim(),
    lastName: fields.lastName.trim(),
    phoneNumber: fields.phoneNumber.trim(),
    email: fields.email ? fields.email.trim() : null,
    dressSize: fields.dressSize || null,
    shoeSize: fields.shoeSize || null,
    topSize: fields.topSize || null,
    bottomSize: fields.bottomSize || null,
    referralReason: fields.referralReason,
    referralReasonOther: fields.referralReasonOther || null,
    status: 'PENDING',
    source: fields.source || 'WEB',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.referrals.push(referral);
  write(db);
  return referral;
}

function getReferrals({ status, search, page = 0, size = 20, sortDir = 'desc' }) {
  const db = read();
  let items = [...db.referrals];

  if (status) items = items.filter(r => r.status === status);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(r =>
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.phoneNumber.includes(q)
    );
  }

  items.sort((a, b) => sortDir === 'asc'
    ? new Date(a.createdAt) - new Date(b.createdAt)
    : new Date(b.createdAt) - new Date(a.createdAt)
  );

  const totalElements = items.length;
  const content = items.slice(page * size, page * size + size);
  return {
    content,
    totalElements,
    totalPages: Math.ceil(totalElements / size),
    number: page,
    size,
  };
}

function getReferralById(id) {
  const db = read();
  const referral = db.referrals.find(r => r.id === id);
  if (!referral) return null;
  const notes = db.notes
    .filter(n => n.referralId === id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return { ...referral, notes };
}

function updateReferralStatus(id, status) {
  const db = read();
  const idx = db.referrals.findIndex(r => r.id === id);
  if (idx === -1) return null;
  db.referrals[idx].status = status;
  db.referrals[idx].updatedAt = new Date().toISOString();
  write(db);
  const notes = db.notes
    .filter(n => n.referralId === id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return { ...db.referrals[idx], notes };
}

function addNote(referralId, noteText, createdBy) {
  const db = read();
  if (!db.referrals.find(r => r.id === referralId)) return null;
  const note = {
    id: uuidv4(),
    referralId,
    noteText: noteText.trim(),
    createdBy,
    createdAt: new Date().toISOString(),
  };
  db.notes.push(note);
  write(db);
  return note;
}

function getNotes(referralId) {
  const db = read();
  return db.notes
    .filter(n => n.referralId === referralId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

// --- Staff Users ---
function findUserByUsername(username) {
  const db = read();
  return db.staffUsers.find(u => u.username === username) || null;
}

function userExists(username) {
  const db = read();
  return db.staffUsers.some(u => u.username === username);
}

function createUser(fields) {
  const db = read();
  const user = { id: uuidv4(), ...fields, createdAt: new Date().toISOString() };
  db.staffUsers.push(user);
  write(db);
  return user;
}

module.exports = {
  createReferral, getReferrals, getReferralById, updateReferralStatus,
  addNote, getNotes, findUserByUsername, userExists, createUser,
};
