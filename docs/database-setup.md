# Database Setup — ResumeGPT

## Database choice: SQLite

SQLite was selected because the application is a small single-user resume tool with
no concurrent write load, so a full database server adds setup cost without benefit.
It runs as a local file — every team member gets an identical environment with zero
configuration, which satisfies the sprint requirement that each member develop and
test against a local database using the same committed schema and seed scripts.
Prisma is the ORM; if the app later needs a shared multi-user database, the same
Prisma schema can be moved to PostgreSQL by changing only the `provider` and
`DATABASE_URL` in `prisma/schema.prisma`.

## Setup (each team member)

1. Clone or update the repository.
2. Install dependencies: `pnpm install`
3. Create a local `.env` from the committed template:
   ```
   cp .env.example .env
   ```
   `.env.example` contains placeholder values only. Never commit `.env`.
4. Apply the schema and generate the Prisma client:
   ```
   npx prisma migrate dev
   ```
5. Load sample development data (4 projects, 3 resumes, 1 demo user):
   ```
   npx tsx prisma/seed.ts
   ```
6. Start the data API server:
   ```
   npx tsx server/index.ts
   ```
7. Verify connectivity:
   ```
   curl http://localhost:3001/api/projects
   ```
   A JSON array of projects means the application is connected to the database.

## Environment variables

| Variable       | Purpose                        | Example (placeholder)     |
| -------------- | ------------------------------ | ------------------------- |
| `DATABASE_URL` | SQLite file path for Prisma    | `file:./dev.db`           |
| `API_PORT`     | Port for the Express data API  | `3001`                    |

No real credentials are required for SQLite. Never place real passwords, tokens, or
private keys in `.env.example` or in any committed file.

## Team verification table

Each member runs steps 1–7 and records the result:

| Member  | Connection test performed                  | Result |
| ------- | ------------------------------------------ | ------ |
| _name_  | `curl /api/projects` after `prisma migrate` | _pass/fail_ |
| _name_  | Created a project via POST `/api/projects`  | _pass/fail_ |
| _name_  | Retrieved it after restarting the server    | _pass/fail_ |

Each member uses their own local `dev.db` (git-ignored), so the same schema and seed
scripts reproduce the identical database on every machine.
