import { PrismaClient } from "@prisma/client";
import { assignmentToProject, mockCanvasCourses } from "../src/data/canvasCatalog";
import { generateBullet } from "../src/lib/resumeBullets";

const db = new PrismaClient();

const softwareEngineering = mockCanvasCourses[0];
const databases = mockCanvasCourses[2];

// Sample rows mirror the mock Canvas catalog so imports and seed data agree.
const seededProjects = [
  ...softwareEngineering.assignments.slice(0, 2).map(assignmentToProject),
  assignmentToProject(databases.assignments[0]),
  {
    title: "Personal Portfolio Website",
    course: "Personal",
    semester: "Spring 2026",
    description:
      "Built a personal portfolio to showcase selected coursework, projects, and technical skills.",
    skills: ["React", "CSS", "Accessibility"],
    highlight: null,
    source: "Personal" as const,
  },
];

const demoStudent = {
  name: "John Bob",
  major: "Computer Science",
  college: "UNC Charlotte",
  classStanding: "Junior",
  graduationYear: 2027,
};

async function main() {
  const user = await db.user.upsert({
    where: { username: "demo" },
    update: demoStudent,
    create: { username: "demo", ...demoStudent },
  });

  // Re-running the seed replaces the demo user's rows instead of duplicating them.
  await db.project.deleteMany({ where: { userId: user.id } });
  await db.resume.deleteMany({ where: { userId: user.id } });

  const projects = [];
  for (const project of seededProjects) {
    projects.push(
      await db.project.create({
        data: { ...project, skills: JSON.stringify(project.skills), userId: user.id },
      }),
    );
  }

  const toDomain = (row: (typeof projects)[number]) => ({
    id: row.id,
    title: row.title,
    course: row.course,
    semester: row.semester,
    description: row.description,
    skills: JSON.parse(row.skills) as string[],
    highlight: row.highlight,
    source: row.source === "Canvas" ? ("Canvas" as const) : ("Personal" as const),
  });

  const resumes = [
    {
      title: "Software Engineering Internship Resume",
      date: "November 12, 2026",
      bullets: projects.slice(0, 3).map((row) => generateBullet(toDomain(row))),
    },
    {
      title: "Full-Stack Developer Resume",
      date: "October 28, 2026",
      bullets: projects.slice(2).map((row) => generateBullet(toDomain(row))),
    },
  ];

  for (const resume of resumes) {
    await db.resume.create({
      data: { ...resume, bullets: JSON.stringify(resume.bullets), userId: user.id },
    });
  }

  console.log(
    `Seeded student "${user.username}" (id ${user.id}): ${projects.length} projects, ${resumes.length} resumes.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
