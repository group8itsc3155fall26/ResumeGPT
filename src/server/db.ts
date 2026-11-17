import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();

/** Input rejected before it reaches the database. Routes map this to HTTP 400. */
export class ValidationError extends Error {}

/** Row the request refers to does not exist. Routes map this to HTTP 404. */
export class NotFoundError extends Error {}

/** Username already taken. Routes map this to HTTP 409. */
export class ConflictError extends Error {}

/** Missing or unknown student session. Routes map this to HTTP 401. */
export class UnauthorizedError extends Error {}

export type ProjectSource = "Canvas" | "Personal";

export const CLASS_STANDINGS = ["Freshman", "Sophomore", "Junior", "Senior"] as const;
export type ClassStanding = (typeof CLASS_STANDINGS)[number];

export const DEFAULT_COLLEGE = "UNC Charlotte";
export const DEMO_USERNAME = "demo";

/**
 * Student profile returned to the client. The prototype session is a student id,
 * not a password, so there is no credential field to leak here.
 */
export type Student = {
  id: number;
  username: string;
  name: string;
  major: string;
  college: string;
  classStanding: ClassStanding;
  graduationYear: number | null;
};

type StudentRow = Omit<Student, "classStanding"> & { classStanding: string };

export function toStudent(row: StudentRow): Student {
  const classStanding = CLASS_STANDINGS.find((standing) => standing === row.classStanding) ?? "Freshman";
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    major: row.major,
    college: row.college,
    classStanding,
    graduationYear: row.graduationYear,
  };
}

/** Same shape as the Project type in src/App.tsx so UI wiring is a drop-in. */
export type Project = {
  id: number;
  title: string;
  course: string;
  semester: string;
  description: string;
  skills: string[];
  highlight: string | null;
  source: ProjectSource;
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
    highlight: row.highlight ?? null,
    source: row.source === "Canvas" ? "Canvas" : "Personal",
  };
}

/** Structured sections returned by the Gemini resume drafter. */
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

/** One resume claim plus the coursework it was generated from. */
export type ResumeBullet = {
  id: string;
  text: string;
  /** Human-readable attribution, e.g. "ITSC 3155 — Team Sprint Project". */
  source: string;
  projectId: number | null;
};

export type Resume = {
  id: number;
  title: string;
  date: string;
  bullets: ResumeBullet[];
  content: ResumeContent | null;
};

/** Trimmed, non-empty string or throw — every text field goes through here. */
export function requireText(value: unknown, field: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ValidationError(`${field} is required.`);
  return text;
}
