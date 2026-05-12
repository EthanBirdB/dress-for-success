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
      { name: 'Sarah Chen', email: 'sarah@demo.com', phone: '0411000001', type: 'STAFF', locations: ['Illawarra', 'Melbourne'], traits: ['Wedding Styling', 'Formal Wear', 'Custom Fitting'], bio: 'I specialise in bridal and formal wear styling with 8 years experience helping women find their perfect look for milestone events. From garden weddings to black tie galas, I bring elegance to every appointment.', availability: { days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], startTime: '09:00', endTime: '17:00' } },
      { name: 'James Okafor', email: 'james@demo.com', phone: '0411000002', type: 'STAFF', locations: ['Melbourne'], traits: ['Interview Prep', 'Business Casual', 'Confidence Coaching'], bio: 'Former career coach now volunteering my skills to help clients dress confidently for job interviews and professional settings. Feeling put-together is the first step to believing in yourself in a new role.', availability: { days: ['Monday','Wednesday','Friday'], startTime: '10:00', endTime: '16:00' } },
      { name: 'Maria Santos', email: 'maria@demo.com', phone: '0411000003', type: 'VOLUNTEER', locations: ['Newcastle Hunter'], traits: ['Plus Size Fitting', 'Alterations', 'Maternity Wear'], bio: 'Certified seamstress with expertise in alterations and inclusive sizing. Passionate about helping all body types find clothes that fit beautifully.', availability: { days: ['Tuesday','Thursday','Saturday'], startTime: '09:00', endTime: '15:00' } },
      { name: 'Priya Nair', email: 'priya@demo.com', phone: '0411000004', type: 'VOLUNTEER', locations: ['Illawarra', 'Newcastle Hunter'], traits: ['Court Appearance', 'Business Casual', 'Interview Prep'], bio: 'Paralegal helping clients dress appropriately for court appearances and professional environments. I know what magistrates expect and can help you present with confidence.', availability: { days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], startTime: '12:00', endTime: '18:00' } },
      { name: 'Sophie Williams', email: 'sophie@demo.com', phone: '0411000005', type: 'VOLUNTEER', locations: ['Illawarra'], traits: ['Wedding Styling', 'Formal Wear', 'Confidence Coaching', 'Custom Fitting'], bio: 'Award-winning event stylist helping women look radiant on their most important days. Every woman deserves to feel like the best version of herself at milestone events.', availability: { days: ['Tuesday','Wednesday','Thursday','Saturday'], startTime: '09:00', endTime: '17:00' } },
      { name: 'Marcus Thompson', email: 'marcus@demo.com', phone: '0411000006', type: 'STAFF', locations: ['Melbourne', 'Illawarra'], traits: ['Interview Prep', 'Business Casual', 'Alterations', 'Confidence Coaching'], bio: 'Professional wardrobe consultant specialising in helping clients transition back into the workforce after career breaks. I build confidence through clothing for interviews and professional re-entry.', availability: { days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], startTime: '09:00', endTime: '17:00' } },
      { name: 'Helen Tran', email: 'helen@demo.com', phone: '0411000007', type: 'STAFF', locations: ['Newcastle Hunter', 'Tasmania'], traits: ['Maternity Wear', 'Plus Size Fitting', 'Custom Fitting', 'Alterations'], bio: 'Trained in inclusive fashion with a focus on maternity and plus-size styling. Every woman deserves clothes that make her feel beautiful at every stage of life.', availability: { days: ['Monday','Wednesday','Thursday','Friday'], startTime: '09:00', endTime: '16:00' } },
      { name: 'Lisa Patterson', email: 'lisa@demo.com', phone: '0411000008', type: 'VOLUNTEER', locations: ['Tasmania'], traits: ['Court Appearance', 'Business Casual', 'Formal Wear'], bio: 'Former legal secretary with 15 years in court settings. I help people feel prepared and dignified in legal and formal environments when it matters most.', availability: { days: ['Monday','Tuesday','Wednesday','Thursday'], startTime: '10:00', endTime: '15:00' } },
      { name: 'Angela Morris', email: 'angela@demo.com', phone: '0411000009', type: 'STAFF', locations: ['Illawarra', 'Newcastle Hunter', 'Melbourne'], traits: ['Confidence Coaching', 'Business Casual', 'Interview Prep', 'Formal Wear'], bio: 'Life coach and image consultant working across multiple regions helping women rebuild confidence through presentation. I take a holistic approach working on mindset and wardrobe together.', availability: { days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], startTime: '08:00', endTime: '18:00' } },
      { name: 'Wendy Osei', email: 'wendy@demo.com', phone: '0411000010', type: 'VOLUNTEER', locations: ['Melbourne', 'Tasmania'], traits: ['Plus Size Fitting', 'Maternity Wear', 'Wedding Styling', 'Confidence Coaching'], bio: 'Fashion stylist and body-positive advocate with 6 years in inclusive fashion. I love helping clients who have never had a professional styling experience discover their personal style at any size or stage of life.', availability: { days: ['Wednesday','Thursday','Friday','Saturday'], startTime: '10:00', endTime: '17:00' } },
      { name: 'Rachel Kim', email: 'rachel@demo.com', phone: '0411000011', type: 'STAFF', locations: ['Melbourne'], traits: ['Alterations', 'Custom Fitting', 'Wedding Styling', 'Formal Wear'], bio: 'Master tailor with 12 years in bespoke garment construction. My specialty is transforming existing garments so the fit feels made for you � because it is.', availability: { days: ['Tuesday','Wednesday','Thursday','Friday'], startTime: '09:00', endTime: '17:00' } },
      { name: 'Natalie Cross', email: 'natalie@demo.com', phone: '0411000012', type: 'VOLUNTEER', locations: ['Illawarra', 'Tasmania'], traits: ['Court Appearance', 'Interview Prep', 'Business Casual', 'Confidence Coaching'], bio: 'Former HR manager turned stylist with deep expertise in professional dress codes. I have sat on interview panels for 20 years and know exactly what first impressions matter most in courts, boardrooms, and job interviews.', availability: { days: ['Monday','Tuesday','Thursday','Friday'], startTime: '09:00', endTime: '16:00' } },
    ];
    for (const d of demos) db.createStaffMember(d);
    console.log(`Seeded ${demos.length} demo staff members`);
  }

  // Seed demo bookings
  if (db.getBookings().content.length === 0) {
    const bookings = [
      { firstName: 'Emma', lastName: 'Wilson', phoneNumber: '0421100001', email: 'emma@demo.com', scheduledDate: '2026-05-20', scheduledTime: '10:00', location: 'Illawarra', characteristics: ['Wedding Styling', 'Formal Wear', 'Custom Fitting'], description: "I'm getting married in 6 weeks and need help finding the perfect dress for our outdoor garden wedding. I want something elegant but not too fussy, and I'm on a tight budget." },
      { firstName: 'Jessica', lastName: 'Torres', phoneNumber: '0421100002', email: 'jessica@demo.com', scheduledDate: '2026-05-19', scheduledTime: '11:00', location: 'Melbourne', characteristics: ['Interview Prep', 'Business Casual', 'Confidence Coaching'], description: "I've been out of the workforce for 8 months caring for my elderly mother and finally have a job interview at an accounting firm. I just want to walk in feeling like I belong there and that I look competent and put-together." },
      { firstName: 'Aisha', lastName: 'Mohammed', phoneNumber: '0421100003', email: null, scheduledDate: '2026-05-21', scheduledTime: '09:30', location: 'Newcastle Hunter', characteristics: ['Plus Size Fitting', 'Alterations', 'Confidence Coaching'], description: "I lost 25kg this year and nothing fits anymore. I want to celebrate this milestone and find clothes that actually fit and make me feel proud of how far I've come." },
      { firstName: 'Rebecca', lastName: 'Park', phoneNumber: '0421100004', email: 'rebecca@demo.com', scheduledDate: '2026-05-22', scheduledTime: '14:00', location: 'Illawarra', characteristics: ['Court Appearance', 'Business Casual'], description: "I have a family court hearing next week regarding custody of my two daughters. I need guidance on what to wear to come across as the responsible, capable, loving mother I am." },
      { firstName: 'Linda', lastName: 'Barnes', phoneNumber: '0421100005', email: 'linda@demo.com', scheduledDate: '2026-05-18', scheduledTime: '10:00', location: 'Melbourne', characteristics: ['Maternity Wear', 'Business Casual'], description: "I'm 5 months pregnant and just accepted a new management role at a tech company. Nothing fits and I need to look authoritative in meetings and board presentations.", status: 'IN_PROGRESS' },
      { firstName: 'Chloe', lastName: 'Davis', phoneNumber: '0421100006', email: null, scheduledDate: '2026-05-23', scheduledTime: '13:00', location: 'Tasmania', characteristics: ['Court Appearance', 'Formal Wear', 'Business Casual'], description: "Appearing as a character witness in a criminal trial and want to look appropriately formal without overdoing it." },
      { firstName: 'Michelle', lastName: 'Cooper', phoneNumber: '0421100007', email: 'michelle@demo.com', scheduledDate: '2026-05-10', scheduledTime: '11:00', location: 'Illawarra', characteristics: ['Wedding Styling', 'Plus Size Fitting'], description: null, status: 'COMPLETED' },
      { firstName: 'Diane', lastName: 'Ng', phoneNumber: '0421100008', email: 'diane@demo.com', scheduledDate: '2026-05-24', scheduledTime: '09:00', location: 'Melbourne', characteristics: ['Business Casual', 'Confidence Coaching'], description: "Returning to work after 5 years at home. Starting reception at a medical centre and feel completely overwhelmed by fashion. Just want to look put-together and professional on a budget." },
      { firstName: 'Fatima', lastName: 'Al-Hassan', phoneNumber: '0421100009', email: null, scheduledDate: '2026-05-26', scheduledTime: '10:30', location: 'Newcastle Hunter', characteristics: ['Maternity Wear', 'Custom Fitting', 'Plus Size Fitting'], description: "Seven months pregnant with twins. Would love comfortable, beautiful options for the final stretch and postpartum.", dressSize: '18', topSize: 'XL' },
      { firstName: 'Karen', lastName: 'Mitchell', phoneNumber: '0421100010', email: 'karen@demo.com', scheduledDate: '2026-05-28', scheduledTime: '14:00', location: 'Illawarra', characteristics: ['Interview Prep', 'Formal Wear', 'Confidence Coaching'], description: "Recently made redundant after 12 years. Final-round interview for a senior role at a law firm and haven't interviewed in over a decade. Need to make a strong first impression." },
      { firstName: 'Terri', lastName: 'Walsh', phoneNumber: '0421100011', email: 'terri@demo.com', scheduledDate: '2026-05-29', scheduledTime: '10:00', location: 'Tasmania', characteristics: ['Court Appearance', 'Business Casual', 'Confidence Coaching'], description: "Going through a difficult divorce with several upcoming court appearances. I want to feel strong, composed, and dignified throughout this process." },
      { firstName: 'Yuki', lastName: 'Tanaka', phoneNumber: '0421100012', email: null, scheduledDate: '2026-05-30', scheduledTime: '11:30', location: 'Melbourne', characteristics: ['Wedding Styling', 'Custom Fitting', 'Formal Wear'], description: "Attending my sister's wedding as maid of honour. Loose colour theme, no set dress code. Want to look elegant and comfortable without outshining the bride." },
      { firstName: 'Bianca', lastName: 'Rossi', phoneNumber: '0421100013', email: 'bianca@demo.com', scheduledDate: '2026-06-02', scheduledTime: '09:00', location: 'Illawarra', characteristics: ['Alterations', 'Plus Size Fitting', 'Custom Fitting'], description: "Several pieces I love no longer fit since gaining weight after my second child. Need help figuring out what can be altered and what needs replacing." },
      { firstName: 'Tracey', lastName: 'Johnson', phoneNumber: '0421100014', email: 'tracey@demo.com', scheduledDate: '2026-06-03', scheduledTime: '13:00', location: 'Newcastle Hunter', characteristics: ['Interview Prep', 'Business Casual'], description: "First job interview in my 40s. Stay-at-home mum for 15 years re-entering the workforce as a teaching aide. I genuinely don't know what to wear.", dressSize: '14', shoeSize: '8' },
      { firstName: 'Amara', lastName: 'Okonkwo', phoneNumber: '0421100015', email: null, scheduledDate: '2026-06-04', scheduledTime: '14:30', location: 'Melbourne', characteristics: ['Confidence Coaching', 'Business Casual', 'Formal Wear'], description: "Recently promoted to my first management role. My wardrobe is still very casual and I need guidance building a professional capsule wardrobe on a budget." },
    ];
    for (const b of bookings) db.createBooking(b);
    console.log(`Seeded ${bookings.length} demo bookings`);
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

app.get('/api/locations', (req, res) => {
  res.json(db.LOCATIONS);
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

app.post('/api/bookings', (req, res) => {
  const { firstName, lastName, phoneNumber, email, scheduledDate, scheduledTime,
          characteristics, description, dressSize, shoeSize, topSize, bottomSize, source, location } = req.body || {};

  const errors = {};
  if (!firstName?.trim()) errors.firstName = 'First name is required';
  if (!lastName?.trim()) errors.lastName = 'Last name is required';
  if (!phoneNumber?.trim()) errors.phoneNumber = 'Phone number is required';
  else if (!PHONE_RE.test(phoneNumber.trim())) errors.phoneNumber = 'Invalid phone number';
  if (!scheduledDate) errors.scheduledDate = 'Appointment date is required';
  if (!scheduledTime) errors.scheduledTime = 'Appointment time is required';
  if (!characteristics || !Array.isArray(characteristics) || characteristics.length === 0)
    errors.characteristics = 'Please select at least one characteristic';
  if (!location) errors.location = 'Please select a location';
  if (source && !VALID_SOURCES.includes(source)) errors.source = 'Invalid source';

  if (Object.keys(errors).length > 0) return res.status(400).json({ error: 'Validation failed', fields: errors });

  const booking = db.createBooking({ firstName, lastName, phoneNumber, email, scheduledDate,
    scheduledTime, characteristics, description, dressSize, shoeSize, topSize, bottomSize, source, location });
  res.status(201).json({ ...booking, notes: [] });
});

app.get('/api/bookings', requireAuth, (req, res) => {
  const { status, search, location, page = '0', size = '50', sortDir = 'asc' } = req.query;
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  res.json(db.getBookings({ status: status || null, search: search || null, location: location || null,
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
  // Exclude staff who already DENIED an assignment for this booking
  const previousAssignments = db.getAssignmentsForBooking(req.params.id);
  const deniedIds = new Set(previousAssignments.filter(a => a.status === 'DENIED').map(a => a.staffId));
  const eligibleStaff = allStaff.filter(s => !deniedIds.has(s.id));
  const ranked = await rankCandidates(booking, eligibleStaff);
  res.json(ranked);
});

// ─── Auto-Assign ──────────────────────────────────────────────────────────────

app.post('/api/bookings/:id/auto-assign', requireAuth, async (req, res) => {
  const booking = db.getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const allStaff = db.getAllStaff();
  const previousAssignments = db.getAssignmentsForBooking(req.params.id);
  const deniedIds = new Set(previousAssignments.filter(a => a.status === 'DENIED').map(a => a.staffId));
  const eligibleStaff = allStaff.filter(s => !deniedIds.has(s.id));
  const ranked = await rankCandidates(booking, eligibleStaff);

  if (ranked.length === 0) return res.status(422).json({ error: 'No eligible candidates found' });

  const top = ranked[0];
  const assignment = db.createAssignment(req.params.id, top.staffId, previousAssignments.length + 1);
  db.setBookingAssignedStaff(req.params.id, top.staffId);

  const staff = db.getStaffById(top.staffId);
  const acceptLink = `${FRONTEND_URL}/assignment/${assignment.token}`;

  console.log(`\n🤖 AUTO-ASSIGN to ${staff.name} (${staff.email})`);
  console.log(`   Booking: ${booking.firstName} ${booking.lastName} on ${booking.scheduledDate}`);
  console.log(`   Score: ${Math.round(top.finalScore * 100)}% | Accept/Deny: ${acceptLink}\n`);

  res.status(201).json({ assignment, acceptLink, candidate: top, message: `Auto-assigned to ${staff.name} (${Math.round(top.finalScore * 100)}% match)` });
});

// Bulk auto-assign all QUEUED bookings
app.post('/api/bookings/bulk-auto-assign', requireAuth, async (req, res) => {
  const queued = db.getBookings().content.filter(b => b.status === 'QUEUED');
  const results = [];
  for (const booking of queued) {
    try {
      const allStaff = db.getAllStaff();
      const previousAssignments = db.getAssignmentsForBooking(booking.id);
      const deniedIds = new Set(previousAssignments.filter(a => a.status === 'DENIED').map(a => a.staffId));
      const eligibleStaff = allStaff.filter(s => !deniedIds.has(s.id));
      const ranked = await rankCandidates(booking, eligibleStaff);
      if (ranked.length === 0) {
        results.push({ bookingId: booking.id, name: `${booking.firstName} ${booking.lastName}`, status: 'no_candidates' });
        continue;
      }
      const top = ranked[0];
      const assignment = db.createAssignment(booking.id, top.staffId, previousAssignments.length + 1);
      db.setBookingAssignedStaff(booking.id, top.staffId);
      const staff = db.getStaffById(top.staffId);
      results.push({ bookingId: booking.id, name: `${booking.firstName} ${booking.lastName}`, status: 'assigned', staffName: staff.name, score: Math.round(top.finalScore * 100), assignmentId: assignment.id });
    } catch (err) {
      results.push({ bookingId: booking.id, name: `${booking.firstName} ${booking.lastName}`, status: 'error', error: err.message });
    }
  }
  res.json({ processed: queued.length, results });
});

// Send assignment requests to all QUEUED bookings (best-first-served)
app.post('/api/bookings/send-all-assignments', requireAuth, async (req, res) => {
  const queued = db.getBookings().content.filter(b => b.status === 'QUEUED');
  // Collect all candidates across all bookings, rank globally, assign best match first
  const allCandidates = [];
  for (const booking of queued) {
    const allStaff = db.getAllStaff();
    const previousAssignments = db.getAssignmentsForBooking(booking.id);
    const deniedIds = new Set(previousAssignments.filter(a => a.status === 'DENIED').map(a => a.staffId));
    const eligibleStaff = allStaff.filter(s => !deniedIds.has(s.id));
    try {
      const ranked = await rankCandidates(booking, eligibleStaff);
      if (ranked.length > 0) {
        allCandidates.push({ booking, top: ranked[0], previousAssignmentsCount: previousAssignments.length });
      }
    } catch (e) { /* skip on error */ }
  }
  // Sort all assignments by score descending (best match first served)
  allCandidates.sort((a, b) => b.top.finalScore - a.top.finalScore);
  const assignedStaffIds = new Set();
  const results = [];
  for (const { booking, top, previousAssignmentsCount } of allCandidates) {
    if (assignedStaffIds.has(top.staffId)) {
      results.push({ bookingId: booking.id, name: `${booking.firstName} ${booking.lastName}`, status: 'staff_taken' });
      continue;
    }
    const assignment = db.createAssignment(booking.id, top.staffId, previousAssignmentsCount + 1);
    db.setBookingAssignedStaff(booking.id, top.staffId);
    assignedStaffIds.add(top.staffId);
    const staff = db.getStaffById(top.staffId);
    const acceptLink = `${FRONTEND_URL}/assignment/${assignment.token}`;
    console.log(`\n📨 SEND-ALL: ${staff.name} -> ${booking.firstName} ${booking.lastName} | ${acceptLink}`);
    results.push({ bookingId: booking.id, name: `${booking.firstName} ${booking.lastName}`, status: 'sent', staffName: staff.name, score: Math.round(top.finalScore * 100), acceptLink });
  }
  res.json({ processed: queued.length, results });
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

app.get('/api/bookings/:id/assignments', requireAuth, (req, res) => {
  const assignments = db.getAssignmentsForBooking(req.params.id);
  res.json(assignments);
});

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

