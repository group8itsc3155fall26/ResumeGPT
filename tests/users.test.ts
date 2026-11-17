import { afterAll, expect, it } from "vitest";
import { ConflictError, db } from "../src/server/db";
import { createResume, listResumes, updateResume } from "../src/server/resumes";
import { createStudent, ensureDemoStudent, findStudentByUsername, getStudent } from "../src/server/users";

afterAll(async () => {
  await db.$disconnect();
});

it("creates a student profile, normalizes the username, and applies defaults", async () => {
  const student = await createStudent({
    username: "  JMoten  ",
    name: "Jordan Moten",
    major: "Computer Science",
  });

  expect(student).toMatchObject({
    username: "jmoten",
    name: "Jordan Moten",
    college: "UNC Charlotte",
    classStanding: "Freshman",
    graduationYear: null,
  });
  expect((await getStudent(student.id)).username).toBe("jmoten");
});

it("rejects a duplicate username", async () => {
  await createStudent({ username: "duplicate.student", name: "First Student" });

  await expect(
    createStudent({ username: "duplicate.student", name: "Second Student" }),
  ).rejects.toBeInstanceOf(ConflictError);
});

it("round-trips resume bullets with their source attribution", async () => {
  const student = await createStudent({ username: "bullet-owner", name: "Bullet Owner" });

  const resume = await createResume({
    userId: student.id,
    title: "SWE Internship",
    bullets: [
      { text: "  Built a REST client.  ", source: "ITSC 3155 — Lab 3", projectId: 12 },
      { text: "Indexed a corpus.", source: "ITSC 2214 — Project 1", projectId: null },
    ],
  });

  expect(resume.bullets).toHaveLength(2);
  expect(resume.bullets[0]).toMatchObject({
    text: "Built a REST client.",
    source: "ITSC 3155 — Lab 3",
    projectId: 12,
  });
  expect(resume.bullets[0].id).toBeTruthy();
  expect((await listResumes(student.id))[0].bullets).toHaveLength(2);
});

it("keeps resumes scoped to their owner", async () => {
  const owner = await createStudent({ username: "scope-owner", name: "Scope Owner" });
  const other = await createStudent({ username: "scope-other", name: "Scope Other" });

  const resume = await createResume({ userId: owner.id, title: "Owner Resume", bullets: [] });

  expect(await listResumes(other.id)).toHaveLength(0);
  expect(await updateResume(other.id, resume.id, { title: "Hijacked" })).toBeNull();
  expect((await listResumes(owner.id))[0].title).toBe("Owner Resume");
});

it("creates the demo student once and reuses it", async () => {
  const first = await ensureDemoStudent();
  const second = await ensureDemoStudent();

  expect(second.id).toBe(first.id);
  expect((await findStudentByUsername("demo")).name).toBe("John Bob");
});
