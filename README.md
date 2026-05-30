# Courseway 🎓

**AI-powered NUS academic degree planner**

NUS Orbital 2026 · Artemis · THE Team

---

## What is Courseway?

Courseway helps NUS students plan their academic journey more effectively. Students input their major, year of study, and completed modules to receive personalised, AI-powered module recommendations that account for prerequisite chains, workload balance, and graduation requirements.

The core philosophy behind Courseway is a **rules engine with an AI brain** — deterministic logic handles prerequisite checking and eligibility, while the AI layer provides personalised explanations, recommendations, and what-if exploration.

---

## Motivation

NUS students — especially Year 1s — struggle to plan their module sequence across 4 years. They manually cross-check prerequisites, workload, and graduation requirements across NUSMods, faculty handbooks, and spreadsheets. There is no single tool that gives personalised, validated recommendations grounded in real data.

Courseway solves this by integrating directly with the NUSMods public API, building a structured prerequisite graph, and layering AI on top to explain and personalise — without letting the AI hallucinate eligibility rules.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + React Router v7 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| ORM Version | Prisma 6 (not v7 — v7 config syntax is incompatible) |
| AI | Anthropic Claude API (claude-sonnet-4) |
| Module Data | NUSMods Public API (2025-2026) |

---

## Project Structure

```
orbital/
├── backend/                    # Express REST API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts         # Register, login
│   │   │   ├── profile.ts      # Profile + completed modules
│   │   │   ├── modules.ts      # Module search + prerequisites
│   │   │   └── recommendations.ts  # AI recommendations
│   │   ├── middleware/
│   │   │   └── requireAuth.ts  # JWT verification middleware
│   │   ├── lib/
│   │   │   └── prisma.ts       # Prisma client singleton
│   │   ├── scripts/
│   │   │   └── syncModules.ts  # NUSMods data sync script
│   │   └── index.ts            # Server entry point
│   └── prisma/
│       ├── schema.prisma       # Database schema
│       └── migrations/         # Migration history
│
└── courseway-frontend/         # React Router v7 application
    └── app/
        ├── routes/
        │   ├── home.tsx         # Landing page
        │   ├── onboarding.tsx   # 3-step profile setup
        │   ├── recommendations.tsx  # AI recommendations
        │   ├── prerequisites.tsx    # Prerequisite checker
        │   └── dashboard.tsx    # Dashboard (MS2)
        ├── components/
        │   ├── login-form.tsx
        │   ├── signup-form.tsx
        │   └── logout-button.tsx
        ├── context/
        │   └── AuthContext.tsx  # Global auth state
        └── lib/
            └── api.ts           # Axios client with interceptors
```

---

## Database Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String                        // bcrypt hashed
  createdAt DateTime @default(now())
  profile   Profile?
}

model Profile {
  id            String            @id @default(uuid())
  userId        String            @unique
  major         String
  faculty       String
  yearOfStudy   Int
  cohortYear    String
  user          User              @relation(fields: [userId], references: [id])
  completedMods CompletedModule[]
}

model CompletedModule {
  id         String  @id @default(uuid())
  profileId  String
  moduleCode String
  profile    Profile @relation(fields: [profileId], references: [id])
  @@unique([profileId, moduleCode])
}

model Module {
  moduleCode   String  @id   // e.g. "CS2040S"
  title        String
  credits      Int
  description  String?
  prerequisite String?       // raw NUSMods prerequisite text
  semesters    Int[]         // e.g. [1, 2]
}
```

---

## Backend Setup

### Prerequisites
- Node.js v20+
- PostgreSQL v18+

### Installation

```bash
git clone https://github.com/Jaisev-Sachdev/orbital.git
cd orbital/backend
npm install
```

### Environment Variables

Create a `.env` file inside `backend/`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/courseway"
JWT_SECRET="your-secret-key-min-32-chars"
ANTHROPIC_API_KEY="sk-ant-..."
NUSMODS_ACADEMIC_YEAR="2025-2026"
PORT=3001
```

