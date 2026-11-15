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
