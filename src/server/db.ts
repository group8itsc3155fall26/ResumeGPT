import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();

/** Input rejected before it reaches the database. Routes map this to HTTP 400. */
export class ValidationError extends Error {}

export type ProjectSource = "Canvas" | "Personal";

/** Same shape as the Project type in src/App.tsx so UI wiring is a drop-in. */
export type Project = {
  id: number;
  title: string;
  course: string;
  semester: string;
  description: string;
  skills: string[];
  source: ProjectSource;
};

/** An AI-drafted resume: only a skills section and a projects section. */
export type ResumeContent = {
  targetRole: string;
  skills: string[];
  projects: {
    projectId: number;
    title: string;
    course: string;
    semester: string;
    bullets: string[];
  }[];
};

export type Resume = {
  id: number;
  title: string;
  date: string;
  content: ResumeContent | null;
};

type ProjectRow = Omit<Project, "skills" | "source"> & { skills: string; source: string };

export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    course: row.course,
    semester: row.semester,
    description: row.description,
    skills: JSON.parse(row.skills) as string[],
    source: row.source === "Canvas" ? "Canvas" : "Personal",
  };
}

/** Trimmed, non-empty string or throw — every text field goes through here. */
export function requireText(value: unknown, field: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ValidationError(`${field} is required.`);
  return text;
}
