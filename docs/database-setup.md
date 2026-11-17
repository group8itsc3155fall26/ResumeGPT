# Database Setup — ResumeGPT

## Database choice: SQLite

SQLite was selected because the application is a small, single-team resume tool with no
concurrent write load, so a full database server adds setup cost without benefit. It
runs as a local file — every team member gets an identical environment with zero
configuration, which satisfies the sprint requirement that each member develop and
test against a local database using the same committed schema and seed scripts.

Prisma is the ORM. If the app later needs a shared multi-user database, the same
Prisma schema moves to PostgreSQL by changing only the `provider` and `DATABASE_URL`.

This is a **development database holding sample data only** — never real student or
production records.

## Data model

| Model    | Purpose                        | Key fields |
| -------- | ------------------------------ | ---------- |
| `User`   | Student profile + login handle | `username` (unique), `name`, `major`, `college` (defaults to UNC Charlotte), `classStanding`, `graduationYear` |
| `Project`| One coursework entry           | `title`, `course`, `semester`, `description`, `skills` (JSON array), `highlight`, `source` (`Canvas` \| `Personal`), `userId` |
| `Resume` | A saved resume                 | `title`, `date`, `bullets` (JSON array of `{id, text, source, projectId}`), `userId` |

Relationships: `User 1 ⟶ 0..* Project`, `User 1 ⟶ 0..* Resume`, both
`onDelete: Cascade`, indexed on `userId`. Every query is scoped by `userId`, so one
student can never read or delete another student's rows.

`skills` and `bullets` are JSON-encoded strings because SQLite has no array column.
Validation and parsing happen at the API boundary (`src/server/*.ts`), not in the
database. See `docs/ai-design-review.md` for that decision and its tradeoffs.
`docs/uml/class-diagram.puml` is the diagram source of truth.

## Setup (each team member)

1. Clone or update the repository.
2. Install dependencies: `npx pnpm@10 install`
3. Create a local `.env` from the committed template:
   ```bash
   cp .env.example .env
   ```
   `.env.example` contains placeholders only. Never commit `.env`.
4. Apply the committed migrations and generate the Prisma client:
   ```bash
   npx prisma migrate deploy
   ```
   Use `npx prisma migrate dev --name <change>` only when you are changing the schema.
5. Load sample development data (demo student, 4 projects, 2 resumes):
   ```bash
   npx tsx prisma/seed.ts
   ```
6. Start the data API: `npx tsx server/index.ts` (port 3001).
7. Start the UI: `npx vite` (port 8443, proxies `/api` to 3001).
8. Verify connectivity:
   ```bash
   curl -H "x-student-id: 1" http://localhost:3001/api/projects
   ```
   A JSON array means the application is connected to the database.

Each member uses their own local `dev.db` (git-ignored), so the committed migrations
and seed script reproduce the identical schema on every machine.

## Environment variables

| Variable       | Purpose                        | Example (placeholder)          |
| -------------- | ------------------------------ | ------------------------------ |
| `DATABASE_URL` | SQLite file path for Prisma    | `file:./dev.db`                |
| `API_PORT`     | Port for the Express data API  | `3001`                         |

No real credentials are required for SQLite. Never place real passwords, tokens, or
private keys in `.env.example` or in any committed file.

## Credential safety

`.gitignore` excludes `node_modules/`, `.env*` (with `!.env.example` re-included),
`*.db`, `*.db-journal`, `*.sqlite*`, `*.pem`, `*.key`, and `*.p12`.

Evidence collected on this repository (run from the repo root):

| Check | Command | Result |
| ----- | ------- | ------ |
| `.env` is ignored | `git check-ignore -v .env` | matches `.gitignore:5:.env*` |
| `.env` is not tracked | `git ls-files .env` | no output |
| No secrets/DB files tracked | `git ls-files \| grep -Ei '\.env\|\.db$\|\.sqlite\|\.pem$\|\.key$'` | only `.env.example` |
| Placeholder file committed | `git ls-files .env.example` | tracked, contains placeholders only |

`.env.example` holds only `DATABASE_URL="file:./dev.db"` and `API_PORT=3001`.
No credential has ever been committed to this repository, so no rotation is required.

## Migrations

| Migration | Change |
| --------- | ------ |
| `20261114164547_init` | `User`, `Project`, `Resume` |
| `20261115230327_add_resume_content` | `Resume.content` (JSON from the Gemini drafter) |
| `20261116090000_student_profiles_and_traceable_bullets` | student profile fields, `Project.highlight`, `Resume.bullets` + `updatedAt` |

The third migration is purely additive (`ALTER TABLE ... ADD COLUMN` with defaults),
so it applies cleanly to an existing `dev.db` without resetting it and without
dropping the AI drafts stored in `Resume.content`. Pre-existing users get a default
profile (`name = ''`); `prisma/seed.ts` refreshes the demo profile.

## Team verification table

Each member runs steps 1–8 and records the result. Do not paste credentials here.

| Member | Connection test performed | Result |
| ------ | ------------------------- | ------ |
| _name_ | `curl -H "x-student-id: 1" /api/projects` after `migrate deploy` | _pass/fail_ |
| _name_ | Created a project via `POST /api/projects` with the session header | _pass/fail_ |
| _name_ | Retrieved it after restarting the API server | _pass/fail_ |
| _name_ | Created a resume via `POST /api/resumes`, edited it via `PATCH` | _pass/fail_ |
| _name_ | Ran `vitest run` and `oxlint src server tests` | _pass/fail_ |
