# Courseway 🎓

**AI-powered NUS academic degree planner**

NUS Orbital 2026 · Apollo 11 · THE Team · Courseway

> **Live:** Frontend at [courseway-frontend.vercel.app](https://courseway-frontend.vercel.app) · Backend at [courseway-backend-w5ua.onrender.com](https://courseway-backend-w5ua.onrender.com)

---

## What is Courseway?

Courseway helps NUS students plan their academic journey more effectively. Students input their major, year of study, and completed modules to receive personalised, AI-powered module recommendations and build a 4-year academic plan.

The core philosophy is a **rules engine with an AI brain**: deterministic logic handles prerequisite checking and workload calculation, while the AI layer provides personalised recommendations and explanations. Recommendations are always grounded in real NUSMods data and never hallucinated.

---

## Motivation

NUS students struggle to plan their module sequence across 4 years. They manually cross-check prerequisites, workload, and graduation requirements across NUSMods, faculty handbooks, and spreadsheets. There is no single tool that gives personalised, validated recommendations grounded in real data.

Courseway solves this by:
- Integrating directly with the NUSMods public API (7139 modules)
- Storing prerequisite relationships in a structured PostgreSQL database
- Building a recursive prerequisite parser that resolves full prerequisite trees
- Layering Anthropic Claude AI on top to personalise recommendations
- Keeping the AI and rules engine separate so eligibility is never hallucinated

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + React Router v7 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM (v6) |
| AI | Anthropic Claude API (claude-sonnet-4) |
| Module Data | NUSMods Public API (2025-2026) |
| Hosting | Vercel (frontend) + Render (backend + PostgreSQL) |

---

## System Architecture

```
┌─────────────────┐     HTTP/REST      ┌──────────────────────┐
│  React Frontend  │ ◄────────────────► │   Express Backend     │
│  (port 5173)     │                    │   (port 3001)         │
└─────────────────┘                    └──────────┬───────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                    ┌─────────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
                    │   PostgreSQL DB   │  │  NUSMods API   │  │ Anthropic API  │
                    │  (Prisma ORM)     │  │  (public)      │  │ (Claude AI)    │
                    └──────────────────┘  └────────────────┘  └────────────────┘
```

---

## Features

### Feature 1 — AI-Powered Module Recommendation Engine

The backend fetches a student's profile and completed modules, infers relevant module prefixes, builds a filtered pool from 7139 NUSMods modules, and constructs a structured prompt for Claude. The AI returns exactly 3 recommendations with one-sentence explanations grounded in real module data.

![AI Module Suggestions](docs/screenshots/recommendations.png)

---

### Feature 2 — Goal-Aware Recommendations

During onboarding Step 3, students select focus areas (AI/ML, Systems, Exchange Semester etc.) and optionally write free-text goals. These are passed as a `goals` field in `POST /recommendations`. The backend injects them directly into the AI prompt with an explicit instruction to weight recommendations toward those goals.

![Onboarding Step 3 — Goals](docs/screenshots/onboarding-step3.png)

---

### Feature 3 — NUSMods Module Search

Real-time search across all 7139 NUS modules. The backend queries PostgreSQL with a case-insensitive OR filter on both `moduleCode` and `title`, returning up to 20 results. Module data was synced from the NUSMods public API using a batch sync script.

![Onboarding Step 2 — Module Search](docs/screenshots/onboarding-step2.png)

---

### Feature 4 — Guided 3-Step Onboarding Flow

A multi-step onboarding form that collects profile data, completed modules, and goals before generating a personalised plan. Each step is validated before proceeding. Module search is debounced (300ms) to avoid excessive API calls.

![Onboarding Step 1 — Profile](docs/screenshots/onboarding-step1.png)

---

### Feature 5 — User Authentication with Session Persistence

Full register/login/logout flow with JWT tokens. Passwords are hashed with bcrypt before storage. Tokens are stored in `localStorage` and attached to every request via an Axios interceptor. Protected routes redirect unauthenticated users to login. Tokens expire after 7 days.

![Signup Page](docs/screenshots/signup.png)

---

### Feature 6 — 4-Year Academic Plan Builder

Students create a named plan and assign modules to specific year/semester slots. Slots are enriched with title and credits from the module table. The plan can be renamed or deleted. Multiple plans are supported for comparing different degree paths.

![Plan Builder](docs/screenshots/plan-builder.png)

---

### Feature 7 — Semester Workload Estimator

For each semester in a plan, the backend computes total MCs, total weekly hours broken down by category (lecture, tutorial, lab, project, prep), and flags semesters that are overloaded (more than 23 MCs or 50 hours/week) or project-heavy (2 or more modules with 6 or more combined lab and project hours).

![Workload](docs/screenshots/workload.png)

---

### Feature 8 — Recursive Prerequisite Tree

A hand-written recursive descent parser converts raw NUSMods prerequisite strings into an AST with node types `MODULE`, `AND`, `OR`, `N_OF`, `PROGRAMME`, and `OTHER`. The tree endpoint recursively resolves each MODULE node up to a configurable depth (default 3, max 5), enriching each node with its title and its own prerequisite subtree. A per-request module cache avoids redundant DB queries and a visited set guards against circular prerequisites.

![Prerequisite Tree](docs/screenshots/prereq-tree.png)

---

### Feature 9 — User Profile with Display Name

Users can set and update a display name via `PUT /auth/me`. `GET /auth/me` returns the user's id, email, name, and account creation date.

---

## Project Structure

```
orbital/
├── backend/                    # Express REST API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts             # Register, login, GET/PUT /auth/me
│   │   │   ├── profile.ts          # Profile + completed modules (CRUD)
│   │   │   ├── modules.ts          # Module search, prerequisites, tree
│   │   │   ├── plans.ts            # Plans, slots, workload
│   │   │   └── recommendations.ts  # AI recommendations
│   │   ├── middleware/
│   │   │   └── requireAuth.ts      # JWT verification middleware
│   │   ├── lib/
│   │   │   ├── prisma.ts           # Prisma client singleton
│   │   │   └── prereqParser.ts     # Prerequisite tokenizer + AST parser + evaluator
│   │   ├── scripts/
│   │   │   └── syncModules.ts      # NUSMods data sync script
│   │   └── index.ts                # Server entry point
│   └── prisma/
│       ├── schema.prisma           # Database schema
│       └── migrations/             # Migration history
│
└── courseway-frontend/         # React Router v7 application
    └── app/
        ├── routes/
        │   ├── home.tsx                # Landing page
        │   ├── onboarding.tsx          # 3-step profile setup
        │   ├── recommendations.tsx     # AI recommendations
        │   ├── prerequisites.tsx       # Prerequisite checker
        │   ├── dashboard.tsx           # Authenticated home with sidebar layout
        │   └── module-planning.tsx     # Plan builder + workload
        ├── components/
        │   ├── login-form.tsx
        │   ├── signup-form.tsx
        │   └── logout-button.tsx
        ├── context/
        │   └── AuthContext.tsx      # Global auth state
        └── lib/
            └── api.ts               # Axios client with interceptors
```

---

## Database Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String                        // bcrypt hashed, never stored plain
  name      String?                       // optional display name
  createdAt DateTime @default(now())
  profile   Profile?
  plans     Plan[]
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
  moduleCode   String  @id
  title        String
  credits      Int
  description  String?
  prerequisite String?           // raw NUSMods prerequisite text
  workload     Int[]   @default([])  // [lecture, tutorial, lab, project, prep] hrs/week (integer tenths)
  semesters    Int[]             // e.g. [1, 2] = offered both sems
}

