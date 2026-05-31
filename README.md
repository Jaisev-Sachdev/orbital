# Courseway 🎓

**AI-powered NUS academic degree planner**

NUS Orbital 2026 · Apollo · Team Courseway

---

## What is Courseway?

Courseway helps NUS students plan their academic journey more effectively. Students input their major, year of study, and completed modules to receive personalised, AI-powered module recommendations that account for prerequisite chains, workload balance, and graduation requirements.

The core philosophy behind Courseway is a **rules engine with an AI brain** — deterministic logic handles prerequisite checking and eligibility, while the AI layer provides personalised explanations, recommendations, and what-if exploration. This ensures recommendations are always grounded in real NUSMods data and never hallucinated.

---

## Motivation

NUS students — especially Year 1s — struggle to plan their module sequence across 4 years. They manually cross-check prerequisites, workload, and graduation requirements across NUSMods, faculty handbooks, and spreadsheets. There is no single tool that gives personalised, validated recommendations grounded in real data.

Courseway solves this by:
- Integrating directly with the NUSMods public API (7139 modules)
- Storing prerequisite relationships in a structured PostgreSQL database
- Layering Anthropic Claude AI on top to personalise recommendations
- Keeping the AI and rules engine separate so eligibility is never hallucinated

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

> 📌 **[PLACEHOLDER — Replace ASCII diagram with proper system architecture diagram image]**

---

## Features

### Feature 1 — AI-Powered Module Recommendation Engine

The backend fetches a student's profile and completed modules, infers relevant module prefixes, builds a filtered pool from 7139 NUSMods modules, and constructs a structured prompt for Claude. The AI returns exactly 3 recommendations with one-sentence explanations grounded in real module data.

![AI Module Suggestions](docs/screenshots/recommendations.png)

---

### Feature 2 — Goal-Aware Recommendations

During onboarding Step 3, students select focus areas (AI/ML, Systems, Exchange Semester etc.) and optionally write free-text goals. These are saved to `localStorage` on completion and passed as a `goals` field in `POST /recommendations`. The backend injects them directly into the AI prompt with an explicit instruction to weight recommendations toward those goals.

![Onboarding Step 3 — Goals](docs/screenshots/onboarding-step3.png)

---

### Feature 3 — Prerequisite Chain Checker

Students can search any module by code and see its direct prerequisites extracted from NUSMods raw text. The backend applies a regex (`/[A-Z]{2,4}\d{4}[A-Z]*/g`) to the raw NUSMods prerequisite string and returns a clean array of module codes. Students can click any prerequisite chip to chain-search further.

> 📌 **[PLACEHOLDER — Insert prerequisite checker screenshot here]**

---

### Feature 4 — NUSMods Module Search

Real-time search across all 7139 NUS modules. The backend queries PostgreSQL with a case-insensitive OR filter on both `moduleCode` and `title`, returning up to 20 results. Module data was synced from the NUSMods public API using a batch sync script.

![Onboarding Step 2 — Module Search](docs/screenshots/onboarding-step2.png)

---

### Feature 5 — Guided 3-Step Onboarding Flow

A multi-step onboarding form that collects profile data, completed modules, and goals before generating a personalised plan. Each step is validated before proceeding. Module search is debounced (300ms) to avoid excessive API calls. On completion, all data is saved to PostgreSQL via the backend API.

![Onboarding Step 1 — Profile](docs/screenshots/onboarding-step1.png)

---

### Feature 6 — User Authentication with Session Persistence

Full register/login/logout flow with JWT tokens. Passwords are hashed with bcrypt before storage. Tokens are stored in `localStorage` and attached to every request automatically via an Axios interceptor. Protected routes redirect unauthenticated users to login. Tokens expire after 7 days.

![Signup Page](docs/screenshots/signup.png)

---

## Project Structure

```
orbital/
├── backend/                    # Express REST API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts             # Register, login
│   │   │   ├── profile.ts          # Profile + completed modules
│   │   │   ├── modules.ts          # Module search + prerequisites
│   │   │   └── recommendations.ts  # AI recommendations
│   │   ├── middleware/
│   │   │   └── requireAuth.ts      # JWT verification middleware
│   │   ├── lib/
│   │   │   └── prisma.ts           # Prisma client singleton
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
        │   ├── home.tsx             # Landing page
        │   ├── onboarding.tsx       # 3-step profile setup
        │   ├── recommendations.tsx  # AI recommendations
        │   ├── prerequisites.tsx    # Prerequisite checker
        │   └── dashboard.tsx        # Dashboard (MS2)
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
  @@unique([profileId, moduleCode])   // prevents duplicate entries
}

model Module {
  moduleCode   String  @id       // e.g. "CS2040S"
  title        String
  credits      Int
  description  String?
  prerequisite String?           // raw NUSMods prerequisite text
  semesters    Int[]             // e.g. [1, 2] = offered both sems
}
```

> 📌 **[PLACEHOLDER — Insert ER diagram image here]**

> 📌 **[PLACEHOLDER — Insert Use Case diagram image here]**

