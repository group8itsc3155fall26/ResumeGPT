# ResumeGPT

Career-building web app for college students: it turns Canvas coursework into
resume-ready project descriptions and skills. This milestone keeps Canvas
**mocked** — there are no live Canvas API calls — but everything else runs
end to end against a real local database.

## Stack

- **Frontend:** React 19 + Vite 8 + TypeScript, Tailwind CSS v4 (`@import 'tailwindcss'`).
- **API:** Express 5 on `http://localhost:3001`.
- **Database:** SQLite through Prisma 6 (schema in `prisma/schema.prisma`).
- **Tests:** Vitest (`vitest run`). **Lint:** Oxlint (`oxlint src server tests`).

## Commands

```bash
npx pnpm@10 install        # pnpm is the committed package manager
cp .env.example .env       # DATABASE_URL + API_PORT
npx prisma migrate deploy  # apply committed migrations
npx prisma generate        # regenerate the client after schema edits
npx tsx prisma/seed.ts     # demo student, 4 projects, 2 resumes
npx tsx server/index.ts    # API on :3001
npx vite                   # UI on :8443, proxies /api -> :3001
npx vitest run             # data-layer + API tests
npx oxlint src server tests
```

## Layout

- `src/App.tsx` — every screen: auth, profile, resume studio, project library, mock Canvas view.
- `src/api.ts` — typed API client and shared frontend types; sends the student session header.
- `src/data/canvasCatalog.ts` — the mock Canvas courses and assignments (the only place to edit that content).
- `src/lib/resumeBullets.ts` — deterministic stand-in for the LLM: project → action-oriented bullet + source attribution.
- `src/server/db.ts` — Prisma client, shared error types, domain types, validation helpers.
- `src/server/users.ts` — student profile creation, login lookup, demo student.
- `src/server/projects.ts`, `src/server/resumes.ts` — scoped data-access layers.
- `server/index.ts` — Express routes; no business logic lives here.
- `tests/` — Vitest suites; they share `prisma/test.db`, built once in `tests/global-setup.ts`.

## Data model

- `User` — `username` (unique, the login handle), `name`, `major`, `college`
  (defaults to UNC Charlotte), `classStanding` (Freshman…Senior), `graduationYear`.
- `Project` — coursework entry: `title`, `course`, `semester`, `description`,
  `skills` (JSON string array), `highlight` (one-line outcome used in bullets),
  `source` (`Canvas` | `Personal`).
- `Resume` — `title`, `date`, and `bullets` (JSON array of
  `{ id, text, source, projectId }`). `source` is the attribution badge, so every
  claim traces back to the assignment it came from.

SQLite has no array or JSON column here: arrays are JSON-encoded strings, parsed
and validated at the API boundary. See `docs/ai-design-review.md` for that decision.

## Prototype session

There is no password. The browser calls `POST /api/auth/login` (or
`/api/auth/demo`) and then sends `x-student-id: <id>` on every request. The API
resolves that header in `currentStudent()` and scopes every query to that id.
Swapping this for a signed session cookie touches only that one function.
Never treat the header as authentication in anything user-facing.

## Mock Canvas

`src/data/canvasCatalog.ts` holds three realistic courses (ITSC 3155, ITSC 2214,
ITSC 3160) with assignment descriptions, skills, submission details and a
`highlight`. The import dialog turns selected assignments into `Project` rows
with `source: "Canvas"`. Replacing the mock with a real Canvas client means
mapping Canvas JSON onto `CanvasAssignment` — nothing else changes.

## Conventions

- Use double quotes for strings containing apostrophes, or escape them.
- Close every JSX tag; keep braces balanced.
- Business rules go in `src/server/*`, not in `server/index.ts` or components.
- Schema changes go through `npx prisma migrate dev --name <change>` so the
  committed migration folder stays the source of truth.
- Never commit `.env`, `*.db`, or secrets.

## Gotchas

- `pnpm` may not be on PATH; `npx pnpm@10 install` works everywhere.
- The Prisma CLI is run through Node in `tests/global-setup.ts` because the
  `node_modules/.bin` shims cannot be spawned directly on Windows.
- Vite is fixed to port 8443 (`strictPort`); stop a stale server before restarting.
- `tsx` does not hot-reload — restart `server/index.ts` after API changes.