model Plan {
  id        String         @id @default(uuid())
  userId    String
  name      String         @default("My Plan")
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  user      User           @relation(fields: [userId], references: [id])
  semesters SemesterSlot[]
}

model SemesterSlot {
  id         String @id @default(uuid())
  planId     String
  year       Int
  semester   Int
  moduleCode String
  plan       Plan   @relation(fields: [planId], references: [id], onDelete: Cascade)
  @@unique([planId, year, semester, moduleCode])
}
```

---

## Design Decisions

### Why PostgreSQL over MongoDB?

Our data is inherently relational: users have profiles, profiles have completed modules, plans have semester slots. PostgreSQL's foreign keys and joins handle these relationships cleanly and enforce data integrity at the database level.

### Why JWT over session-based auth?

JWTs are stateless, so the server does not need to store session data. Tokens are stored in `localStorage` and attached to every outgoing request via an Axios interceptor. On 401 responses, the interceptor clears the stale token and the `ProtectedRoute` component redirects to login.

### Why a rules engine + AI rather than pure AI?

LLMs can hallucinate prerequisite rules. Deterministic logic in the backend handles prerequisite checking and workload calculation. The AI layer is used only for explanation and personalised ranking, so recommendations are always factually grounded.

### Why Prisma over raw SQL?

Prisma generates a fully typed client from the schema, catching type mismatches at compile time. Schema migrations are version-controlled in `migrations/`, so any team member runs `npx prisma migrate dev` to reach identical database state.

### Why a hand-written parser over regex for prerequisites?

NUSMods prerequisite strings contain nested AND/OR logic, N-of-K clauses, programme conditions, and grade requirements. Regex can extract flat module code lists but cannot represent the logical structure needed for eligibility checking and tree visualisation. A recursive descent parser produces a proper AST that the frontend can render as a tree and the evaluator can traverse to determine eligibility.

---

## Design Patterns

### Singleton — Prisma Client

The Prisma client is instantiated once in `src/lib/prisma.ts` and exported as a shared module. Instantiating `new PrismaClient()` in every route file would exhaust PostgreSQL's connection pool under concurrent load.

```typescript
// src/lib/prisma.ts — one instance, shared everywhere
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export default prisma;
```

### Middleware Pattern

JWT verification is extracted into a standalone middleware function rather than duplicated in every protected route. The middleware attaches `userId` to the request object and calls `next()` on success, returning 401 immediately on failure.

```typescript
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
  // req.userId is guaranteed to exist here
});
```

### Interceptor Pattern

The Axios client uses request and response interceptors to handle token attachment and 401 responses centrally. Without interceptors, every component would need to manually read `localStorage` and handle expired tokens.

```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Memoisation — Module Cache in Prerequisite Tree

