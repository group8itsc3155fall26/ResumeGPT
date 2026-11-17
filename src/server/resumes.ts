import { randomUUID } from "node:crypto";
import { db, requireText, ValidationError, type Resume, type ResumeBullet } from "./db";

export type NewResume = {
  userId: number;
  title: string;
  date?: string;
  bullets?: unknown;
};

export type ResumeUpdate = {
  title?: unknown;
  bullets?: unknown;
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

function toResume(row: { id: number; title: string; date: string; bullets: string }): Resume {
  let bullets: ResumeBullet[] = [];
  try {
    const parsed: unknown = JSON.parse(row.bullets);
    if (Array.isArray(parsed)) bullets = parsed as ResumeBullet[];
  } catch {
    // A malformed row should not break the whole library; treat it as empty.
    bullets = [];
  }
  return { id: row.id, title: row.title, date: row.date, bullets };
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
    },
  });
  return toResume(row);
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
