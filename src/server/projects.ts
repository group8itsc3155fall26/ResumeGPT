import { db, requireText, toProject, ValidationError, type Project, type ProjectSource } from "./db";

export type NewProject = {
  userId: number;
  title: string;
  course: string;
  semester: string;
  description: string;
  skills: string[];
  /** One-line outcome used by the resume bullet generator; optional for hand-added projects. */
  highlight?: string | null;
  source?: ProjectSource;
};

/**
 * Skills are matched case-insensitively: "PYTHON" and "python" are the same skill.
 * A skill reuses the spelling this user already has on another project (so the
 * library stays consistent), and duplicates within one project are dropped.
 */
async function normalizeSkills(userId: number, raw: unknown): Promise<string[]> {
  const existing = new Map<string, string>();
  for (const project of await listProjects(userId)) {
    for (const skill of project.skills) {
      if (!existing.has(skill.toLowerCase())) existing.set(skill.toLowerCase(), skill);
    }
  }

  const result = new Map<string, string>();
  for (const value of Array.isArray(raw) ? raw : []) {
    const skill = typeof value === "string" ? value.trim() : "";
    const key = skill.toLowerCase();
    if (skill && !result.has(key)) result.set(key, existing.get(key) ?? skill);
  }
  return [...result.values()];
}

export async function listProjects(userId: number): Promise<Project[]> {
  const rows = await db.project.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map(toProject);
}

export async function createProject(input: NewProject): Promise<Project> {
  const source = input.source ?? "Personal";
  if (source !== "Canvas" && source !== "Personal") {
    throw new ValidationError(`Project source must be "Canvas" or "Personal".`);
  }
  const skills = await normalizeSkills(input.userId, input.skills);
  const highlight = typeof input.highlight === "string" ? input.highlight.trim() : "";

  const row = await db.project.create({
    data: {
      userId: input.userId,
      title: requireText(input.title, "Project title"),
      course: requireText(input.course, "Project course"),
      semester: requireText(input.semester, "Project semester"),
      description: requireText(input.description, "Project description"),
      skills: JSON.stringify(skills),
      highlight: highlight || null,
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