### Database Setup

```bash
# Create the database (run once)
psql -U postgres -c "CREATE DATABASE courseway;"

# Run migrations to create all tables
npx prisma migrate dev

# Sync all NUSMods module data (~7139 modules, takes ~5 mins)
npm run sync:modules
```

### Running the Server

```bash
npm run dev
```

Server runs at `http://localhost:3001`

### Available Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm run sync:modules # Fetch and store all NUSMods data
npx prisma studio    # Open visual database browser
npx prisma migrate dev --name <name>  # Create a new migration
```

---

## Frontend Setup

### Prerequisites
- Node.js v20+
- Backend server running at `http://localhost:3001`

### Installation

```bash
cd orbital/courseway-frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### Environment

The API base URL is hardcoded to `http://localhost:3001` in `app/lib/api.ts`. Change this if your backend runs on a different port.

### Frontend Stack

| Tool | Purpose |
|---|---|
| React Router v7 | File-based routing and SSR |
| shadcn/ui | Component library |
| Tailwind CSS | Utility-first styling |
| Axios | HTTP client with JWT interceptor |
| Lucide React | Icons |
| Recharts | Charts (dashboard) |
| dnd-kit | Drag and drop (MS2) |
| Zod | Form validation |

### Pages

| Route | Auth Required | Description |
|---|---|---|
| `/` | No | Home — welcome page with auth state |
| `/login` | No | Login form |
| `/signup` | No | Registration form |
| `/onboarding` | Yes | 3-step profile setup (major, modules, goals) |
| `/recommendations` | Yes | AI module recommendations |
| `/prerequisites` | No | Prerequisite checker by module code |
| `/dashboard` | Yes | Dashboard — placeholder for MS2 |

---

## API Documentation

Base URL: `http://localhost:3001`

> 🔒 Protected routes require the header: `Authorization: Bearer <token>`
> Get your token from `POST /auth/login`

---

### Authentication

#### Register
```
POST /auth/register
Body:     { "email": "user@u.nus.edu", "password": "password123" }
Response: { "message": "User created successfully", "userId": "uuid" }
Errors:   400 if email already in use | 400 if invalid input
```

#### Login
```
POST /auth/login
Body:     { "email": "user@u.nus.edu", "password": "password123" }
Response: { "message": "Login successful", "token": "eyJ..." }
Errors:   401 if invalid credentials
```

---

### Profile

#### Create / Update Profile
```
POST /profile  🔒
Body:     { "major": "Computer Science", "faculty": "School of Computing", "yearOfStudy": 1, "cohortYear": "AY2024/25" }
Response: { "message": "Profile saved", "profile": { id, userId, major, faculty, yearOfStudy, cohortYear } }
Note:     Uses upsert — safe to call multiple times to update
```

#### Get Profile
```
GET /profile  🔒
Response: { "profile": { ...fields, "completedMods": [{ id, moduleCode }] } }
Errors:   404 if profile not yet created
```

#### Add Completed Modules
```
POST /profile/modules  🔒
Body:     { "moduleCodes": ["CS1101S", "MA1521", "CS1231S"] }
Response: { "message": "3 module(s) added", "count": 3 }
Note:     Duplicates silently skipped. Module codes normalised to uppercase.
```

#### Get Completed Modules
```
GET /profile/modules  🔒
Response: { "modules": ["CS1101S", "MA1521", "CS1231S"] }
```

---

### Modules

#### Search Modules
```
GET /modules?search=QUERY
Response: { "modules": [{ moduleCode, title, credits, description, prerequisite, semesters }] }
Note:     Returns max 20 results. Searches both module code and title.
          No search param returns first 20 modules alphabetically.
```

#### Get Module by Code
```
GET /modules/:code
Response: { "module": { moduleCode, title, credits, description, prerequisite, semesters } }
Errors:   404 if module not found
Example:  GET /modules/CS2040S
```