The prerequisite tree endpoint builds a per-request `Map<string, Module>` so each module is fetched from PostgreSQL at most once, regardless of how many times it appears across the tree. This avoids N+1 query problems for wide or deep trees.

```typescript
const moduleCache = new Map<string, Module | null>();

async function getCachedModule(moduleCode: string) {
  if (moduleCache.has(moduleCode)) return moduleCache.get(moduleCode)!;
  const mod = await prisma.module.findUnique({ where: { moduleCode } });
  moduleCache.set(moduleCode, mod);
  return mod;
}
```

---

## Design Principles

### Separation of Concerns

Each file has one clearly defined responsibility. Routes handle HTTP logic, middleware handles cross-cutting concerns, `lib/prisma.ts` owns the database connection, `lib/prereqParser.ts` owns prerequisite parsing, and `lib/api.ts` owns HTTP client configuration.

### Fail Fast

The server validates critical environment variables at startup and throws immediately if they are missing.

```typescript
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}
```

### Input Normalisation Before Validation

All user input is normalised (trimmed, uppercased for module codes, lowercased for emails) before validation and storage. This prevents edge cases like duplicate accounts with the same email in different cases.

---

## Code Modularisation

| Folder | Responsibility |
|---|---|
| `src/routes/` | One file per resource: auth, profile, modules, plans, recommendations |
| `src/middleware/` | Cross-cutting request handling: JWT auth |
| `src/lib/` | Shared utilities: database client, prerequisite parser |
| `src/scripts/` | One-off operational scripts: NUSMods sync |

---

## Code Comments

All non-obvious logic is documented with inline comments:

```typescript
// GET /modules/:code/prerequisites/tree?depth=3
// Registered after /:code/prerequisites — Express matches on the full path,
// so /tree is never captured by the shorter route regardless of order.
router.get('/:code/prerequisites/tree', async (req, res) => { ... });
```

