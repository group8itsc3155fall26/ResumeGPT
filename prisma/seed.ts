import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Sample rows copied from initialProjects / initialResumes in src/App.tsx.
const projects = [
  {
    title: "Programming Assignment 4: REST API Client",
    course: "ITSC 3155",
    semester: "Fall 2026",
    description:
      "Built a command-line REST API client that validates responses, handles request failures, and presents weather data clearly.",
    skills: ["API Integration", "JSON Processing", "Testing", "Error Handling"],
    source: "Canvas",
  },
  {
    title: "ITSC-3155 Web Application Project",
    course: "ITSC 3155",
    semester: "Fall 2026",
    description:
      "Designed and built a responsive web application with a student team, from early requirements through usability testing.",
    skills: ["React", "TypeScript", "Teamwork"],
    source: "Canvas",
  },
  {
    title: "Database Management System",
    course: "ITSC 3160",
    semester: "Fall 2026",
    description:
      "Created a normalized relational database and documented queries for a semester-long data management project.",
    skills: ["SQL", "Data Modeling", "Documentation"],
    source: "Canvas",
  },
  {
    title: "Personal Portfolio Website",
    course: "Personal",
    semester: "Spring 2026",
    description:
      "Built a personal portfolio to showcase selected coursework, projects, and technical skills.",
    skills: ["React", "CSS", "Accessibility"],
    source: "Personal",
  },
];

const resumes = [
  { title: "Software Engineer Resume v2", date: "October 4, 2026" },
  { title: "Full-Stack Developer Resume", date: "September 28, 2026" },
  { title: "Data Structures & Algorithms Resume", date: "September 15, 2026" },
];

async function main() {
  const user = await db.user.upsert({
    where: { username: "demo" },
    update: {},
    create: { username: "demo" },
  });

  // Re-running the seed replaces the demo user's rows instead of duplicating them.
  await db.project.deleteMany({ where: { userId: user.id } });
  await db.resume.deleteMany({ where: { userId: user.id } });

  await db.project.createMany({
    data: projects.map((project) => ({
      ...project,
      skills: JSON.stringify(project.skills),
      userId: user.id,
    })),
  });
  await db.resume.createMany({ data: resumes.map((resume) => ({ ...resume, userId: user.id })) });

  console.log(
    `Seeded user "${user.username}" (id ${user.id}): ${projects.length} projects, ${resumes.length} resumes.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
