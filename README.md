# Courseway 🎓

**AI-powered NUS academic degree planner**

NUS Orbital 2026 · Apollo 11 · THE Team · Courseway

> **Deployed at** [courseway-frontend.vercel.app](https://courseway-frontend.vercel.app) (frontend) · [courseway-backend-w5ua.onrender.com](https://courseway-backend-w5ua.onrender.com) (backend)

---

## Table of Contents

- [What is Courseway?](#what-is-courseway)
- [Motivation](#motivation)
- [Use Cases](#use-cases)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Features](#features)
  - [Feature 1: Guided 3-Step Onboarding Flow](#feature-1-guided-3-step-onboarding-flow)
  - [Feature 2: NUSMods Module Search](#feature-2-nusmods-module-search)
  - [Feature 3: AI-Powered Module Recommendation Engine](#feature-3-ai-powered-module-recommendation-engine)
  - [Feature 4: Goal-Aware Recommendations](#feature-4-goal-aware-recommendations)
  - [Feature 5: User Authentication with Session Persistence](#feature-5-user-authentication-with-session-persistence)
  - [Feature 6: 4-Year Academic Plan Builder](#feature-6-4-year-academic-plan-builder)
  - [Feature 7: Semester Workload Estimator](#feature-7-semester-workload-estimator)
  - [Feature 8: Recursive Prerequisite Parser + Tree Endpoint](#feature-8-recursive-prerequisite-parser--tree-endpoint)
  - [Feature 9: User Profile with Display Name](#feature-9-user-profile-with-display-name)
  - [Feature 10: Graduation Requirements Tracker](#feature-10-graduation-requirements-tracker)
  - [Feature 11: Interactive Prerequisite Graph](#feature-11-interactive-prerequisite-graph)
  - [Feature 12: Compare Plans Side-by-Side](#feature-12-compare-plans-side-by-side)
  - [Feature 13: Shareable Plan Links](#feature-13-shareable-plan-links)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Design Decisions](#design-decisions)
- [Design Patterns](#design-patterns)
- [Design Principles](#design-principles)
- [Code Modularisation](#code-modularisation)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [API Documentation](#api-documentation)
- [Software Engineering Practices](#software-engineering-practices)
- [Testing](#testing)
- [Milestone Progress](#milestone-progress)
- [Known Issues / Technical Debt](#known-issues--technical-debt)
- [Team](#team)

---

## What is Courseway?

Courseway helps NUS students plan their academic journey more effectively. Students input their major, year of study, and completed modules to receive personalised, AI-powered module recommendations and build a 4-year academic plan.

The core philosophy is a **rules engine with an AI brain**: deterministic logic handles prerequisite checking, workload calculation, and graduation-requirement tracking, while the AI layer provides personalised recommendations and explanations. Recommendations are always grounded in real NUSMods data and never hallucinated.

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

## Use Cases

The diagram below maps the actors and the actions Courseway supports. A **Student** is the only human actor; the **NUSMods API** and **Anthropic Claude API** act as supporting external systems that some use cases depend on.

![Courseway use case diagram](docs/diagrams/use-case-diagram.png)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + React Router v7 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM (v6) |
| AI | Anthropic Claude API (claude-sonnet-4-5) |
| Module Data | NUSMods Public API (2025-2026) |
| Testing | Jest + Supertest (backend) |
| Hosting | Vercel (frontend) + Render (backend + PostgreSQL) |

---

## System Architecture

```mermaid
graph TD
    FE["React Frontend<br/>React Router v7 · port 5173<br/>Vercel"]
    BE["Express Backend<br/>Node + TypeScript · port 3001<br/>Render"]
    DB[("PostgreSQL<br/>via Prisma ORM")]
    NM["NUSMods API<br/>(public)"]
    AN["Anthropic API<br/>(Claude)"]

    FE <-->|HTTP / REST + JWT| BE
    BE -->|queries and migrations| DB
    BE -->|batch module sync| NM
    BE -->|recommendation prompts| AN
```

The frontend never talks to the database or to either external API directly: every call goes through the Express backend, which owns authentication, the rules engine, and both outbound integrations.

---

## Features

### Feature 1: Guided 3-Step Onboarding Flow

A multi-step onboarding form that collects profile data, completed modules, and goals before generating a personalised plan. Major is validated against a canonical list of 61 NUS primary majors (backend whitelist, `src/config/nusMajors.ts`) rather than accepting free text; this also gates which students see the graduation requirements tracker (Feature 10). Each step is validated before proceeding. Module search is debounced (300ms) to avoid excessive API calls.

<img width="1992" height="1372" alt="image" src="https://github.com/user-attachments/assets/1aab6d03-3d38-4e94-9326-c0ac1f79e94d" />


---

### Feature 2: NUSMods Module Search

Real-time search across all 7139 NUS modules. The backend queries PostgreSQL with a case-insensitive OR filter on both `moduleCode` and `title`, returning up to 20 results. Module data was synced from the NUSMods public API using a batch sync script.

<img width="1992" height="1372" alt="image" src="https://github.com/user-attachments/assets/6d2b6ac7-9a18-47e8-9483-723c13aa90c3" />


---

### Feature 3: AI-Powered Module Recommendation Engine

The backend fetches a student's profile and completed modules, infers relevant module prefixes, builds a filtered pool from 7139 NUSMods modules, and constructs a structured prompt for Claude. The AI returns exactly 3 recommendations with one-sentence explanations grounded in real module data.

<img width="1992" height="1372" alt="image" src="https://github.com/user-attachments/assets/9f31919c-bf79-4591-98d4-9591e24f799c" />



---

### Feature 4: Goal-Aware Recommendations

During onboarding Step 3, students select focus areas (AI/ML, Systems, Exchange Semester etc.) and optionally write free-text goals. These are passed as a `goals` field in `POST /recommendations`. The backend injects them directly into the AI prompt with an explicit instruction to weight recommendations toward those goals.

<img width="1992" height="1372" alt="image" src="https://github.com/user-attachments/assets/6a6cf929-5207-470c-966e-7499ab1226f2" />


---

### Feature 5: User Authentication with Session Persistence

Full register/login/logout flow with JWT tokens. Passwords are hashed with bcrypt before storage. Tokens are stored in `localStorage` and attached to every request via an Axios interceptor. Protected routes redirect unauthenticated users to login. Tokens expire after 7 days.

<img width="974" height="694" alt="image" src="https://github.com/user-attachments/assets/c221c78d-4d87-4466-9328-2527f8c838e1" />


---

### Feature 6: 4-Year Academic Plan Builder

Students create a named plan and assign modules to specific year/semester slots. Slots are enriched with title and credits from the module table. The plan can be renamed or deleted. Multiple plans are supported for comparing different degree paths (see Feature 12).

<img width="2193" height="1627" alt="image" src="https://github.com/user-attachments/assets/f716788e-525e-468f-9642-90486bc111fc" />


---

### Feature 7: Semester Workload Estimator

For each semester in a plan, the backend computes total MCs, total weekly hours broken down by category (lecture, tutorial, lab, project, prep), and flags semesters that are overloaded (more than 23 MCs or 50 hours/week) or project-heavy (2 or more modules with 6 or more combined lab and project hours).

<img width="2193" height="1627" alt="image" src="https://github.com/user-attachments/assets/0c787a86-0c57-4263-9648-19638ad430d8" />


---

### Feature 8: Recursive Prerequisite Parser + Tree Endpoint

A hand-written recursive descent parser converts raw NUSMods prerequisite strings into an AST with node types `MODULE`, `AND`, `OR`, `N_OF`, `PROGRAMME`, and `OTHER`. The tree endpoint recursively resolves each MODULE node up to a configurable depth (default 3, max 5), enriching each node with its title and its own prerequisite subtree. A per-request module cache avoids redundant DB queries and a visited set guards against circular prerequisites. `OTHER`-type nodes (grade/level conditions the parser can't structurally resolve) carry a short `label` capped at 48 characters for compact UI rendering, alongside the full raw `text` for a tooltip.

This is the data layer behind both the JSON-style prerequisite checker (below) and the graph visualisation (Feature 11).

<img width="2268" height="1993" alt="image" src="https://github.com/user-attachments/assets/d6bce555-46f4-4194-8848-16af7fe08380" />

---

### Feature 9: User Profile with Display Name

Users can set and update a display name via `PUT /auth/me`. `GET /auth/me` returns the user's id, email, name, and account creation date.

<img width="2268" height="1699" alt="image" src="https://github.com/user-attachments/assets/1d67f67e-1b9c-4add-8e78-077919e9633e" />


---

### Feature 10: Graduation Requirements Tracker

For Computer Science majors, the requirements engine classifies every planned module into a bucket (foundation, math & science, common curriculum, breadth & depth) using an explicit module-list match plus a moduleCode-prefix fallback, and reports progress against each category alongside a 4-year recommendation of remaining required modules. A module-equivalence map (e.g. `CS1010S` → `CS1101S`, `CS2030` → `CS2030S`) means non-S-track modules correctly satisfy the S-track requirement slot instead of showing up as a duplicate recommendation. Students in any other major see a clear "not yet supported for your major" message instead of incorrect CS-specific results.

<img width="2268" height="1699" alt="image" src="https://github.com/user-attachments/assets/53aa9a30-3410-4e90-9fb2-9e74aacb56f1" />

---

### Feature 11: Interactive Prerequisite Graph

A node-graph visualisation of a module's prerequisite chain, built with `@xyflow/react` and laid out automatically with `dagre`. Each module and logic node (AND/OR/N-of-K) renders as a graph node, making deeply nested prerequisite chains easier to read than the flat JSON tree in Feature 8.

<img width="2268" height="1993" alt="image" src="https://github.com/user-attachments/assets/95220153-1f23-4a88-9d73-ae1e1fdcc4f8" />


---

### Feature 12: Compare Plans Side-by-Side

Students can select up to 3 of their plans and compare workload breakdowns (MCs, hours, per-category breakdown) side-by-side in a single view, useful for weighing, for example, a normal-load plan against an exchange-semester plan. Reuses the existing per-semester workload endpoint (Feature 7) rather than introducing new backend logic.

<img width="2268" height="1699" alt="image" src="https://github.com/user-attachments/assets/e928845d-3d49-467e-96de-36fcb1c44189" />


---

### Feature 13: Shareable Plan Links

Plan owners can enable/disable sharing via `POST`/`DELETE /plans/:id/share`, with a separate `POST /plans/:id/share/rotate` to invalidate an existing link and issue a new one. A public, unauthenticated endpoint (`GET /plans/shared/:token`) returns a read-only enriched view (module titles/credits, grouped by semester) exposing only the owner's display name: no email, no userId, no edit access.

<img width="2268" height="1699" alt="image" src="https://github.com/user-attachments/assets/2abaee25-3dab-4b1f-93c0-70ead12e0f8a" />

<img width="2268" height="1675" alt="image" src="https://github.com/user-attachments/assets/ba882b32-a50d-4a4a-9070-73522fc7fbfd" />

---

## Project Structure

```
orbital/
├── backend/                    # Express REST API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts             # Register, login, GET/PUT /auth/me
│   │   │   ├── profile.ts          # Profile + completed modules (CRUD), major validation
│   │   │   ├── modules.ts          # Module search, prerequisites, tree
│   │   │   ├── plans.ts            # Plans, slots, workload, requirements, sharing
│   │   │   └── recommendations.ts  # AI recommendations
│   │   ├── middleware/
│   │   │   └── requireAuth.ts      # JWT verification middleware
│   │   ├── lib/
│   │   │   ├── prisma.ts           # Prisma client singleton
│   │   │   ├── prereqParser.ts     # Prerequisite tokenizer + AST parser + evaluator
│   │   │   └── gradRequirementsEngine.ts  # MC-bucket classification + 4-year recommendation
│   │   ├── config/
│   │   │   ├── gradRequirements.json      # CS+AI-focus ruleset
│   │   │   └── nusMajors.ts               # Canonical list of 61 NUS primary majors
│   │   ├── scripts/
│   │   │   └── syncModules.ts      # NUSMods data sync script
│   │   ├── app.ts                  # Express app (routes + middleware wiring)
│   │   └── index.ts                # Server entry point (imports app, calls listen)
│   ├── tests/                      # Jest + Supertest suite
│   │   ├── gradRequirementsEngine.test.ts
│   │   ├── nusMajors.test.ts
│   │   └── routes.test.ts
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
        │   ├── prerequisites.tsx       # Prerequisite checker + graph
        │   ├── graduation.tsx          # Graduation requirements tracker
        │   ├── dashboard.tsx           # Authenticated home with sidebar layout
        │   ├── module-planning.tsx     # Plan builder + workload + compare + share
        │   └── shared.tsx              # Public read-only shared-plan view
        ├── components/
        │   ├── login-form.tsx
        │   ├── signup-form.tsx
        │   ├── logout-button.tsx
        │   └── graph/                  # PrerequisiteGraph, ModuleGraphNode, LogicGraphNode
        ├── context/
        │   └── AuthContext.tsx      # Global auth state
        └── lib/
            └── api.ts               # Axios client with interceptors
```

---

## Database Schema

```mermaid
erDiagram
    USER ||--o| PROFILE : "has"
    USER ||--o{ PLAN : "owns"
    PROFILE ||--o{ COMPLETED_MODULE : "records"
    PLAN ||--o{ SEMESTER_SLOT : "contains"
    MODULE ||..o{ COMPLETED_MODULE : "referenced by moduleCode"
    MODULE ||..o{ SEMESTER_SLOT : "referenced by moduleCode"

    USER {
        uuid id PK
        string email UK
        string password "bcrypt hash"
        string name "nullable"
        datetime createdAt
    }

    PROFILE {
        uuid id PK
        uuid userId FK "unique, 1:1 with User"
        string major "validated against nusMajors.ts"
        string faculty
        int yearOfStudy
        string cohortYear
    }

    COMPLETED_MODULE {
        uuid id PK
        uuid profileId FK
        string moduleCode "unique per profile"
    }

    MODULE {
        string moduleCode PK
        string title
        int credits
        string description "nullable"
        string prerequisite "raw NUSMods text, nullable"
        int[] workload "lecture tutorial lab project prep"
        int[] semesters "e.g. 1 2"
    }

    PLAN {
        uuid id PK
        uuid userId FK
        string name "default My Plan"
        string shareToken UK "null = sharing disabled"
        datetime createdAt
        datetime updatedAt
    }

    SEMESTER_SLOT {
        uuid id PK
        uuid planId FK "cascade delete"
        int year
        int semester
        string moduleCode "unique per plan+year+sem"
    }
```

Dotted lines mark soft references: `CompletedModule.moduleCode` and `SemesterSlot.moduleCode` hold module codes as plain strings rather than declared foreign keys, so they are validated in application code (the slot endpoint checks the module exists before inserting) rather than enforced by the database.

Prerequisites are **not** modelled as a table. `Module.prerequisite` stores the raw NUSMods requirement string, which is parsed into an AST at request time by `prereqParser.ts` (Feature 8). Graduation requirements are likewise config, not data: they live in `src/config/gradRequirements.json`.

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
  major         String                        // validated against nusMajors.ts
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
  workload     Int[]   @default([])  // [lecture, tutorial, lab, project, prep] hrs/week, from NUSMods
  semesters    Int[]             // e.g. [1, 2] = offered both sems
}

model Plan {
  id         String         @id @default(uuid())
  userId     String
  name       String         @default("My Plan")
  shareToken String?        @unique          // null = sharing disabled
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
  user       User           @relation(fields: [userId], references: [id])
  semesters  SemesterSlot[]
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

LLMs can hallucinate prerequisite rules. Deterministic logic in the backend handles prerequisite checking, workload calculation, and graduation-requirement classification. The AI layer is used only for explanation and personalised ranking, so recommendations are always factually grounded.

### Why Prisma over raw SQL?

Prisma generates a fully typed client from the schema, catching type mismatches at compile time. Schema migrations are version-controlled in `migrations/`, so any team member runs `npx prisma migrate dev` to reach identical database state.

### Why a hand-written parser over regex for prerequisites?

NUSMods prerequisite strings contain nested AND/OR logic, N-of-K clauses, programme conditions, and grade requirements. Regex can extract flat module code lists but cannot represent the logical structure needed for eligibility checking and tree visualisation. A recursive descent parser produces a proper AST that the frontend can render as a tree/graph and the evaluator can traverse to determine eligibility.

---

## Design Patterns

### Singleton: Prisma Client

The Prisma client is instantiated once in `src/lib/prisma.ts` and exported as a shared module. Instantiating `new PrismaClient()` in every route file would exhaust PostgreSQL's connection pool under concurrent load.

```typescript
// src/lib/prisma.ts (one instance, shared everywhere)
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

### Memoisation: Module Cache in Prerequisite Tree

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

### Canonicalisation: Module Equivalence in the Requirements Engine

NUS offers standard-track equivalents (e.g. `CS1010S`, `CS2030`) that satisfy the same requirement slot as their S-track canonical code (`CS1101S`, `CS2030S`). A single `canonicalize()` lookup is applied consistently everywhere a module code is compared against the requirements ruleset, so a completed alternate module is never misclassified or re-recommended as a duplicate.

```typescript
const MODULE_EQUIVALENTS: Record<string, string> = {
  CS1010S: 'CS1101S', CS2030: 'CS2030S', CS2040: 'CS2040S', /* ... */
};
function canonicalize(code: string): string {
  return MODULE_EQUIVALENTS[code] ?? code;
}
```

---

## Design Principles

### Separation of Concerns

Each file has one clearly defined responsibility. Routes handle HTTP logic, middleware handles cross-cutting concerns, `lib/prisma.ts` owns the database connection, `lib/prereqParser.ts` owns prerequisite parsing, `lib/gradRequirementsEngine.ts` owns requirements classification, and `lib/api.ts` (frontend) owns HTTP client configuration.

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
| `src/lib/` | Shared utilities: database client, prerequisite parser, requirements engine |
| `src/config/` | Static config/rulesets: graduation requirements ruleset, NUS majors list |
| `src/scripts/` | One-off operational scripts: NUSMods sync |
| `tests/` | Jest + Supertest unit and integration tests |

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

### Running Tests

```bash
npm test
```

Runs the Jest + Supertest suite (`backend/tests/`); see [Testing](#testing) below.

### Available Scripts

```bash
npm run dev           # Start dev server with hot reload
npm run build         # Compile TypeScript to JavaScript
npm test              # Run Jest + Supertest suite
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

The start script runs `prisma migrate deploy` before booting the server, so pending migrations are applied automatically on every deploy (fixed after an earlier incident where a migration was committed but never applied in production, causing 500s on any `Plan` query; see Known Issues).

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
| `/prerequisites` | No | Prerequisite checker and graph visualiser |
| `/module-planning` | Yes | Plan builder, workload, compare plans, sharing |
| `/graduation` | Yes | Graduation requirements tracker (CS majors) |
| `/profile` | Yes | Profile settings |
| `/shared/:token` | No | Public read-only view of a shared plan |
| `/dashboard` | Yes | Authenticated home with sidebar layout |

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
          400 if major is not one of the recognised NUS majors

GET /profile  (protected)
Response: { "hasProfile": true, "profile": { ...fields, "completedMods": [...] } }
          { "hasProfile": false, "profile": null }  // new users: 200, not 404

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
  Other node types: AND/OR { children[] }, N_OF { n, children[] }, PROGRAMME { programmes[] }, OTHER { text, label }
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

### Graduation Requirements

```
GET /plans/:id/requirements  (protected)
Response (non-CS major):
  { "available": false, "message": "Graduation requirements tracking is currently only available for the Computer Science major." }
Response (CS major):
  {
    "available": true,
    "programme", "focusArea", "totalMCsRequired", "totalMCsPlanned",
    "categories": [{ key, label, type, satisfied, ...module_list or mc_total fields }],
    "fourYearRecommendation": { recommendedPlan, unscheduled, mcGapsToFillWithElectives, note }
  }
```

### Plan Sharing

```
POST /plans/:id/share  (protected)
Response: { "message": "Sharing enabled", "shareToken": "..." }   // idempotent: reuses existing token if already enabled

POST /plans/:id/share/rotate  (protected)
Response: { "message": "Share link rotated", "shareToken": "..." }   // invalidates the old link

DELETE /plans/:id/share  (protected)
Response: { "message": "Sharing disabled" }

GET /plans/shared/:token   // public, no auth required
Response: { "planName", "ownerName", "slots": [...], "grouped": {...} }
          404 if the token doesn't exist or sharing was disabled
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

- `main`: stable, protected. Direct pushes blocked via branch protection rules.
- Feature branches use `feat/`, `fix/`, `docs/`, `test/` prefixes.
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
      - run: npm test
```

Every push and pull request against `main` runs the backend build and the full Jest + Supertest suite.

### Security
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 7 days
- Emails normalised (lowercase + trimmed) before storage
- Major input validated against a canonical whitelist rather than accepted as free text
- Share links use `crypto.randomBytes(16)` tokens; shared view exposes only the owner's display name, never email or userId
- `.env` files gitignored
- Branch protection enabled on `main`
- Input type validation on all API endpoints
- Prisma P2025 errors caught and returned as 404 instead of 500

---

## Testing

### Automated Testing

The backend has a Jest + Supertest suite under `backend/tests/`, run via `npm test`:

| File | Type | Covers |
|---|---|---|
| `gradRequirementsEngine.test.ts` | Unit | Module classification, canonicalisation (CS1010S/CS2030/CS2040 equivalence), MC-bucket totals. Direct regression coverage for the bugs reported during MS2 to MS3 development |
| `nusMajors.test.ts` | Unit | Majors list integrity: no duplicates, exact case-sensitive matching |
| `routes.test.ts` | Integration | Real Express app + Supertest against `/profile` and `/plans/:id/share`, with `prisma` mocked: auth-gating, majors whitelist validation, share-link idempotency and ownership checks, public no-auth access |

Current result: **18 passing, 18 total**. Integration tests exercise the real routing and middleware (not simplified stand-ins); the database layer is mocked since there's no live Postgres instance in CI, so route *logic* is verified but not the raw SQL/Prisma queries themselves.

Frontend automated tests (React Testing Library) were scoped for MS3 but not completed; see Known Issues.

### Manual Testing

All API endpoints additionally tested via Thunder Client during development:

| Endpoint | Cases Tested |
|---|---|
| `POST /auth/register` | Valid input, duplicate email, missing fields, whitespace-only input |
| `POST /auth/login` | Valid login, wrong password, non-existent email |
| `GET /auth/me` | Valid token, missing token, user not found |
| `PUT /auth/me` | Valid name, empty name, missing token |
| `POST /profile` | Valid profile, missing fields, string yearOfStudy, invalid major |
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
| `GET /plans/:id/requirements` | CS major with gaps, CS major fully satisfied, non-CS major (available: false) |
| `POST /plans/:id/share`, rotate, delete | Enable, idempotent re-enable, rotate, disable, ownership check |
| `GET /plans/shared/:token` | Valid token, invalid token, disabled sharing |
| `POST /recommendations` | With goals, without goals, missing profile |

### User Testing

User testing was run with 5 students matched through the Orbital advisor-testing pool. Each tester worked through a self-guided task list covering six user stories: account/profile setup, AI recommendations, plan building, workload estimation, graduation requirements, and prerequisite lookup. Testers recorded what worked, what was confusing or broken, and any additional notes per task. Responses are anonymised below.

**All 5 of 5 responses received.**

#### Per-Task Results

| User story / task | What worked well | What was confusing or broken |
|---|---|---|
| **Register and complete profile setup** (major, faculty, year, cohort) | Registration and onboarding described as intuitive, clean, and easy to follow across all 5 testers; "simple details and good UI" | 3 of 5 flagged slow first load (one measured 15-20s) with no loading bar or progress indicator; majors dropdown scrolling reported as "a bit glitchy" |
| **Complete onboarding and get AI module recommendations** (optionally with a stated goal) | Recommendations matched stated goals and respected prerequisites; per-module explanations singled out as the strongest feature: "the description of WHY to take each of the modules was so accurate"; module search results appeared responsively | A Statistics + Economics double-major tester was recommended CS modules they never asked for; no field to declare a second major or minor; no cohort option for AY2026/2027 |
| **Create a plan, search modules, assign 3-5 modules to semesters** | Interface described as intuitive with clear affordances; having all 4 years laid out at once helped testers track what they had taken and plan ahead; multiple-plan support seen as useful for comparing paths | Adding modules one at a time (Add module → type → select, repeated) was called tedious; testers wanted multi-select from a single search. One tester reported the shareable plan link "might be faulty" |
| **Open the workload view and check MC/hour breakdown and overload flags** | The red overload warning communicated the problem clearly; the per-category hour breakdown (lecture/tutorial/lab/project/prep) helped testers set expectations before committing | One tester found it purely descriptive: "it's just listing stuff but doesn't provide insights" — wanted comparative signals (which semester is more project-heavy, which is lighter). One asked how the hourly estimate is derived |
| **Read the graduation requirements progress breakdown** (CS majors only) | The suggested 4-year plan was well received; "gives a very good view of everything by section" | Only 2 of 5 testers could evaluate this at all — the other 3 are not CS majors and left it blank. Category rows are clickable to expand satisfied/missing modules, but one tester did not discover this. Another found the view "a bit wordy and overloaded" and wanted separate tabs |
| **Look up a module's prerequisites; click through to earlier prerequisites** | Consistently one of the best-received features: "makes such a confusing thing look simple"; the tree clearly showed what was needed, and click-to-expand for deeper prerequisites worked as expected | Pan/zoom interaction was not discoverable — testers wanted on-screen instructions on whether to hold-click or scroll; nodes render too small to read comfortably ("not considerate enough for people with eyesight problems"); AND ("all of") and OR ("any of") nodes look too similar and risk being misread |

#### Synthesised Findings and Actions

| # | Finding | Severity | Evidence | Action |
|---|---|---|---|---|
| 1 | Recommendation engine suggests CS modules to non-CS majors | High | Statistics + Economics tester received unrequested CS recommendations | Genuine defect. The prefix-inference step biases toward CS regardless of declared major. Needs a major-aware module pool, mirroring the gate already applied to the requirements tracker |
| 2 | No loading state during backend cold start | High | 3 of 5 testers; up to 20s with no feedback | Render free-tier spin-down is documented, but the frontend gives no signal. Add a spinner/skeleton and a "waking up the server" message on first request |
| 3 | Prerequisite graph is hard to read and operate | Medium | Small nodes, undiscoverable pan/zoom, AND vs OR visually similar | Add zoom controls and a short interaction hint; increase default node size; colour- and label-differentiate logic nodes |
| 4 | Graduation requirements view is dense and its interactions are hidden | Medium | Expandable categories missed by one tester; "wordy and overloaded" | Make expand affordances explicit (chevrons/hover state); consider tabbed or collapsed-by-default sections |
| 5 | Module assignment is repetitive | Medium | Add-one-at-a-time loop called tedious | The `POST /plans/:id/slots/bulk` endpoint already supports batching; the frontend does not use it. Wire multi-select in search to the bulk endpoint |
| 6 | Profile model too narrow for real degree structures | Medium | No second major, no minor, no AY2026/2027 cohort | Second majors were deliberately excluded from MS3 scope to bound the combination space; the missing cohort year is a straightforward config fix |
| 7 | Workload view reports without interpreting | Low | "Doesn't provide insights"; one tester asked how hours are derived | Add comparative framing across semesters and surface the NUSMods-derived basis of the estimate |
| 8 | Shareable plan link reported as possibly faulty | Needs verification | One tester, unconfirmed | A frontend routing bug was found and fixed in PR #37 after this session. End-to-end click-through verification is still outstanding |
| 9 | Majors dropdown scrolling is glitchy | Low | One tester | Minor UI polish on the 61-item select |
| 10 | Graduation tracker is untestable for most testers | Structural | 3 of 5 blocked as non-CS majors | Expected given the deliberate CS-only scope, but it means the feature carries the thinnest user-testing evidence of any in the project. Worth noting when prioritising which majors to support next |

The two highest-severity findings (1 and 2) are user-facing defects rather than missing features, and are the priority for the next iteration.

---

## Milestone Progress

### MS1: Technical Proof of Concept (1 June 2026) ✅
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

### MS2: Prototype (29 June 2026) ✅
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
- [x] GitHub Actions CI pipeline
- [x] README updated for MS2

### MS3: Extended System (27 July 2026)
- [x] Graduation requirements tracker (CS majors, MC-bucket classification, module equivalence, 4-year recommendation)
- [x] Interactive prerequisite chain graph visualisation (`@xyflow/react` + `dagre`)
- [x] Plan variants: compare up to 3 plans' workload side by side
- [x] Shareable plan links (backend complete and tested; frontend routing bug found and fixed in PR #37, merged; manual click-through verification still pending)
- [x] Automated backend test suite (Jest + Supertest): 18 passing tests
- [x] Full user testing with structured findings: 5/5 responses received, per-task results and prioritised actions documented
- [ ] ~~Drag and drop semester slot reordering~~ (**descoped**, not attempted: dependency installed but never wired up, removed from MS3 scope for time)
- [ ] Workload clash alerts: not attempted beyond the existing MC/hour overload flag from MS2
- [ ] AI what-if simulator: not attempted
- [ ] Frontend automated tests (React Testing Library): not completed, backend suite only
- [ ] Splashdown poster and demo video

---

## Known Issues / Technical Debt

| Issue | Priority | Planned Fix |
|---|---|---|
| Module recommendation pool capped at 50 | Low | Eligibility-based filtering using prereq evaluator |
| AI recommendations skew to CS modules regardless of declared major | High | Surfaced in user testing. Make the module-pool prefix inference major-aware instead of CS-biased |
| No frontend loading state during backend cold start (up to 20s) | High | Surfaced in user testing. Add spinner/skeleton and a "waking up the server" message on first request |
| Prerequisite graph nodes small; pan/zoom undiscoverable; AND vs OR visually similar | Medium | Surfaced in user testing. Add zoom controls, interaction hint, and distinct styling for logic nodes |
| Plan builder adds modules one at a time despite `/slots/bulk` existing | Medium | Surfaced in user testing. Wire multi-select search to the existing bulk endpoint |
| No second major / minor support; no AY2026/2027 cohort option | Medium | Second majors descoped for MS3; cohort year is a config fix |
| Frontend has no automated tests | Low | React Testing Library, if time permits post-MS3 |
| Drag-and-drop reordering dependency (`@dnd-kit/*`) installed but unused | Low | Remove from `package.json` if not implemented, to avoid confusion |
| Frontend dashboard uses some placeholder data | Low | Connect all panels to live backend |
| `@prisma/client` and `pg` present in frontend `package.json` | Low | Remove unused backend dependencies from frontend |
| Graduation requirements MC-bucket totals are estimated from moduleCode prefixes, not official NUS bucket tagging | Low | Documented as approximate in the API response itself (`notes` field) |

---

## Team

| Name | Role |
|---|---|
| Jaisev Sachdev | Backend, API design, database, AI integration, prerequisite parser, testing |
| Qi Zao (Brian) | Frontend, UI/UX, React components, onboarding flow, plan builder, graph visualisation |