```typescript
// Extract prefixes from completed modules to infer relevant departments
// e.g. ["CS1101S", "MA1521"] -> ["CS", "MA"]
// This focuses the AI context on relevant modules rather than all 7139
const completedPrefixes = [...new Set(
  completedCodes.map(code => code.match(/^[A-Z]+/)?.[0] ?? '')
  .filter(p => p.length > 0)
)];
```

---

## Backend Setup

### Prerequisites
- Node.js v20+
- PostgreSQL v16+

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

# Run all migrations
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
npm run dev           # Start dev server with hot reload
npm run build         # Compile TypeScript to JavaScript
npm run sync:modules  # Fetch and store all NUSMods data
npx prisma studio     # Open visual database browser
npx prisma migrate dev --name <name>  # Create a new migration
```

### Deployment

The backend is deployed on **Render** (Singapore region) and the frontend on **Vercel**.

| Service | URL |
|---|---|
| Frontend | https://courseway-frontend.vercel.app |
| Backend | https://courseway-backend-w5ua.onrender.com |

Production migrations are run by pointing the local Prisma CLI at the Render External Database URL:

```powershell
$env:DATABASE_URL = "<render-external-db-url>"
npx prisma migrate deploy
```

Note: Render's free tier spins down after 15 minutes of inactivity. The first request after a cold start may take 30-60 seconds. Subsequent requests are fast.

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

### Environment Variables

Create a `.env` file inside `courseway-frontend/`:

```env
VITE_API_URL=http://localhost:3001
```

In production, set `VITE_API_URL` to the deployed backend URL (e.g. `https://courseway-backend-w5ua.onrender.com`). The Axios client in `app/lib/api.ts` reads this at build time and falls back to `http://localhost:3001` if unset.

### Pages

| Route | Auth Required | Description |
|---|---|---|
| `/` | No | Home page with auth state |
| `/login` | No | Login form |
| `/signup` | No | Registration form |
| `/onboarding` | Yes | 3-step profile setup (major, modules, goals) |
| `/recommendations` | Yes | AI module recommendations |
| `/prerequisites` | No | Prerequisite checker and tree visualiser |
| `/dashboard` | Yes | Authenticated home with sidebar layout and plan builder |

---

## API Documentation

Base URL (local): `http://localhost:3001`
Base URL (production): `https://courseway-backend-w5ua.onrender.com`

> Protected routes require the header: `Authorization: Bearer <token>`

### Authentication

```
POST /auth/register
Body:     { "email": "user@u.nus.edu", "password": "password123", "name": "Jaisev" }
Response: { "message": "User created successfully", "userId": "uuid" }

POST /auth/login
Body:     { "email": "user@u.nus.edu", "password": "password123" }
Response: { "message": "Login successful", "token": "eyJ..." }

GET /auth/me  (protected)
Response: { "user": { "id", "email", "name", "createdAt" } }

PUT /auth/me  (protected)
Body:     { "name": "Jaisev Sachdev" }
Response: { "message": "Name updated", "user": { "id", "email", "name" } }
```

### Profile

```
POST /profile  (protected)
Body:     { "major": "Computer Science", "faculty": "SoC", "yearOfStudy": 1, "cohortYear": "AY2024/25" }
Response: { "message": "Profile saved", "profile": { ... } }

GET /profile  (protected)
Response: { "hasProfile": true, "profile": { ...fields, "completedMods": [...] } }
          { "hasProfile": false, "profile": null }  // new users — 200, not 404

POST /profile/modules  (protected)
Body:     { "moduleCodes": ["CS1101S", "MA1521"] }
Response: { "message": "2 module(s) added", "count": 2 }

GET /profile/modules  (protected)
Response: { "modules": [{ "moduleCode", "title", "credits" }] }

DELETE /profile/modules  (protected)
Body:     { "moduleCodes": ["CS1101S"] }
Response: { "message": "1 module(s) removed", "count": 1 }
```

### Modules

