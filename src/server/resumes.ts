import { randomUUID } from "node:crypto";
import {
  db,
  requireText,
  ValidationError,
  type Resume,
  type ResumeBullet,
  type ResumeContent,
} from "./db";
import { listProjects } from "./projects";
import { draftResume, selectProjects } from "./resumeDraft";

export type NewResume = {
  userId: number;
  title: string;
  date?: string;
  bullets?: unknown;
  content?: ResumeContent | null;
};

export type ResumeUpdate = {
  title?: unknown;
  bullets?: unknown;
};

export type ResumeRequest = {
  userId: number;
  prompt?: unknown;
  skills?: unknown;
};

const formatToday = () =>
  new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date());

/**
 * Bullets arrive from the browser, so every field is re-validated here.
 * Each bullet keeps the coursework it came from so the claim stays traceable.
 */
function parseBullets(value: unknown): ResumeBullet[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ValidationError("Resume bullets must be a list.");

  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new ValidationError(`Bullet ${index + 1} is not a valid bullet.`);
    }
    const bullet = entry as Record<string, unknown>;
    return {
      id: typeof bullet.id === "string" && bullet.id.trim() ? bullet.id : randomUUID(),
      text: requireText(bullet.text, `Bullet ${index + 1} text`),
      source:
        typeof bullet.source === "string" && bullet.source.trim()
          ? bullet.source.trim()
          : "Personal project",
      projectId:
        typeof bullet.projectId === "number" && Number.isInteger(bullet.projectId)
          ? bullet.projectId
          : null,
    };
  });
}

function parseContent(value: string | null): ResumeContent | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as ResumeContent;
  } catch {
    return null;
  }
}

function toResume(row: {
  id: number;
  title: string;
  date: string;
  bullets: string;
  content: string | null;
}): Resume {
  let bullets: ResumeBullet[] = [];
  try {
    const parsed: unknown = JSON.parse(row.bullets);
    if (Array.isArray(parsed)) bullets = parsed as ResumeBullet[];
  } catch {
    // A malformed row should not break the whole library; treat it as empty.
    bullets = [];
  }
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    bullets,
    content: parseContent(row.content),
  };
}

export async function listResumes(userId: number): Promise<Resume[]> {
  const rows = await db.resume.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map(toResume);
}

export async function createResume(input: NewResume): Promise<Resume> {
  const row = await db.resume.create({
    data: {
      userId: input.userId,
      title: requireText(input.title, "Resume title"),
      date: typeof input.date === "string" && input.date.trim() ? input.date.trim() : formatToday(),
      bullets: JSON.stringify(parseBullets(input.bullets)),
      content: input.content ? JSON.stringify(input.content) : null,
    },
  });
  return toResume(row);
}

/** Turn a Gemini draft into the same traceable bullet shape the UI edits and stores. */
function bulletsFromContent(content: ResumeContent): ResumeBullet[] {
  return content.projects.flatMap((project) =>
    project.bullets.map((text) => ({
      id: randomUUID(),
      text: text.trim(),
      source: `${project.course} — ${project.title}`,
      projectId: project.projectId,
    })),
  );
}

/**
 * Draft a resume from the student's target role and selected skills with Gemini,
 * then persist it. The AI sections are kept in `content`; the editable copy is
 * flattened into `bullets` so the review dialog and attribution badges are identical
 * to the offline generator.
 */
export async function generateResume(input: ResumeRequest): Promise<Resume> {
  const prompt = requireText(input.prompt, "Role description");
  if (prompt.length > 2000) throw new ValidationError("Keep the role description under 2,000 characters.");

  const skills = (Array.isArray(input.skills) ? input.skills : [])
    .filter((skill): skill is string => typeof skill === "string" && Boolean(skill.trim()))
    .map((skill) => skill.trim());
  if (!skills.length) throw new ValidationError("Choose at least one skill to emphasize.");

  const projects = selectProjects(await listProjects(input.userId), skills);
  if (!projects.length) {
    throw new ValidationError("None of your saved projects match those skills yet. Import coursework first.");
  }

  const { title, content } = await draftResume(prompt, skills, projects);
  return createResume({ userId: input.userId, title, content, bullets: bulletsFromContent(content) });
}

/** Scoped by userId; returns null when the resume belongs to someone else. */
export async function updateResume(userId: number, id: number, input: ResumeUpdate): Promise<Resume | null> {
  const existing = await db.resume.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const data: { title?: string; bullets?: string } = {};
  if (input.title !== undefined) data.title = requireText(input.title, "Resume title");
  if (input.bullets !== undefined) data.bullets = JSON.stringify(parseBullets(input.bullets));
  if (Object.keys(data).length === 0) throw new ValidationError("Provide a title or bullets to update.");

  const row = await db.resume.update({ where: { id }, data });
  return toResume(row);
}

export async function deleteResume(userId: number, id: number): Promise<boolean> {
  const { count } = await db.resume.deleteMany({ where: { id, userId } });
  return count > 0;
}