---

## Design Decisions

### Why PostgreSQL over MongoDB?

Our data is inherently relational — users have profiles, profiles have completed modules, modules have prerequisites. PostgreSQL's foreign keys and joins handle these relationships cleanly and enforce data integrity at the database level. MongoDB's document model would require denormalisation and make queries like "find all modules this user is eligible for" significantly harder to maintain and reason about.

### Why JWT over session-based auth?

JWTs are stateless — the server does not need to store session data in a database or cache, which simplifies the architecture. Tokens are stored in `localStorage` on the client and attached to every outgoing request via an Axios interceptor in `app/lib/api.ts`. On 401 responses, the interceptor automatically clears the stale token and the user is redirected to login via the `ProtectedRoute` component.

### Why a rules engine + AI rather than pure AI?

LLMs can hallucinate prerequisite rules and graduation requirements. By keeping deterministic logic in the backend (prerequisite checking, module eligibility via prefix matching) and using the AI layer only for explanation and personalised ranking, we ensure recommendations are always factually grounded in real NUSMods data. The AI never decides eligibility — only why a module is worth taking.

### Why Prisma over raw SQL?

Prisma generates a fully typed client from the schema, catching type mismatches at compile time. Schema migrations are version-controlled via the `migrations/` folder — any team member runs `npx prisma migrate dev` to get identical database state. This is far safer than raw SQL strings where mistakes only surface at runtime.

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
// Applied once per route — auth logic never bleeds into business logic
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
  // req.userId guaranteed to exist here
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

---

## Design Principles

### Separation of Concerns
Each file has one clearly defined responsibility. Routes handle HTTP logic, middleware handles cross-cutting concerns, `lib/prisma.ts` owns the database connection, and `lib/api.ts` owns HTTP client configuration. No business logic leaks across boundaries.

### Fail Fast
The server validates critical environment variables at startup and throws immediately if they are missing. This prevents the server starting in a broken state.

```typescript
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}
```

### Input Normalisation Before Validation
All user input is normalised (trimmed, lowercased where appropriate) before validation and storage. This prevents edge cases like duplicate accounts with the same email in different cases, or whitespace-only passwords passing validation.

---

## Code Modularisation

The backend uses a flat, responsibility-based folder structure:

| Folder | Responsibility |
|---|---|
| `src/routes/` | One file per resource — auth, profile, modules, recommendations |
| `src/middleware/` | Cross-cutting request handling — JWT auth |
| `src/lib/` | Shared utilities — database client singleton |
| `src/scripts/` | One-off operational scripts — NUSMods sync |

Adding a new resource (e.g. `plans.ts` in MS2) requires only creating the file and one line in `index.ts` — no other files need to change.

---

## Code Comments

All non-obvious logic is documented with inline comments:

```typescript
// Extract prefixes from completed modules to infer relevant departments
// e.g. ["CS1101S", "MA1521"] → ["CS", "MA"]
// This focuses the AI context on relevant modules rather than all 7139
const completedPrefixes = [...new Set(
  completedCodes.map(code => code.match(/^[A-Z]+/)?.[0] ?? '')
  .filter(p => p.length > 0)
)];
```

```typescript
// Module codes follow: 2-4 letters + 4 digits + optional letter (e.g. CS2040S)
// new Set() removes duplicates — codes can appear multiple times in prereq text
const prereqCodes = module.prerequisite
  ? [...new Set(module.prerequisite.match(/[A-Z]{2,4}\d{4}[A-Z]*/g) ?? [])]
  : [];
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
npm run dev           # Start dev server with hot reload
npm run build         # Compile TypeScript to JavaScript
npm run sync:modules  # Fetch and store all NUSMods data
npx prisma studio     # Open visual database browser
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

### Authentication

```
POST /auth/register
Body:     { "email": "user@u.nus.edu", "password": "password123" }
Response: { "message": "User created successfully", "userId": "uuid" }

POST /auth/login
Body:     { "email": "user@u.nus.edu", "password": "password123" }
Response: { "message": "Login successful", "token": "eyJ..." }
```

### Profile

```
POST /profile  🔒
Body:     { "major": "Computer Science", "faculty": "School of Computing", "yearOfStudy": 1, "cohortYear": "AY2024/25" }

GET /profile  🔒
Response: { "profile": { ...fields, "completedMods": [...] } }

POST /profile/modules  🔒
Body:     { "moduleCodes": ["CS1101S", "MA1521"] }

GET /profile/modules  🔒
Response: { "modules": ["CS1101S", "MA1521"] }
```

### Modules

```
GET /modules?search=CS2040
Response: { "modules": [{ moduleCode, title, credits, ... }] }

GET /modules/:code
Response: { "module": { moduleCode, title, credits, prerequisite, semesters } }

