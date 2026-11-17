import {
  CLASS_STANDINGS,
  DEFAULT_COLLEGE,
  DEMO_USERNAME,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  db,
  toStudent,
  type ClassStanding,
  type Student,
} from "./db";

export type NewStudent = {
  username?: unknown;
  name?: unknown;
  major?: unknown;
  college?: unknown;
  classStanding?: unknown;
  graduationYear?: unknown;
};

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

function normalizeUsername(value: unknown): string {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!USERNAME_PATTERN.test(text)) {
    throw new ValidationError(
      "Username must be 3-32 characters using letters, numbers, dots, dashes, or underscores.",
    );
  }
  return text;
}

function parseStanding(value: unknown): ClassStanding {
  if (value === undefined || value === null || value === "") return "Freshman";
  const text = String(value).trim().toLowerCase();
  const standing = CLASS_STANDINGS.find((option) => option.toLowerCase() === text);
  if (!standing) throw new ValidationError(`Class standing must be one of ${CLASS_STANDINGS.join(", ")}.`);
  return standing;
}

function parseGraduationYear(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2024 || year > 2100) {
    throw new ValidationError("Graduation year must be a four-digit year.");
  }
  return year;
}

function optionalText(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

export async function createStudent(input: NewStudent): Promise<Student> {
  const username = normalizeUsername(input.username);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) throw new ValidationError("Full name is required.");

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) throw new ConflictError(`The username "${username}" is already taken.`);

  const row = await db.user.create({
    data: {
      username,
      name,
      major: optionalText(input.major, "Computer Science"),
      college: optionalText(input.college, DEFAULT_COLLEGE),
      classStanding: parseStanding(input.classStanding),
      graduationYear: parseGraduationYear(input.graduationYear),
    },
  });
  return toStudent(row);
}

export async function findStudentByUsername(value: unknown): Promise<Student> {
  const username = normalizeUsername(value);
  const row = await db.user.findUnique({ where: { username } });
  if (!row) throw new NotFoundError(`No student profile found for "${username}". Create one to get started.`);
  return toStudent(row);
}

/** Resolves the id sent in the prototype session header; throws 401 when it is stale. */
export async function getStudent(id: number): Promise<Student> {
  const row = await db.user.findUnique({ where: { id } });
  if (!row) throw new UnauthorizedError("That student session no longer exists. Sign in again.");
  return toStudent(row);
}

/** Creates the shared demo student on first use so a fresh database still has a one-click login. */
export async function ensureDemoStudent(): Promise<Student> {
  const row = await db.user.upsert({
    where: { username: DEMO_USERNAME },
    update: {},
    create: {
      username: DEMO_USERNAME,
      name: "John Bob",
      major: "Computer Science",
      college: DEFAULT_COLLEGE,
      classStanding: "Junior",
      graduationYear: 2027,
    },
  });
  return toStudent(row);
}
