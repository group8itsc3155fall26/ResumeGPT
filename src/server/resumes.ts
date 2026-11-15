import { db, requireText, ValidationError, type Resume, type ResumeContent } from "./db";
import { listProjects } from "./projects";
import { draftResume, selectProjects } from "./resumeDraft";

export type NewResume = {
  userId: number;
  title: string;
  date: string;
  content?: ResumeContent | null;
};

export type ResumeRequest = {
  userId: number;
  prompt: unknown;
  skills: unknown;
};

type ResumeRow = { id: number; title: string; date: string; content: string | null };

function toResume({ id, title, date, content }: ResumeRow): Resume {
  return { id, title, date, content: content ? (JSON.parse(content) as ResumeContent) : null };
}

const today = () =>
  new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date());

export async function listResumes(userId: number): Promise<Resume[]> {
  const rows = await db.resume.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map(toResume);
}

export async function createResume(input: NewResume): Promise<Resume> {
  const row = await db.resume.create({
    data: {
      userId: input.userId,
      title: requireText(input.title, "Resume title"),
      date: requireText(input.date, "Resume date"),
      content: input.content ? JSON.stringify(input.content) : null,
    },
  });
  return toResume(row);
}

/** Draft a resume from the student's prompt + selected skills, using their matching projects, and save it. */
export async function generateResume(input: ResumeRequest): Promise<Resume> {
  const prompt = requireText(input.prompt, "Role description");
  if (prompt.length > 2000) throw new ValidationError("Keep the role description under 2,000 characters.");
  const skills = (Array.isArray(input.skills) ? input.skills : [])
    .filter((skill): skill is string => typeof skill === "string" && Boolean(skill.trim()))
    .map((skill) => skill.trim());
  if (!skills.length) throw new ValidationError("Choose at least one skill to emphasize.");

  const projects = selectProjects(await listProjects(input.userId), skills);
  const { title, content } = await draftResume(prompt, skills, projects);
  return createResume({ userId: input.userId, title, date: today(), content });
}

export async function deleteResume(userId: number, id: number): Promise<boolean> {
  const { count } = await db.resume.deleteMany({ where: { id, userId } });
  return count > 0;
}
