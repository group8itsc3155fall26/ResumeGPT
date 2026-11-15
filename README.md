# ResumeGPT

Resume generation project based on Figma and AI integration.

React 19 + Vite + TypeScript frontend, SQLite database via Prisma, Express data API,
and Google Gemini for AI resume drafts.

## Quickstart (each team member)

Requirements: Node 20+, pnpm (`npm i -g pnpm`).

```bash
git clone git@github.com:group8itsc3155fall26/ResumeGPT.git
cd ResumeGPT
pnpm install
cp .env.example .env          # placeholders only; put real values in your local .env
                              # then add your Gemini key: see "Gemini API key" below
npx prisma migrate dev        # creates your local dev.db from the committed schema
npx tsx prisma/seed.ts        # sample data: 1 demo user, 4 projects, 3 resumes
npx tsx server/index.ts       # data API on http://localhost:3001
pnpm dev                      # UI in a second terminal
```

Open http://localhost:8443. Verify the DB connection: `curl http://localhost:3001/api/projects`
returns a JSON array. Full details and the team verification table: **docs/database-setup.md**.

**Already have the repo?** After `git pull`, run `pnpm install` and `npx prisma migrate dev`
to pick up new dependencies and database changes, then restart the API.

## Gemini API key (resume generation)

The Resume tab sends your role description, the selected skills, and the projects that use
those skills to Google Gemini, which returns a Skills section and a Projects section. Each
person uses their **own free key**; keys are never shared or committed.

1. Go to **https://aistudio.google.com/apikey**, sign in with a Google account, and click
   **Create API key**. The free tier is enough for this project.
2. Open the `.env` file in the project root (create it with `cp .env.example .env` if it
   doesn't exist) and paste the key between the quotes:

   ```
   GEMINI_API_KEY="your-key-here"
   ```

3. Restart the API (`Ctrl+C`, then `pnpm server` or `npx tsx server/index.ts`). The key is
   read only when the server starts.
4. In the app, go to **Resume**, pick skills, describe the role, and click **Generate resume**.

Keep it safe:

- `.env` is git-ignored. Never put the key in `.env.example`, in code, or in a commit.
  Check with `git status` before committing: `.env` must not appear.
- Only the Express server reads the key; the browser never sees it. Do **not** rename it to
  `VITE_GEMINI_API_KEY`: anything prefixed `VITE_` gets bundled into the frontend.
- If a key leaks, delete it in AI Studio and create a new one.

Optional settings in `.env`:

| Variable                | Default                 | Purpose                                          |
| ----------------------- | ----------------------- | ------------------------------------------------ |
| `GEMINI_MODEL`          | `gemini-3.8-flash`      | Main model used for drafts                       |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.5-flash-lite` | Retried once if the main model is busy or slow   |

Troubleshooting (messages appear in the Resume tab; details print in the API terminal):

| Message                                   | Fix                                                         |
| ----------------------------------------- | ----------------------------------------------------------- |
| "Resume generation is not set up yet"     | `GEMINI_API_KEY` is missing or empty; add it and restart the API |
| "Gemini rejected the request"             | The key (or `GEMINI_MODEL`) is invalid; copy the key again  |
| "rate limit was reached" / "overloaded"   | Free-tier limit or high demand; wait a minute and retry     |
| "None of your projects use the selected skills" | Add a project with those skills or pick different ones |
| Request times out                         | Make sure the API (`pnpm server`) is running                |

## Scripts

| Command        | What it does                          |
| -------------- | ------------------------------------- |
| `pnpm dev`     | Vite dev server (proxies /api → :3001)|
| `pnpm server`  | Express API on :3001 (reads `.env`)   |
| `pnpm test`    | Vitest data-layer tests               |
| `pnpm lint`    | oxlint over src/, server/, tests/     |
| `pnpm build`   | Production build                      |

## Repository layout

```
src/            React app (App.tsx talks to the API, not localStorage)
src/server/     Data-access layer (Prisma queries + validation);
                resumeDraft.ts = Gemini call + output checks
server/         Express API
prisma/         schema.prisma, migrations/, seed.ts (dev.db is local, git-ignored)
docs/           database-setup.md, ai-design-review.md
docs/uml/       class-diagram.puml/.svg, sequence-diagram.puml/.svg
```

## Rules

- Never commit `.env`, `*.db`, or keys (including `GEMINI_API_KEY`); `.gitignore` enforces this.
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
7. Do not create, request, or paste a Gemini API key. Tell me to add my own
   GEMINI_API_KEY to .env (see the README's "Gemini API key" section) and
   restart the API.
Report each command's exit code. Do not commit or push anything, do not
create new files, and do not modify docs/ or prisma/.
```