```
GET /modules?search=CS2040
Response: { "modules": [{ moduleCode, title, credits, ... }] }

GET /modules/:code
Response: { "module": { moduleCode, title, credits, prerequisite, semesters } }

GET /modules/:code/prerequisites
Response: { "moduleCode", "title", "prerequisites": ["CS1101S", ...], "prerequisiteTree": <AST>, "prerequisiteText" }

GET /modules/:code/prerequisites/tree?depth=3
Response: { "moduleCode", "title", "depth", "prerequisiteTree": <resolved tree> }
  depth: default 3, max 5
  Each MODULE node has: { type, code, title, prerequisiteTree }
  Other node types: AND/OR { children[] }, N_OF { n, children[] }, PROGRAMME { programmes[] }, OTHER { text }
```

### Plans

```
POST /plans  (protected)
Body:     { "name": "Main Plan" }
Response: { "message": "Plan created", "plan": { id, name, userId, createdAt } }

GET /plans  (protected)
Response: { "plans": [...] }

GET /plans/:id  (protected)
Response: { "plan": { id, name, semesters: [...] } }

PUT /plans/:id  (protected)
Body:     { "name": "Exchange Plan" }
Response: { "message": "Plan updated", "plan": { ... } }

DELETE /plans/:id  (protected)
Response: { "message": "Plan deleted" }
```

### Plan Slots

```
POST /plans/:id/slots  (protected)
Body:     { "year": 1, "semester": 1, "moduleCode": "CS2040S" }
Response: { "message": "Module added to plan", "slot": { ... } }

POST /plans/:id/slots/bulk  (protected)
Body:     { "year": 1, "semester": 1, "moduleCodes": ["CS2040S", "CS2030S"] }
Response: { "message": "2 module(s) added", "count": 2 }

DELETE /plans/:id/slots/:slotId  (protected)
Response: { "message": "Module removed from plan" }

GET /plans/:id/slots  (protected)
Response: {
  "slots": [{ id, moduleCode, year, semester, title, credits }],
  "grouped": { "year1_sem1": [...], "year1_sem2": [...] }
}
```

### Workload

```
GET /plans/:id/workload  (protected)
Response: {
  "workload": {
    "year1_sem1": {
      "totalMCs": 20,
      "totalHours": 42,
      "breakdown": { "lecture", "tutorial", "lab", "project", "prep" },
      "flags": []   // "overloaded" | "project-heavy" | "incomplete-data"
    }
  }
}
```

### Recommendations

```
POST /recommendations  (protected)
Body:     { "goals": "I want to focus on AI/ML" }  // optional
Response: { "recommendations": [{ moduleCode, title, reason }] }
```

---

## Software Engineering Practices

### Git Workflow

- `main` — stable, protected. Direct pushes blocked via branch protection rules.
- Feature branches use `feat/`, `fix/`, `docs/` prefixes.
- Every change goes through a pull request.
- GitHub Copilot reviews every PR automatically.


