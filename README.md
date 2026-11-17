# ResumeGPT

Career-building web app for college students. ResumeGPT pulls your coursework,
turns it into evidence-backed project descriptions and skills, and keeps a
resume library that grows with you instead of being rebuilt at graduation.

React 19 + Vite + TypeScript frontend, Express data API, SQLite via Prisma.

> **Milestone scope:** Canvas is **mocked** (`src/data/canvasCatalog.ts`). There
> are no live Canvas API calls yet, but profiles, projects, resumes and bullets
> are real and persisted.

## Quickstart

Requirements: Node 20+, pnpm (`npm i -g pnpm`, or use `npx pnpm@10`).

```bash
git clone git@github.com:group8itsc3155fall26/ResumeGPT.git
cd ResumeGPT
npx pnpm@10 install
cp .env.example .env             # placeholders only; real values stay local
npx prisma migrate deploy        # builds your local dev.db from committed migrations
npx tsx prisma/seed.ts           # demo student, 4 projects, 2 resumes
npx tsx server/index.ts          # data API on http://localhost:3001
npx vite                         # UI on http://localhost:8443 (second terminal)
```

Verify the API: `curl -H "x-student-id: 1" http://localhost:3001/api/projects`
returns a JSON array. Full details: **docs/database-setup.md**.

On the login screen, **Continue as Demo Student** signs you in with one click
(creates the demo profile on a fresh database).

## What works now

- **Student profiles** — `username`, name, major, college (defaults to UNC
  Charlotte), class standing, and graduation year. Every project and resume is
  scoped to the signed-in student.
- **Project library** — add personal projects or import from the mock Canvas
  catalog; search and filter by course, semester, and skill.
- **Canvas import (mocked)** — pick a course (ITSC 3155, ITSC 2214, ITSC 3160),
  choose assignments, and they land in the library tagged `CANVAS SYNC`.
- **Resume studio** — describe a target role, choose skills, and generate a draft.
  Every bullet carries a **source badge** (`Source: ITSC 3155 — Team Sprint
  Project`) and can be edited or removed before it is saved. Saved resumes can be
  reopened, edited, and deleted.

## Scripts

| Command        | What it does                           |
| -------------- | -------------------------------------- |
| `pnpm dev`     | Vite dev server (proxies /api → :3001) |
| `pnpm server`  | Express data API on :3001              |
| `pnpm test`    | Vitest data-layer tests                |
| `pnpm lint`    | oxlint over src/, server/, tests/      |
| `pnpm build`   | Production build                       |
| `pnpm db:seed` | Reload demo data                       |

## API

Every `/api` route except the auth ones requires the prototype session header
`x-student-id: <id>`, and only ever reads or writes that student's rows.

| Method | Route                 | Purpose                          |
| ------ | --------------------- | -------------------------------- |
| POST   | `/api/students`       | Create a student profile         |
| POST   | `/api/auth/login`     | Look up a profile by username    |
| POST   | `/api/auth/demo`      | Create/return the demo student   |
| GET    | `/api/me`             | Current student profile          |
| GET    | `/api/projects`       | List projects                    |
| POST   | `/api/projects`       | Create a project                 |
| DELETE | `/api/projects/:id`   | Delete a project                 |
| GET    | `/api/resumes`        | List resumes with bullets        |
| POST   | `/api/resumes`        | Create a resume                  |
| PATCH  | `/api/resumes/:id`    | Update title and/or bullets      |
| DELETE | `/api/resumes/:id`    | Delete a resume                  |

## Repository layout

```
src/            React app (App.tsx, api client, mock Canvas catalog, bullet generator)
src/server/     Data-access layer (Prisma queries + validation)
server/         Express API
prisma/         schema.prisma, migrations/, seed.ts (dev.db is local, git-ignored)
docs/           database-setup.md, ai-design-review.md, uml/
tests/          Vitest suites (shared prisma/test.db, built once in global-setup)
```

## Rules

- Never commit `.env`, `*.db`, or keys — `.gitignore` enforces this.
- Schema changes go through `npx prisma migrate dev --name <change>` so the
  committed migration folder stays the single source of truth for everyone.
- The session header is a prototype convenience, not authentication.
