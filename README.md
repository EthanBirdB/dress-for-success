# Dress for Success — Smart Booking & Rostering System

A full-stack web app built for the **Dress for Success** charity that lets clients self-book appointments and uses a two-layer AI algorithm to automatically match and notify the best-fit staff member or volunteer.

---

## Features

### Client-facing
- **Booking form** — clients enter their name, contact details, appointment date/time, location, clothing characteristics (tags), a free-text description, and sizing information
- Submitted bookings land in a **QUEUED** state ready for staff action

### Staff portal
- **Login** with role-based access (Admin / Staff)
- **Persistent sidebar navigation** with links to Booking Queue, Dashboard, and People
- **Dashboard** — at-a-glance stat cards (total, queued, assigned, accepted, in-progress, completed) plus a searchable/filterable bookings table; click any row to open a detail drawer with status management
- **Queue board** — drag-and-drop sortable list of all bookings, filterable by status
- **Candidate cloud** — click any booking to see a floating bubble visualisation of ranked candidates; bubble size reflects match score
  - Click a bubble to view the candidate's bio, traits, availability, and AI match breakdown
  - Assign directly from the drawer; a notification link is generated
  - **Auto-assign** a single booking to the top-ranked available candidate with one click
  - **Bulk auto-assign** all QUEUED bookings at once, or use **Send All Assignments** for global best-first-served matching across the entire queue
- **People** — add, edit, or deactivate staff members and volunteers with traits, bio, location, and availability

### Assignment workflow
- Staff receive a unique link (`/assignment/:token`) — no login required
- The page shows the booking details, which of their traits match, and a match score bar
- **Accept** → booking moves to ACCEPTED
- **Decline** → system automatically finds and notifies the next best candidate

### AI matching (two-layer)
1. **Availability filter** — eliminates staff unavailable on the booking day/time
2. **Tag overlap score** — proportion of booking characteristics matched by the staff member's traits (weight: 60%)
3. **OpenAI semantic score** — GPT-4o-mini compares the booking's free-text description against the staff member's bio, returning a 0–1 similarity score (weight: 40%)
4. Falls back to tag-only scoring if the OpenAI call fails

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Material UI v5 |
| Notifications | `notistack` v3 (snackbar toasts) |
| Date/time | `@mui/x-date-pickers` v6, dayjs |
| Drag-and-drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Backend | Node.js 22, Express |
| Database | JSON file (`data/db.json`) — no install required |
| Auth | JWT (24 h), `bcryptjs`, stored in `sessionStorage` |
| AI | OpenAI `gpt-4o-mini` via `openai` npm package |

---

## Project Structure

```
dress-for-success/
├── referral-api-node/          # Express backend
│   ├── server.js               # All API routes + seed logic
│   ├── db.js                   # JSON file database abstraction
│   ├── matcher.js              # Two-layer matching algorithm
│   ├── data/db.json            # Runtime data (git-ignored)
│   └── .env                    # Secrets (git-ignored)
│
└── referral-portal/            # React frontend
    └── src/
        ├── pages/
        │   ├── ClientForm/       # Public booking form
        │   ├── Dashboard/        # Staff dashboard with stats + booking table
        │   ├── QueueBoard/       # Staff queue board + drag-and-drop
        │   ├── StaffManagement/  # Add/edit/deactivate staff (People)
        │   ├── StaffLogin/       # Login page
        │   └── AssignmentAccept/ # Public token-based accept/decline page
        ├── components/
        │   ├── CandidateCloud/   # Floating bubble match visualisation
        │   └── ProtectedRoute.jsx
        ├── context/
        │   └── AuthContext.jsx
        └── services/
            └── api.js            # All axios API calls
```

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on v22)
- An [OpenAI API key](https://platform.openai.com/api-keys) (optional — falls back to tag-only matching without it)

### 1. Backend

```powershell
cd referral-api-node
npm install
```

Create a `.env` file:

```env
PORT=8080
JWT_SECRET=change-me-in-production
OPENAI_API_KEY=sk-proj-...        # optional
FRONTEND_URL=http://localhost:5173
```

Start the server:

```powershell
node server.js
```

On first run the server seeds:
- Two login accounts: `admin / admin123` and `staff / staff123`
- Twelve demo staff members and volunteers across Illawarra, Melbourne, Newcastle Hunter, and Tasmania
- Twelve demo bookings in various statuses

### 2. Frontend

```powershell
cd referral-portal
npm install
npm run dev
```

Vite starts at **http://localhost:5173** and proxies `/api` to `localhost:8080`.

---

## API Reference

### Public endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/characteristics` | Fixed list of booking tags |
| GET | `/api/locations` | Available locations |
| POST | `/api/bookings` | Submit a client booking |
| GET | `/api/assignments/:token` | Fetch assignment details by token |
| POST | `/api/assignments/:token/respond` | Accept or decline (`{ "response": "ACCEPT"\|"DENY" }`) |

### Staff endpoints (Bearer token required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/bookings` | List all bookings |
| GET | `/api/bookings/:id` | Single booking |
| PATCH | `/api/bookings/:id/status` | Update booking status |
| GET | `/api/bookings/:id/candidates` | Run matching algorithm, return ranked list |
| POST | `/api/bookings/:id/assign` | Assign staff, generate notification token |
| POST | `/api/bookings/:id/auto-assign` | Auto-assign top-ranked candidate |
| POST | `/api/bookings/bulk-auto-assign` | Auto-assign all QUEUED bookings |
| POST | `/api/bookings/send-all-assignments` | Global best-first-served assignment across queue |
| POST/GET | `/api/bookings/:id/notes` | Add or list notes |
| GET/POST | `/api/staff` | List or create staff members |
| PUT | `/api/staff/:id` | Update a staff member |
| DELETE | `/api/staff/:id` | Deactivate (soft delete) |

---

## Default Logins

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `staff` | `staff123` | Staff |

---

## Booking Statuses

`QUEUED` → `ASSIGNED` → `ACCEPTED` → `IN_PROGRESS` → `COMPLETED`  
Any status can move to `CANCELLED`.

---

## Security Notes

- Never commit `.env` to source control — it is listed in `.gitignore`
- Rotate the OpenAI API key after any hackathon/demo at [platform.openai.com](https://platform.openai.com/api-keys)
- The JWT secret in `.env` should be a long random string in production
- Assignment token links are single-use UUIDs — responding twice returns a 409
- Staff phone/email are redacted from the public assignment response
