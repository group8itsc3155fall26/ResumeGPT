import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { ValidationError } from "../src/server/db";
import { createProject, deleteProject, listProjects } from "../src/server/projects";
import { AiError } from "../src/server/resumeDraft";
import { createResume, deleteResume, generateResume, listResumes } from "../src/server/resumes";

// Load secrets (GEMINI_API_KEY) and settings from the git-ignored .env file.
// Read at request time, so this runs before any key is needed.
if (existsSync(".env")) process.loadEnvFile(".env");

const app = express();
app.use(express.json());

// shortcut: one seeded demo user, replace with session lookup when login is wired to the API.
const DEMO_USER_ID = 1;

const idFrom = (value: string) => {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new ValidationError("Project or resume id must be an integer.");
  return id;
};

app.get("/api/projects", async (_req, res) => {
  res.json(await listProjects(DEMO_USER_ID));
});

app.post("/api/projects", async (req, res) => {
  res.status(201).json(await createProject({ ...req.body, userId: DEMO_USER_ID }));
});

app.delete("/api/projects/:id", async (req, res) => {
  const deleted = await deleteProject(DEMO_USER_ID, idFrom(req.params.id));
  res.status(deleted ? 204 : 404).end();
});

app.get("/api/resumes", async (_req, res) => {
  res.json(await listResumes(DEMO_USER_ID));
});

app.post("/api/resumes", async (req, res) => {
  res.status(201).json(await createResume({ ...req.body, userId: DEMO_USER_ID }));
});

app.post("/api/resumes/generate", async (req, res) => {
  res.status(201).json(
    await generateResume({ userId: DEMO_USER_ID, prompt: req.body?.prompt, skills: req.body?.skills }),
  );
});

app.delete("/api/resumes/:id", async (req, res) => {
  const deleted = await deleteResume(DEMO_USER_ID, idFrom(req.params.id));
  res.status(deleted ? 204 : 404).end();
});

// Express 5 forwards async rejections here, so routes need no try/catch.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof AiError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.API_PORT ?? 3001);
app.listen(port, () => console.log(`ResumeGPT API listening on http://localhost:${port}`));
