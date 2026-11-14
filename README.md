# ResumeGPT

Resume generation project based on Figma and AI integration.

React 19 + Vite + TypeScript frontend, SQLite database via Prisma, Express data API.

## Quickstart (each team member)

Requirements: Node 20+, pnpm (`npm i -g pnpm`).

```bash
git clone git@github.com:group8itsc3155fall26/ResumeGPT.git
cd ResumeGPT
pnpm install
cp .env.example .env          # placeholders only; put real values in your local .env
npx prisma migrate dev        # creates your local dev.db from the committed schema
npx tsx prisma/seed.ts        # sample data: 1 demo user, 4 projects, 3 resumes
npx tsx server/index.ts       # data API on http://localhost:3001
pnpm dev                      # UI in a second terminal
```

Verify the DB connection: `curl http://localhost:3001/api/projects` returns a JSON
array. Full details and the team verification table: **docs/database-setup.md**.

## Scripts

| Command        | What it does                          |
| -------------- | ------------------------------------- |
| `pnpm dev`     | Vite dev server (proxies /api → :3001)|
| `pnpm test`    | Vitest data-layer tests               |
| `pnpm lint`    | oxlint over src/, server/, tests/     |
| `pnpm build`   | Production build                      |

## Repository layout

```
src/            React app (App.tsx talks to the API, not localStorage)
src/server/     Data-access layer (Prisma queries + validation)
server/         Express API
prisma/         schema.prisma, migrations/, seed.ts (dev.db is local, git-ignored)
docs/           database-setup.md, ai-design-review.md
docs/uml/       class-diagram.puml/.svg, sequence-diagram.puml/.svg
```

## Rules

- Never commit `.env`, `*.db`, or keys — `.gitignore` enforces this.
- Schema changes go through `npx prisma migrate dev --name <change>` so the
  committed migration folder stays the single source of truth for everyone.

## One-paste setup prompt for an AI assistant

If you'd rather have Copilot/another model do the setup, paste this:

```
I'm setting up the ResumeGPT project at this repo root (React 19 + Vite +
TypeScript, pnpm, SQLite via Prisma, Express data API). Do exactly this and
nothing else:
1. Run `pnpm install`.
2. If .env does not exist, copy .env.example to .env (placeholders are fine
   for SQLite: DATABASE_URL="file:./dev.db").
3. Run `npx prisma migrate dev` to build my local database from the committed
   migrations in prisma/migrations/. Do not edit prisma/schema.prisma.
4. Run `npx tsx prisma/seed.ts` to load sample data.
5. Start `npx tsx server/index.ts` (API on :3001) in the background.
6. Verify: `curl http://localhost:3001/api/projects` returns a JSON array.
   Also run `pnpm test` and `pnpm lint` — both must pass.
Report each command's exit code. Do not commit or push anything, do not
create new files, and do not modify docs/ or prisma/.
```
