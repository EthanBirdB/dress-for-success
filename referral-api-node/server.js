require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { rankCandidates } = require('./matcher');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dfs-hackathon-jwt-secret-key-2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000'], credentials: true }));
app.use(express.json());

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const VALID_STATUSES = ['QUEUED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const VALID_SOURCES = ['WEB', 'PHONE_AI'];
const PHONE_RE = /^[+]?[0-9\s\-()\\.]{7,20}$/;

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seedDefaults() {
  if (!db.userExists('admin')) {
    db.createUser({ username: 'admin', passwordHash: await bcrypt.hash('admin123', 10), displayName: 'Admin User', role: 'ADMIN' });
    console.log('Created staff login: admin / admin123');
  }
  if (!db.userExists('staff')) {
    db.createUser({ username: 'staff', passwordHash: await bcrypt.hash('staff123', 10), displayName: 'Staff Member', role: 'STAFF' });
    console.log('Created staff login: staff / staff123');
  }

  // Seed demo staff members if none exist
  if (db.getAllStaff(true).length === 0) {
    const demos = [
      { name: 'Sarah Chen', email: 'sarah@demo.com', phone: '0411000001', type: 'STAFF', traits: ['Wedding Styling', 'Formal Wear', 'Custom Fitting'], bio: 'I specialise in bridal and formal wear styling with 8 years experience helping women find their perfect look for milestone events.', availability: { days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], startTime: '09:00', endTime: '17:00' } },
      { name: 'James Okafor', email: 'james@demo.com', phone: '0411000002', type: 'STAFF', traits: ['Interview Prep', 'Business Casual', 'Confidence Coaching'], bio: 'Former career coach now volunteering my skills to help clients dress confidently for job interviews and professional settings.', availability: { days: ['Monday','Wednesday','Friday'], startTime: '10:00', endTime: '16:00' } },
      { name: 'Maria Santos', email: 'maria@demo.com', phone: '0411000003', type: 'VOLUNTEER', traits: ['Plus Size Fitting', 'Alterations', 'Maternity Wear'], bio: 'Certified seamstress with expertise in alterations and inclusive sizing. Passionate about helping all body types find clothes that fit beautifully.', availability: { days: ['Tuesday','Thursday','Saturday'], startTime: '09:00', endTime: '15:00' } },
      { name: 'Priya Nair', email: 'priya@demo.com', phone: '0411000004', type: 'VOLUNTEER', traits: ['Court Appearance', 'Business Casual', 'Interview Prep'], bio: 'Paralegal with experience helping clients dress appropriately for court appearances and formal professional environments.', availability: { days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], startTime: '12:00', endTime: '18:00' } },
    ];
    for (const d of demos) db.createStaffMember(d);
    console.log('Seeded 4 demo staff members');
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = db.findUserByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: user.username, displayName: user.displayName, role: user.role });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.findUserByUsername(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ username: user.username, displayName: user.displayName, role: user.role });
});

// ─── Characteristics (config) ─────────────────────────────────────────────────

