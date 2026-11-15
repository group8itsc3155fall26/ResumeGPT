import { db, requireText, toProject, ValidationError, type Project, type ProjectSource } from "./db";

export type NewProject = {
  userId: number;
  title: string;
  course: string;
  semester: string;
  description: string;
  skills: string[];
  source?: ProjectSource;
};

export async function listProjects(userId: number): Promise<Project[]> {
  const rows = await db.project.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map(toProject);
}

export async function createProject(input: NewProject): Promise<Project> {
  const source = input.source ?? "Personal";
  if (source !== "Canvas" && source !== "Personal") {
    throw new ValidationError(`Project source must be "Canvas" or "Personal".`);
  }
  const skills = (Array.isArray(input.skills) ? input.skills : [])
    .map((skill) => (typeof skill === "string" ? skill.trim() : ""))
    .filter(Boolean);

  const row = await db.project.create({
    data: {
      userId: input.userId,
      title: requireText(input.title, "Project title"),
      course: requireText(input.course, "Project course"),
      semester: requireText(input.semester, "Project semester"),
      description: requireText(input.description, "Project description"),
      skills: JSON.stringify(skills),
      source,
    },
  });
  return toProject(row);
}

/** Scoped by userId so one user cannot delete another user's project. */
export async function deleteProject(userId: number, id: number): Promise<boolean> {
  const { count } = await db.project.deleteMany({ where: { id, userId } });
  return count > 0;
}