GET /modules/:code/prerequisites
Response: { "moduleCode": "CS2040S", "prerequisites": ["CS1101S", ...], "prerequisiteText": "..." }
```

### Recommendations

```
POST /recommendations  🔒
Body:     { "goals": "I want to focus on AI/ML" }  // optional
Response: { "recommendations": [{ moduleCode, title, reason }] }
Note:     Returns exactly 3 recommendations. Goals are injected into AI prompt.
```

---

## Software Engineering Practices

### Git Workflow

> 📌 **[PLACEHOLDER — Insert screenshot of GitHub branches / PR list here]**

- `main` — stable, protected branch. Direct pushes blocked via branch protection rules.
- Feature branches — `feat/`, `fix/`, `docs/` prefixes
- Every change goes through a Pull Request
- GitHub Copilot code review on all PRs

### Copilot Code Review

> 📌 **[PLACEHOLDER — Insert screenshot of a Copilot PR review with comments here]**

Every PR is reviewed by GitHub Copilot. Issues triaged by severity:
- **High** — fixed before merge (JWT_SECRET startup check, input validation, error handling)
- **Medium** — tracked as GitHub Issues for MS2

### CI/CD

> 📌 **[PLACEHOLDER — Insert screenshot of GitHub Actions passing CI here]**
> 📌 **Note: Add `.github/workflows/ci.yml` to repo before MS1 submission**

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
- `.env` files gitignored — never committed
- Branch protection enabled on `main`
- Input type validation on all API endpoints

---

## Testing

### Manual Testing (MS1)

All API endpoints tested via Thunder Client during development:

| Endpoint | Cases Tested |
|---|---|
| `POST /auth/register` | Valid input, duplicate email, missing fields, whitespace-only input |
| `POST /auth/login` | Valid login, wrong password, non-existent email |
| `POST /profile` | Valid profile, missing fields, string yearOfStudy |
| `POST /profile/modules` | Valid array, empty array, duplicate modules |
| `GET /modules?search=` | Module code search, title search, no results |
| `GET /modules/:code/prerequisites` | Module with prereqs, without prereqs, invalid code |
| `POST /recommendations` | With goals, without goals, missing profile |

### Automated Testing (MS2 Plan)
- Jest — unit tests for validation logic and utility functions
- Supertest — integration tests for API endpoints against test database
- React Testing Library — component and user flow tests

---

## User Testing Plan

> 📌 **[PLACEHOLDER — User testing results to be added after MS2 testing]**

We will recruit 5+ NUS students (Year 1-2, School of Computing) before MS2. Test tasks:
1. Register and complete onboarding from scratch
2. Assess whether AI recommendations seem relevant
3. Use prerequisite checker to plan a module path to CS3230
4. Rate whether goals entered in Step 3 visibly affected recommendations

---

## Milestone Progress

### MS1 — Technical Proof of Concept ✅ (1 June 2026)
- [x] User authentication — register, login, JWT session persistence
- [x] Profile setup — major, faculty, year, cohort, completed modules
- [x] NUSMods API integrated — 7139 modules synced to PostgreSQL
- [x] AI recommendation endpoint — personalised using Anthropic Claude
- [x] Goal-aware recommendations — focus areas injected into AI prompt
- [x] Prerequisite display — module codes extracted from NUSMods raw text
- [x] Frontend onboarding — 3-step flow connected to backend
- [x] Frontend recommendations page — displays AI results with reasons
- [x] Frontend prerequisite checker — interactive chain exploration
- [x] Auth flow — login, signup, logout, protected routes
- [x] README with setup guide, API docs, and SE practices

### MS2 — Prototype (29 June 2026)
- [ ] 4-year plan builder with drag and drop semester slots
- [ ] Interactive prerequisite chain graph visualisation
- [ ] Workload estimator per semester
- [ ] Graduation requirements tracker
- [ ] Plan saving and retrieval for returning users
- [ ] User testing with at least 5 NUS students
- [ ] Automated test suite (Jest + Supertest + React Testing Library)
- [ ] GitHub Actions CI pipeline

### MS3 — Extended System (27 July 2026)
- [ ] Plan variants — create and compare up to 3 plans side by side
- [ ] Workload clash alerts
- [ ] Shareable plan links
- [ ] AI what-if simulator
- [ ] Comprehensive test coverage
- [ ] Full user testing with structured findings
- [ ] Splashdown poster and demo video

---

## Known Issues / Technical Debt

| Issue | Priority | Planned Fix |
|---|---|---|
| Prerequisite AND/OR logic not parsed | MS2 | Build proper prerequisite tree parser |
| `@prisma/client` and `pg` in frontend `package.json` | Low | Remove — these are backend packages |
| Dashboard uses mock `data.json` | MS2 | Connect to real backend data |
| Module recommendation pool capped at 50 | MS2 | Smarter eligibility-based filtering |
| Sequential NUSMods sync (~5 mins) | MS2 | Add concurrency with worker pool |
| No automated tests | MS2 | Jest + Supertest + RTL |

---

## Team

| Name | Role |
|---|---|
| Jaisev Sachdev | Backend · API design · Database · AI integration |
| Qi Zao (Brian) | Frontend · UI/UX · React components · Onboarding flow |
