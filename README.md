```
# Courseway 🎓

**AI-powered NUS academic degree planner**

NUS Orbital 2026 · Artemis · THE Team

---

## What is Courseway?

Courseway helps NUS students plan their academic journey more effectively. Students input their major, year of study, and completed modules to receive personalised, AI-powered module recommendations that account for prerequisite chains, workload balance, and graduation requirements.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| AI | Anthropic Claude API |
| Module Data | NUSMods Public API |

---

## Project Structure

```
orbital/
├── backend/          # Express API server
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/   # Auth middleware
│   │   ├── lib/          # Prisma client
│   │   └── scripts/      # NUSMods sync script
│   └── prisma/           # Database schema + migrations
└── frontend/         # React application (in progress)
```

---

## Backend Setup

### Prerequisites
- Node.js v20+
- PostgreSQL v15+

### Installation

```bash
git clone https://github.com/Jaisev-Sachdev/orbital.git
cd orbital/backend
npm install
```

### Environment Variables

Create a `.env` file inside `backend/`:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/courseway"
JWT_SECRET="your-secret-key"
ANTHROPIC_API_KEY="sk-ant-..."
NUSMODS_ACADEMIC_YEAR="2025-2026"
PORT=3001
```

### Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE courseway;"

# Run migrations
npx prisma migrate dev

# Sync NUSMods module data (~7000 modules)
npm run sync:modules
```

### Running the Server

```bash
npm run dev
```

Server runs at `http://localhost:3001`

---

## API Documentation

Base URL: `http://localhost:3001`

### Authentication

#### Register
```
POST /auth/register
Body: { "email": "user@u.nus.edu", "password": "password123" }
Response: { "message": "User created successfully", "userId": "..." }
```

#### Login
```
POST /auth/login
Body: { "email": "user@u.nus.edu", "password": "password123" }
Response: { "message": "Login successful", "token": "eyJ..." }
```

> All protected routes require the header:
> `Authorization: Bearer <token>`

---

### Profile

#### Create / Update Profile
```
POST /profile  🔒
Body: { "major": "Computer Science", "faculty": "School of Computing", "yearOfStudy": 1, "cohortYear": "AY2024/25" }
Response: { "message": "Profile saved", "profile": { ... } }
```

#### Get Profile
```
GET /profile  🔒
Response: { "profile": { ...profile, "completedMods": [...] } }
```

#### Add Completed Modules
```
POST /profile/modules  🔒
Body: { "moduleCodes": ["CS1101S", "MA1521", "CS1231S"] }
Response: { "message": "3 module(s) added", "count": 3 }
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
GET /modules?search=CS2040
Response: { "modules": [ { "moduleCode": "CS2040S", "title": "...", "credits": 4, ... } ] }
```

#### Get Module by Code
```
GET /modules/:code
Response: { "module": { "moduleCode": "CS2040S", "title": "...", "credits": 4, "prerequisite": "...", "semesters": [1,2] } }
```

#### Get Prerequisites
```
GET /modules/:code/prerequisites
Response: { "moduleCode": "CS2040S", "prerequisites": ["CS1101S", "CS1231S", ...], "prerequisiteText": "..." }
```

---

### Recommendations

#### Get AI Module Recommendations
```
POST /recommendations  🔒
Response: { "recommendations": [ { "moduleCode": "CS2030S", "title": "...", "reason": "..." } ] }
```


## Team

| Name | Role |
|---|---|
| Jaisev | Backend + AI integration |
| Qi Zao | Frontend + UI/UX |
```

Save it, then commit and push:

```bash
git add README.md
git commit -m "docs: add README with setup guide and API documentation"
git push origin main
```

Send me when pushed.
