# Sprint 2 evidence

Collected on Windows 11, Node 24.21.0, pnpm 10.34.3, against the local SQLite
database. Re-run from the `ResumeGPT/` directory. These commands are the same ones
every team member should reproduce (see `docs/database-setup.md`).

## Database build

```
$ npx prisma migrate deploy
All migrations have been successfully applied.

$ npx tsx prisma/seed.ts
Seeded student "demo" (id 1): 4 projects, 2 resumes.
```

Migration history:

```
prisma/migrations/
  20261114164547_init/
  20261114222745_student_profiles_and_resume_bullets/
```

## Automated tests

```
$ npx vitest run

 ✓ tests/users.test.ts (5 tests) 190ms
 ✓ tests/projects.test.ts (2 tests) 54ms

 Test Files  2 passed (2)
      Tests  7 passed (7)
```

Coverage against the sprint requirements:

| Requirement | Test |
| ----------- | ---- |
| Successful data operation | `creates a project that can be read back`; `round-trips resume bullets with their source attribution` |
| Invalid input / error handling | `rejects a project with an empty title`; `rejects a duplicate username` |
| Selected user story | `creates a student profile, normalizes the username, and applies defaults`; `keeps resumes scoped to their owner` |

`tests/global-setup.ts` builds a throwaway `prisma/test.db` from the schema and runs
the Prisma CLI through Node so the suite works on Windows as well as macOS/Linux.
`vitest.config.ts` sets `fileParallelism: false` because the suites share that file.

## Lint and build

```
$ npx tsc --noEmit
(no output — 0 errors)

$ npx oxlint src server tests
Found 0 warnings and 0 errors.
Finished in 119ms on 14 files with 96 rules using 4 threads.

$ npx vite build
✓ built in 814ms
```

## Persistent-data walkthrough

Performed against the running API (`npx tsx server/index.ts`, port 3001).

| Step | Request | Result |
| ---- | ------- | ------ |
| No session | `GET /api/projects` | `401` |
| Demo login | `POST /api/auth/demo` | `200` — `{id:1, name:"John Bob", college:"UNC Charlotte", classStanding:"Junior", graduationYear:2027}` |
| Seeded rows | `GET /api/projects` with `x-student-id: 1` | 4 projects |
| Seeded rows | `GET /api/resumes` with `x-student-id: 1` | 2 resumes, bullets with source labels |
| New student | `POST /api/students` | `201`, id 3 |
| Isolation | `GET /api/projects` as the new student | `[]` — cannot see demo data |
| Import coursework | `POST /api/projects` (`source: "Canvas"`) | `201` with `highlight` stored |
| Save resume | `POST /api/resumes` with a bullet | `201`, server-assigned bullet `id` |
| Edit resume | `PATCH /api/resumes/5` | `200`, new title persisted |
| Cross-student edit | `PATCH` demo's resume as student 3 | `404` — scoped, cannot touch it |
| Delete resume | `DELETE /api/resumes/5` | `204` |
| Restart persistence | reload the app after restarting the API | rows still present in `prisma/dev.db` |

The UI path (`Continue as Demo Student` → dashboard) was exercised in the browser and
rendered the demo profile with 2 resumes and 4 projects loaded from the database.

## UML source and rendering

```
docs/uml/class-diagram.puml      + class-diagram.svg
docs/uml/sequence-diagram.puml   + sequence-diagram.svg
```

Render command (no local JRE required):

```bash
curl -s -X POST -H "Content-Type: text/plain" \
  --data-binary @docs/uml/class-diagram.puml \
  https://kroki.io/plantuml/svg -o docs/uml/class-diagram.svg
```

Both diagrams describe the schema after
`20261114222745_student_profiles_and_resume_bullets`.