### CI/CD

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
```

### Security
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 7 days
- Emails normalised (lowercase + trimmed) before storage
- `.env` files gitignored
- Branch protection enabled on `main`
- Input type validation on all API endpoints
- Prisma P2025 errors caught and returned as 404 instead of 500

---

## Testing

### Manual Testing

All API endpoints tested via Thunder Client during development:

| Endpoint | Cases Tested |
|---|---|
| `POST /auth/register` | Valid input, duplicate email, missing fields, whitespace-only input |
| `POST /auth/login` | Valid login, wrong password, non-existent email |
| `GET /auth/me` | Valid token, missing token, user not found |
| `PUT /auth/me` | Valid name, empty name, missing token |
| `POST /profile` | Valid profile, missing fields, string yearOfStudy |
| `POST /profile/modules` | Valid array, empty array, duplicate modules |
| `DELETE /profile/modules` | Remove existing, remove non-existent, no profile |
| `GET /profile/modules` | With modules, empty profile |
| `GET /modules?search=` | Module code search, title search, no results |
| `GET /modules/:code/prerequisites` | With prereqs, without prereqs, invalid code |
| `GET /modules/:code/prerequisites/tree` | depth=1, depth=3, depth=0, invalid code, circular prereqs |
| `POST /plans` | Named plan, unnamed plan (defaults to "My Plan") |
| `POST /plans/:id/slots` | Valid slot, duplicate slot, invalid plan |
| `POST /plans/:id/slots/bulk` | Multiple modules, partial duplicates |
| `GET /plans/:id/slots` | Enriched with title and credits, grouped by semester |
| `GET /plans/:id/workload` | Overloaded semester, project-heavy flag, incomplete data |
| `POST /recommendations` | With goals, without goals, missing profile |

### Automated Testing (MS3 Plan)
- Jest: unit tests for prereqParser (tokenizer, AST, evaluator)
- Supertest: integration tests for all API endpoints against a test database
- React Testing Library: component and user flow tests

---

## User Testing

We recruited 5 NUS students (Year 1-2, School of Computing) and tested the following tasks before MS2 submission:
1. Register and complete onboarding from scratch
2. Assess whether AI recommendations seem relevant to their goals
3. Build a 2-year plan and check workload flags
4. Use the prerequisite tree to trace a module path

Results and structured findings will be documented in the MS2 project log on Skylab.

---

## Milestone Progress

### MS1 — Technical Proof of Concept (1 June 2026) ✅
- [x] User authentication: register, login, JWT session persistence
- [x] Profile setup: major, faculty, year, cohort, completed modules
- [x] NUSMods API integrated: 7139 modules synced to PostgreSQL
- [x] AI recommendation endpoint: personalised using Anthropic Claude
- [x] Goal-aware recommendations: focus areas injected into AI prompt
- [x] Prerequisite display: module codes extracted from NUSMods raw text
- [x] Frontend onboarding: 3-step flow connected to backend
- [x] Frontend recommendations page: displays AI results with reasons
- [x] Frontend prerequisite checker: interactive chain exploration
- [x] Auth flow: login, signup, logout, protected routes
- [x] README with setup guide, API docs, and SE practices

### MS2 — Prototype (29 June 2026) ✅
- [x] 4-year plan builder with semester slots (add, remove, bulk add)
- [x] Plan management: create, rename, delete, retrieve
- [x] Workload estimator per semester with overload and project-heavy flags
- [x] Recursive prerequisite tree parser (tokenizer + AST + evaluator)
- [x] Prerequisite tree endpoint with depth control, memoisation, and circular guard
- [x] User profile with optional display name (GET/PUT /auth/me)
- [x] Enriched GET /profile/modules: returns title and credits per module
- [x] DELETE /profile/modules endpoint
- [x] hasProfile flag on GET /profile: 200 instead of 404 for new users
- [x] Deployment: backend on Render, frontend on Vercel, production DB migrated and seeded
- [x] User testing with 5 NUS students
- [x] GitHub Actions CI pipeline
- [x] README updated for MS2

### MS3 — Extended System (27 July 2026)
- [ ] Graduation requirements tracker
- [ ] Interactive prerequisite chain graph visualisation
- [ ] Drag and drop semester slot reordering
- [ ] Plan variants: create and compare up to 3 plans side by side
- [ ] Workload clash alerts
- [ ] Shareable plan links
- [ ] AI what-if simulator
- [ ] Automated test suite (Jest + Supertest + React Testing Library)
- [ ] Full user testing with structured findings
- [ ] Splashdown poster and demo video

---

## Known Issues / Technical Debt

| Issue | Priority | Planned Fix |
|---|---|---|
| Module recommendation pool capped at 50 | MS3 | Eligibility-based filtering using prereq evaluator |
| No automated tests | MS3 | Jest + Supertest + RTL |
| Frontend dashboard uses some placeholder data | MS3 | Connect all panels to live backend |
| `@prisma/client` and `pg` present in frontend `package.json` | Low | Remove unused backend dependencies from frontend |

---

## Team

| Name | Role |
|---|---|
| Jaisev Sachdev | Backend, API design, database, AI integration, prerequisite parser |
| Qi Zao (Brian) | Frontend, UI/UX, React components, onboarding flow, plan builder |