#### Get Prerequisites
```
GET /modules/:code/prerequisites
Response: {
  "moduleCode": "CS2040S",
  "prerequisites": ["CS1101S", "CS1231S", "MA1100"],  // parsed array
  "prerequisiteText": "raw NUSMods text..."            // original string
}
Note:     prerequisites array extracted via regex from NUSMods raw text.
          Full AND/OR logic parsing planned for MS2.
```

---

### Recommendations

#### Get AI Module Recommendations
```
POST /recommendations  🔒
Response: {
  "recommendations": [
    {
      "moduleCode": "CS2030S",
      "title": "Programming Methodology II",
      "reason": "Prerequisite satisfied. Core requirement for CS major."
    }
  ]
}
Note:     Returns exactly 3 recommendations.
          AI filters modules matching the student's completed module prefixes.
          Requires a completed profile with at least some modules added.
Errors:   404 if no profile found | 502 if AI response malformed
```

---

## Software Engineering Practices

### Branching Strategy
- `main` — stable, protected branch. Only merged via PRs.
- Feature branches — `feat/`, `fix/`, `docs/` prefixes
- PRs reviewed via GitHub Copilot code review

### Commit Convention
Follows [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `chore:` — setup, config

### Code Quality
- TypeScript strict mode on both frontend and backend
- ESLint enforced
- Copilot PR reviews on every merge — high priority issues addressed before merging
- Input validation on all API endpoints
- JWT startup check — server fails fast if `JWT_SECRET` or `ANTHROPIC_API_KEY` missing

### Security
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 7 days
- Emails normalised (lowercase + trimmed) before storage
- `.env` files gitignored — never committed
- Branch protection enabled on `main`

---

## Milestone Progress

### MS1 — Technical Proof of Concept ✅ (1 June 2026)
- [x] User authentication — register, login, JWT session persistence
- [x] Profile setup — major, faculty, year, cohort, completed modules
- [x] NUSMods API integrated — 7139 modules synced to PostgreSQL
- [x] AI recommendation endpoint — personalised using Anthropic Claude
- [x] Prerequisite display — module codes extracted from NUSMods raw text
- [x] Frontend onboarding — 3-step flow connected to backend
- [x] Frontend recommendations page — displays AI results
- [x] Frontend prerequisite checker — interactive chain exploration
- [x] Auth flow — login, signup, logout, protected routes
- [x] README with setup guide and API documentation

### MS2 — Prototype (29 June 2026)
- [ ] 4-year plan builder with drag and drop semester slots
- [ ] Interactive prerequisite chain graph visualisation
- [ ] Workload estimator per semester
- [ ] AI recommendations with richer explanations
- [ ] Graduation requirements tracker
- [ ] Plan saving and retrieval for returning users
- [ ] User testing with at least 5 NUS students
- [ ] Automated test suite (Jest + Supertest + React Testing Library)

### MS3 — Extended System (27 July 2026)
- [ ] Plan variants — create and compare up to 3 plans side by side
- [ ] Workload clash alerts
- [ ] Shareable plan links
- [ ] AI what-if simulator
- [ ] Comprehensive test coverage
- [ ] Full user testing with structured findings
- [ ] GitHub Actions CI pipeline
- [ ] Splashdown poster and demo

---

## Known Issues / Technical Debt

| Issue | Priority | Planned Fix |
|---|---|---|
| Prerequisite AND/OR logic not parsed | MS2 | Build proper prerequisite tree parser |
| `@prisma/client` and `pg` in frontend `package.json` | Low | Remove — these are backend packages |
| Dashboard uses mock `data.json` | MS2 | Connect to real backend data |
| Module recommendation pool limited to 50 modules | MS2 | Smarter eligibility-based filtering |
| Sequential NUSMods sync (slow) | MS2 | Add concurrency with worker pool |

---

## Team

| Name | Role |
|---|---|
| Jaisev Sachdev | Backend · API design · Database · AI integration |
| Qi Zao (Brian) | Frontend · UI/UX · React components · Onboarding flow |
