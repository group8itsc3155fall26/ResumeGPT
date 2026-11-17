# AI design review — project skills storage

Scope: the persistence design for `Project.skills` in `prisma/schema.prisma`.
Diagram source of truth: `docs/uml/class-diagram.puml`.

## The AI-proposed design

When asked to model project skills, the generated schema came back normalized:

```prisma
model Project { ... skills ProjectSkill[] }
model Skill {
  id        String          @id @default(cuid())
  name      String          @unique
  projects  ProjectSkill[]
}
model ProjectSkill {
  projectId String
  skillId   String
  @@id([projectId, skillId])
}
```

Three models and two extra joins for a field the UI treats as a comma-separated tag list.

## Review

Where skills are actually used today (`src/App.tsx`):

- written once per project, from a comma-split text input (`handleAddProject`);
- read only to build a search string and to test membership for the skill filter
  (`filteredProjects`);
- never counted, renamed, or shared across projects, and never queried on its own.

So the requirement is "a small ordered set of labels attached to one project". A join
table buys referential integrity for a vocabulary that does not exist yet, and costs a
second write per project, a nested `include` on every read, and cascade rules to keep
the pair table clean.

## Correction

`Project.skills` is a single `String` holding a JSON array:

```prisma
skills String // JSON array, e.g. ["React","SQL"]
```

The API boundary is where it becomes a real list: parse on read, `JSON.stringify` on
write, reject non-array input there. The React `Project` type keeps `skills: string[]`,
so the UI is unchanged.

Tradeoff, accepted with eyes open:

| | JSON string (chosen) | Join table (rejected) |
|---|---|---|
| Writes per project | 1 | 1 + N |
| Read cost | no join | join + nested include |
| Filter by skill in SQL | not possible (client-side or `LIKE`, which false-matches `React`/`React Native`) | indexed |
| Rename a skill everywhere | rewrite every row | one `UPDATE` |
| Schema size | 1 column | 3 models |

Both rejected capabilities are unused in this milestone, and skill filtering already
runs client-side over the loaded project list.

`shortcut: skills are opaque JSON — no SQL filtering, no rename, no per-skill index;
upgrade to a ProjectSkill join table when the app needs to query or rename skills
server-side.`

## What the review changed

- Dropped `Skill` and `ProjectSkill` from the schema; kept `Project.skills String`.
- Recorded the encoding in the class diagram so the JSON string is not mistaken for a
  display string.
- Left the parse/serialize step as an API-boundary responsibility, which is also the
  validation point for the failure path in `docs/uml/sequence-diagram.puml`.

Not covered: resume sections and the Canvas import payload are still modeled as
strings, and were not reviewed here.

---

# AI design review — resume bullets

Scope: where generated resume bullets live after the user approves them.

## The AI-proposed design

Asked to model a resume with bullets, the generated schema introduced a full entity:

```prisma
model Resume {
  id      Int      @id @default(autoincrement())
  title   String
  bullets Bullet[]
}

model Bullet {
  id        Int    @id @default(autoincrement())
  text      String
  source    String
  order     Int
  projectId Int?
  resumeId  Int
}
```

## Review

A bullet is generated once, edited in place, and read only as part of the resume it
belongs to. Nothing queries bullets across resumes, filters by them, or shares one
bullet between two resumes. The `order` column exists only because a relational
list needs one.

The upsert path also got worse: saving an edited resume becomes delete-all-plus-
reinsert or an N-row diff inside a transaction, where the UI simply replaces an
array it already holds in state.

## Correction

`Resume.bullets` is a JSON array stored inline:

```prisma
bullets String @default("[]") // JSON ResumeBullet[]
```

Each entry is `{ id, text, source, projectId }`, validated by `parseBullets()` in
`src/server/resumes.ts` and parsed on read in `toResume()`. The `source` label is
kept inside the bullet rather than joined at read time, so the attribution badge
survives independently of the project row.

| | JSON array (chosen) | Bullet table (rejected) |
|---|---|---|
| Save an edit | 1 `UPDATE` | delete + re-insert, or N-row diff |
| Read a resume | 1 row, no join | join + nested include |
| Reorder | rewrite the array | update `order` on N rows |
| Query bullets across resumes | not possible in SQL | indexed |
| Per-bullet foreign key to `Project` | soft `projectId`, no constraint | enforced |

The rejected capabilities are unused: the UI renders bullets only inside the resume
dialog, and a bullet outliving its source project must render an attribution string
anyway rather than fail a foreign key.

`shortcut: bullets are opaque JSON — no cross-resume queries and no FK to Project;
normalize into a Bullet table when bullet analytics or enforced provenance is needed.`

## What the review changed

- Dropped the `Bullet` model; kept `Resume.bullets` as JSON text.
- Moved validation into `parseBullets()` so untrusted browser payloads cannot store
  malformed bullets.
- Documented the encoding in the class diagram so it is not mistaken for a display
  string.

Not covered: the Canvas import payload is still a TypeScript catalog rather than a
persisted `Assignment` entity, because Canvas remains mocked this sprint.