app.get('/api/characteristics', (req, res) => {
  res.json(db.CHARACTERISTICS);
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

app.post('/api/bookings', (req, res) => {
  const { firstName, lastName, phoneNumber, email, scheduledDate, scheduledTime,
          characteristics, description, dressSize, shoeSize, topSize, bottomSize, source } = req.body || {};

  const errors = {};
  if (!firstName?.trim()) errors.firstName = 'First name is required';
  if (!lastName?.trim()) errors.lastName = 'Last name is required';
  if (!phoneNumber?.trim()) errors.phoneNumber = 'Phone number is required';
  else if (!PHONE_RE.test(phoneNumber.trim())) errors.phoneNumber = 'Invalid phone number';
  if (!scheduledDate) errors.scheduledDate = 'Appointment date is required';
  if (!scheduledTime) errors.scheduledTime = 'Appointment time is required';
  if (!characteristics || !Array.isArray(characteristics) || characteristics.length === 0)
    errors.characteristics = 'Please select at least one characteristic';
  if (source && !VALID_SOURCES.includes(source)) errors.source = 'Invalid source';

  if (Object.keys(errors).length > 0) return res.status(400).json({ error: 'Validation failed', fields: errors });

  const booking = db.createBooking({ firstName, lastName, phoneNumber, email, scheduledDate,
    scheduledTime, characteristics, description, dressSize, shoeSize, topSize, bottomSize, source });
  res.status(201).json({ ...booking, notes: [] });
});

app.get('/api/bookings', requireAuth, (req, res) => {
  const { status, search, page = '0', size = '50', sortDir = 'asc' } = req.query;
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  res.json(db.getBookings({ status: status || null, search: search || null,
    page: parseInt(page, 10), size: parseInt(size, 10), sortDir }));
});

app.get('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

app.patch('/api/bookings/:id/status', requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!status || !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const booking = db.updateBookingStatus(req.params.id, status);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

app.post('/api/bookings/:id/notes', requireAuth, (req, res) => {
  const { noteText } = req.body || {};
  if (!noteText?.trim()) return res.status(400).json({ error: 'Note text is required' });
  const note = db.addNote(req.params.id, noteText, req.user.username);
  if (!note) return res.status(404).json({ error: 'Booking not found' });
  res.status(201).json(note);
});

app.get('/api/bookings/:id/notes', requireAuth, (req, res) => {
  res.json(db.getNotes(req.params.id));
});

// ─── Candidate Matching ───────────────────────────────────────────────────────

app.get('/api/bookings/:id/candidates', requireAuth, async (req, res) => {
  const booking = db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const allStaff = db.getAllStaff();
  const ranked = await rankCandidates(booking, allStaff);
  res.json(ranked);
});

// ─── Assign ───────────────────────────────────────────────────────────────────

app.post('/api/bookings/:id/assign', requireAuth, async (req, res) => {
  const { staffId } = req.body || {};
  if (!staffId) return res.status(400).json({ error: 'staffId is required' });

  const booking = db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const staff = db.getStaffById(staffId);
  if (!staff) return res.status(404).json({ error: 'Staff member not found' });

  // Mark any existing pending assignments for this booking as superseded
  const existing = db.getAssignmentsForBooking(req.params.id);
  const nextRank = existing.length + 1;

  const assignment = db.createAssignment(req.params.id, staffId, nextRank);
  db.setBookingAssignedStaff(req.params.id, staffId);

  const acceptLink = `${FRONTEND_URL}/assignment/${assignment.token}`;

  // Mock notification — log to console + return in response
  console.log(`\n📧 MOCK NOTIFICATION to ${staff.name} (${staff.email})`);
  console.log(`   Phone: ${staff.phone}`);
  console.log(`   Booking: ${booking.firstName} ${booking.lastName} on ${booking.scheduledDate}`);
  console.log(`   Accept/Deny link: ${acceptLink}\n`);

  res.status(201).json({ assignment, acceptLink, message: `Notification sent to ${staff.name}` });
});

// ─── Assignments (public — for staff links) ───────────────────────────────────

app.get('/api/assignments/:token', (req, res) => {
  const assignment = db.getAssignmentByToken(req.params.token);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const booking = db.getBookingById(assignment.bookingId);
  const staff = db.getStaffById(assignment.staffId);
  if (!booking || !staff) return res.status(404).json({ error: 'Related record not found' });

  // Privacy: only send first name to the staff
  const { passwordHash: _, ...safeStaff } = staff;
  const safeBooking = { ...booking };
  delete safeBooking.lastName;
  delete safeBooking.phoneNumber;
  delete safeBooking.email;

  res.json({ assignment, booking: safeBooking, staff: safeStaff });
});

app.post('/api/assignments/:token/respond', async (req, res) => {
  const { response } = req.body || {};
  if (!['ACCEPT', 'DENY'].includes(response)) return res.status(400).json({ error: 'response must be ACCEPT or DENY' });

  const assignment = db.getAssignmentByToken(req.params.token);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  if (assignment.status !== 'PENDING') return res.status(409).json({ error: 'Assignment already responded to' });

  db.respondToAssignment(req.params.token, response === 'ACCEPT' ? 'ACCEPTED' : 'DENIED');

  if (response === 'ACCEPT') {
    db.updateBookingStatus(assignment.bookingId, 'ACCEPTED');
    return res.json({ message: 'Assignment accepted. Thank you!', status: 'ACCEPTED' });
  }

  // DENY — try next best candidate automatically
  const booking = db.getBookingById(assignment.bookingId);
  const allStaff = db.getAllStaff();
  const ranked = await rankCandidates(booking, allStaff);
  const previousAssignments = db.getAssignmentsForBooking(assignment.bookingId);
  const assignedIds = new Set(previousAssignments.map(a => a.staffId));

  const nextCandidate = ranked.find(c => !assignedIds.has(c.staffId));

  if (!nextCandidate) {
    db.updateBookingStatus(assignment.bookingId, 'QUEUED');
    return res.json({ message: 'All candidates declined. Booking returned to queue.', status: 'QUEUED' });
  }

  const nextAssignment = db.createAssignment(assignment.bookingId, nextCandidate.staffId, previousAssignments.length + 1);
  db.setBookingAssignedStaff(assignment.bookingId, nextCandidate.staffId);
  const nextStaff = db.getStaffById(nextCandidate.staffId);
  const nextLink = `${FRONTEND_URL}/assignment/${nextAssignment.token}`;

  console.log(`\n📧 MOCK NOTIFICATION (auto-next) to ${nextStaff.name} (${nextStaff.email})`);
  console.log(`   Accept/Deny link: ${nextLink}\n`);

  res.json({ message: 'Declined. Next candidate has been notified.', status: 'DENIED', nextAcceptLink: nextLink });
});

// ─── Staff Members CRUD ───────────────────────────────────────────────────────

app.get('/api/staff', requireAuth, (req, res) => {
  res.json(db.getAllStaff(true));
});

app.post('/api/staff', requireAuth, (req, res) => {
  const { name, email } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
  res.status(201).json(db.createStaffMember(req.body));
});

app.put('/api/staff/:id', requireAuth, (req, res) => {
  const updated = db.updateStaffMember(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Staff member not found' });
  res.json(updated);
});

app.delete('/api/staff/:id', requireAuth, (req, res) => {
  const deactivated = db.deactivateStaffMember(req.params.id);
  if (!deactivated) return res.status(404).json({ error: 'Staff member not found' });
  res.json({ message: 'Staff member deactivated' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

seedDefaults().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Booking API running at http://localhost:${PORT}`);
    console.log(`   Staff portal login: admin / admin123\n`);
  });
});

