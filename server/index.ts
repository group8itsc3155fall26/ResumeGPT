import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  type Student,
} from "../src/server/db";
import { createProject, deleteProject, listProjects } from "../src/server/projects";
import { AiError } from "../src/server/resumeDraft";
import {
  createResume,
  deleteResume,
  generateResume,
  listResumes,
  updateResume,
} from "../src/server/resumes";
import { createStudent, ensureDemoStudent, findStudentByUsername, getStudent } from "../src/server/users";

// Load secrets (GEMINI_API_KEY) and settings from the git-ignored .env file.
// Read at request time, so this runs before any key is needed.
const loadEnvFile = Reflect.get(process, "loadEnvFile") as ((path: string) => void) | undefined;
if (existsSync(".env") && loadEnvFile) loadEnvFile.call(process, ".env");

const app = express();
app.use(express.json());

/**
 * Prototype session: the browser sends the student id it received from /api/auth,
 * and every query below is scoped to that id. Replacing this with a signed session
 * cookie changes only this function.
 */
const STUDENT_HEADER = "x-student-id";

async function currentStudent(req: Request): Promise<Student> {
  const header = req.header(STUDENT_HEADER);
  const id = Number(header);
  if (!header || !Number.isInteger(id) || id <= 0) {
    throw new UnauthorizedError("Sign in with a student profile to continue.");
  }
  return getStudent(id);
}

const idFrom = (value: string) => {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new ValidationError("Project or resume id must be an integer.");
  return id;
};

// --- auth / student profiles -------------------------------------------------

app.post("/api/students", async (req, res) => {
  res.status(201).json(await createStudent(req.body ?? {}));
});

app.post("/api/auth/login", async (req, res) => {
  res.json(await findStudentByUsername((req.body as { username?: unknown } | undefined)?.username));
});

app.post("/api/auth/demo", async (_req, res) => {
  res.json(await ensureDemoStudent());
});

app.get("/api/me", async (req, res) => {
  res.json(await currentStudent(req));
});

// --- projects ----------------------------------------------------------------

app.get("/api/projects", async (req, res) => {
  const student = await currentStudent(req);
  res.json(await listProjects(student.id));
});

app.post("/api/projects", async (req, res) => {
  const student = await currentStudent(req);
  res.status(201).json(await createProject({ ...req.body, userId: student.id }));
});

app.delete("/api/projects/:id", async (req, res) => {
  const student = await currentStudent(req);
  const deleted = await deleteProject(student.id, idFrom(req.params.id));
  res.status(deleted ? 204 : 404).end();
});

// --- resumes -----------------------------------------------------------------

app.get("/api/resumes", async (req, res) => {
  const student = await currentStudent(req);
  res.json(await listResumes(student.id));
});

app.post("/api/resumes", async (req, res) => {
  const student = await currentStudent(req);
  res.status(201).json(await createResume({ ...req.body, userId: student.id }));
});

// Gemini draft; throws AiError (502/503) when the key is missing or the model fails.
app.post("/api/resumes/generate", async (req, res) => {
  const student = await currentStudent(req);
  res.status(201).json(
    await generateResume({ userId: student.id, prompt: req.body?.prompt, skills: req.body?.skills }),
  );
});

app.patch("/api/resumes/:id", async (req, res) => {
  const student = await currentStudent(req);
  const updated = await updateResume(student.id, idFrom(req.params.id), req.body ?? {});
  if (!updated) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  res.json(updated);
});

app.delete("/api/resumes/:id", async (req, res) => {
  const student = await currentStudent(req);
  const deleted = await deleteResume(student.id, idFrom(req.params.id));
  res.status(deleted ? 204 : 404).end();
});

// Express 5 forwards async rejections here, so routes need no try/catch.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AiError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof UnauthorizedError) {
    res.status(401).json({ error: error.message });
    return;
  }
  if (error instanceof ValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof ConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.API_PORT ?? 3001);
app.listen(port, () => console.log(`ResumeGPT API listening on http://localhost:${port}`));
