// Self-check for the data-access layer: create, list, validate, delete.
// Run with: pnpm db:check
import assert from "node:assert/strict";
import { db, ValidationError } from "../src/server/db";
import { createProject, deleteProject, listProjects } from "../src/server/projects";
import { listResumes } from "../src/server/resumes";

const userId = 1;
const input = {
  userId,
  title: "Self-check project",
  course: "ITSC 3155",
  semester: "Fall 2026",
  description: "Created by scripts/db-check.ts",
  skills: [" Testing ", ""],
  source: "Personal" as const,
};

const before = await listProjects(userId);
assert.ok(before.length >= 4, `expected seeded projects, found ${before.length}`);

const created = await createProject(input);
assert.deepEqual(created.skills, ["Testing"], "skills are trimmed JSON strings");
assert.equal(created.source, "Personal");

const after = await listProjects(userId);
assert.equal(after.length, before.length + 1);
assert.ok(after.some((project) => project.id === created.id), "created project is listed");

await assert.rejects(() => createProject({ ...input, title: "   " }), ValidationError);
await assert.rejects(() => createProject({ ...input, course: "" }), ValidationError);

assert.equal(await deleteProject(userId, created.id), true);
assert.equal(await deleteProject(userId, created.id), false, "second delete reports nothing removed");
assert.equal((await listProjects(userId)).length, before.length);
assert.ok((await listResumes(userId)).length >= 3, "seeded resumes are listed");

console.log(`db-check ok: created + listed project ${created.id}, validation rejected empty title/course, delete cleaned up.`);
await db.$disconnect();
