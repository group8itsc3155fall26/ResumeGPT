import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";
import { db, ValidationError } from "../src/server/db";
import { createProject, listProjects } from "../src/server/projects";

const testDb = fileURLToPath(new URL("../prisma/test.db", import.meta.url));
let userId: number;

beforeAll(async () => {
  userId = (await db.user.create({ data: { username: "vitest-user" } })).id;
});

afterAll(async () => {
  await db.$disconnect();
  rmSync(testDb, { force: true });
});

it("creates a project that can be read back", async () => {
  const created = await createProject({
    userId,
    title: "  Database project  ",
    course: "ITSC 3160",
    semester: "Fall 2026",
    description: "Saved through the data-access layer.",
    skills: [" SQL ", ""],
  });

  expect(created).toMatchObject({
    title: "Database project",
    course: "ITSC 3160",
    semester: "Fall 2026",
    skills: ["SQL"],
    source: "Personal",
  });
  expect((await listProjects(userId)).map((project) => project.id)).toEqual([created.id]);
});

it("rejects a project with an empty title", async () => {
  const before = await listProjects(userId);

  await expect(
    createProject({
      userId,
      title: "   ",
      course: "ITSC 3160",
      semester: "Fall 2026",
      description: "No title.",
      skills: [],
    }),
  ).rejects.toBeInstanceOf(ValidationError);

  expect(await listProjects(userId)).toHaveLength(before.length);
});

it("treats skills with different capitalization as the same skill", async () => {
  const base = {
    userId,
    course: "ITSC 3155",
    semester: "Fall 2026",
    description: "Case-insensitive skills.",
  };
  await createProject({ ...base, title: "First", skills: ["Python"] });
  const second = await createProject({ ...base, title: "Second", skills: ["PYTHON", "python", "Flask"] });

  expect(second.skills).toEqual(["Python", "Flask"]);
});
