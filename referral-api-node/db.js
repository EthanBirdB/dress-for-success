const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const CHARACTERISTICS = [
  'Wedding Styling', 'Interview Prep', 'Court Appearance', 'Custom Fitting',
  'Alterations', 'Plus Size Fitting', 'Business Casual', 'Confidence Coaching',
  'Maternity Wear', 'Formal Wear',
];

const LOCATIONS = ['Illawarra', 'Newcastle Hunter', 'Tasmania', 'Melbourne'];

const defaultData = { bookings: [], notes: [], staffMembers: [], assignments: [], staffUsers: [] };

function read() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    return { ...defaultData };
  }
  const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  return { ...defaultData, ...raw };
}

function write(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ─── Bookings ──────────────────────────────────────────────────────────────

function createBooking(fields) {
  const db = read();
  const booking = {
    id: uuidv4(),
    firstName: (fields.firstName || '').trim(),
    lastName: (fields.lastName || '').trim(),
    phoneNumber: (fields.phoneNumber || '').trim(),
    email: fields.email ? fields.email.trim() : null,
    scheduledDate: fields.scheduledDate || null,
    scheduledTime: fields.scheduledTime || null,
    characteristics: Array.isArray(fields.characteristics) ? fields.characteristics : [],
    description: fields.description ? fields.description.trim() : null,
    dressSize: fields.dressSize || null,
    shoeSize: fields.shoeSize || null,
    topSize: fields.topSize || null,
    bottomSize: fields.bottomSize || null,
    status: fields.status || 'QUEUED',
    source: fields.source || 'WEB',
    location: fields.location || null,
    assignedStaffId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.bookings.push(booking);
  write(db);
  return booking;
}

function getBookings({ status, search, location, page = 0, size = 50, sortDir = 'asc' } = {}) {
  const db = read();
  let items = [...db.bookings];

  if (status) items = items.filter(b => b.status === status);
  if (location) items = items.filter(b => b.location === location);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(b =>
      (b.firstName + ' ' + b.lastName).toLowerCase().includes(q) ||
      (b.phoneNumber || '').includes(q)
    );
  }

  items.sort((a, b) => {
    const da = a.scheduledDate || a.createdAt;
    const db2 = b.scheduledDate || b.createdAt;
    return sortDir === 'asc' ? da.localeCompare(db2) : db2.localeCompare(da);
  });

  const totalElements = items.length;
  return {
    content: items.slice(page * size, page * size + size),
    totalElements,
    totalPages: Math.ceil(totalElements / size),
    number: page,
    size,
  };
}

function getBookingById(id) {
  const db = read();
  const booking = db.bookings.find(b => b.id === id);
  if (!booking) return null;
  const notes = db.notes
    .filter(n => n.bookingId === id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return { ...booking, notes };
}

function updateBookingStatus(id, status) {
  const db = read();
  const idx = db.bookings.findIndex(b => b.id === id);
  if (idx === -1) return null;
  db.bookings[idx].status = status;
  db.bookings[idx].updatedAt = new Date().toISOString();
  write(db);
  const notes = db.notes.filter(n => n.bookingId === id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return { ...db.bookings[idx], notes };
}

function setBookingAssignedStaff(id, staffId) {
  const db = read();
  const idx = db.bookings.findIndex(b => b.id === id);
  if (idx === -1) return null;
  db.bookings[idx].assignedStaffId = staffId;
  db.bookings[idx].status = 'ASSIGNED';
  db.bookings[idx].updatedAt = new Date().toISOString();
  write(db);
  return db.bookings[idx];
}

// ─── Notes ─────────────────────────────────────────────────────────────────

function addNote(bookingId, noteText, createdBy) {
  const db = read();
  if (!db.bookings.find(b => b.id === bookingId)) return null;
  const note = {
    id: uuidv4(),
    bookingId,
    noteText: noteText.trim(),
    createdBy,
    createdAt: new Date().toISOString(),
  };
  db.notes.push(note);
  write(db);
  return note;
}

function getNotes(bookingId) {
  const db = read();
  return db.notes
    .filter(n => n.bookingId === bookingId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

// ─── Staff Members ─────────────────────────────────────────────────────────

function getAllStaff(includeInactive = false) {
  const db = read();
  return includeInactive ? db.staffMembers : db.staffMembers.filter(s => s.isActive !== false);
}

function getStaffById(id) {
  const db = read();
  return db.staffMembers.find(s => s.id === id) || null;
}

function createStaffMember(fields) {
  const db = read();
  const member = {
    id: uuidv4(),
    name: (fields.name || '').trim(),
    email: (fields.email || '').trim(),
    phone: fields.phone ? fields.phone.trim() : null,
    type: fields.type || 'STAFF',
    traits: Array.isArray(fields.traits) ? fields.traits : [],
    bio: fields.bio ? fields.bio.trim() : null,
    availability: fields.availability || { days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], startTime: '09:00', endTime: '17:00' },
    locations: Array.isArray(fields.locations) ? fields.locations : (fields.location ? [fields.location] : []),
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.staffMembers.push(member);
  write(db);
  return member;
}

function updateStaffMember(id, fields) {
  const db = read();
  const idx = db.staffMembers.findIndex(s => s.id === id);
  if (idx === -1) return null;
  db.staffMembers[idx] = { ...db.staffMembers[idx], ...fields, id };
  write(db);
  return db.staffMembers[idx];
}

function deactivateStaffMember(id) {
  const db = read();
  const idx = db.staffMembers.findIndex(s => s.id === id);
  if (idx === -1) return null;
  db.staffMembers[idx].isActive = false;
  write(db);
  return db.staffMembers[idx];
}

// ─── Assignments ───────────────────────────────────────────────────────────

function createAssignment(bookingId, staffId, rank) {
  const db = read();
  const assignment = {
    id: uuidv4(),
    bookingId,
    staffId,
    status: 'PENDING',
    token: uuidv4(),
    rank,
    sentAt: new Date().toISOString(),
    respondedAt: null,
    createdAt: new Date().toISOString(),
  };
  db.assignments.push(assignment);
  write(db);
  return assignment;
}

function getAssignmentByToken(token) {
  const db = read();
  return db.assignments.find(a => a.token === token) || null;
}

function getAssignmentsForBooking(bookingId) {
  const db = read();
  return db.assignments
    .filter(a => a.bookingId === bookingId)
    .sort((a, b) => a.rank - b.rank);
}

function respondToAssignment(token, response) {
  const db = read();
  const idx = db.assignments.findIndex(a => a.token === token);
  if (idx === -1) return null;
  db.assignments[idx].status = response;
  db.assignments[idx].respondedAt = new Date().toISOString();
  write(db);
  return db.assignments[idx];
}

// ─── Staff Users (portal login) ─────────────────────────────────────────────

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
  CHARACTERISTICS,
  LOCATIONS,
  createBooking, getBookings, getBookingById, updateBookingStatus, setBookingAssignedStaff,
  addNote, getNotes,
  getAllStaff, getStaffById, createStaffMember, updateStaffMember, deactivateStaffMember,
  createAssignment, getAssignmentByToken, getAssignmentsForBooking, respondToAssignment,
  findUserByUsername, userExists, createUser,
};

