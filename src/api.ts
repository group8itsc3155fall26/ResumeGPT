export type ProjectSource = "Canvas" | "Personal";

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

export type NewProject = Omit<Project, "id">;

export type ResumeBullet = {
  id: string;
  text: string;
  /** Human-readable attribution shown as a badge, e.g. "ITSC 3155 — Team Sprint Project". */
  source: string;
  projectId: number | null;
};

/** Sections returned by the Gemini drafter; null for hand-built resumes. */
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
  bullets: ResumeBullet[];
  content: ResumeContent | null;
};

export const CLASS_STANDINGS = ["Freshman", "Sophomore", "Junior", "Senior"] as const;
export type ClassStanding = (typeof CLASS_STANDINGS)[number];

export type Student = {
  id: number;
  username: string;
  name: string;
  major: string;
  college: string;
  classStanding: ClassStanding;
  graduationYear: number | null;
};

export type NewStudent = {
  username: string;
  name: string;
  major: string;
  college: string;
  classStanding: ClassStanding;
  graduationYear: number | null;
};

export const SESSION_KEY = "resumegptStudent";

let activeStudentId: number | null = null;

/** The prototype session is just the id returned by /api/auth; no credential is stored. */
export function setActiveStudent(id: number | null) {
  activeStudentId = id;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (activeStudentId !== null) headers.set("x-student-id", String(activeStudentId));

  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }
  return (response.status === 204 ? null : await response.json()) as T;
}

// --- auth --------------------------------------------------------------------

export const loginStudent = (username: string) =>
  request<Student>("/api/auth/login", { method: "POST", body: JSON.stringify({ username }) });

export const demoLogin = () => request<Student>("/api/auth/demo", { method: "POST" });

export const createStudentProfile = (input: NewStudent) =>
  request<Student>("/api/students", { method: "POST", body: JSON.stringify(input) });

export const fetchStudent = () => request<Student>("/api/me");

// --- projects ----------------------------------------------------------------

export const listProjects = () => request<Project[]>("/api/projects");

export const addProject = (input: NewProject) =>
  request<Project>("/api/projects", { method: "POST", body: JSON.stringify(input) });

export const removeProject = (id: number) => request<null>(`/api/projects/${id}`, { method: "DELETE" });

// --- resumes -----------------------------------------------------------------

export const listResumes = () => request<Resume[]>("/api/resumes");

export const addResume = (input: { title: string; bullets: ResumeBullet[] }) =>
  request<Resume>("/api/resumes", { method: "POST", body: JSON.stringify(input) });

export const editResume = (id: number, input: { title: string; bullets: ResumeBullet[] }) =>
  request<Resume>(`/api/resumes/${id}`, { method: "PATCH", body: JSON.stringify(input) });

/** Gemini drafts and persists the resume server-side; the key never reaches the browser. */
export const generateResumeWithAi = (prompt: string, skills: string[]) =>
  request<Resume>("/api/resumes/generate", { method: "POST", body: JSON.stringify({ prompt, skills }) });

export const removeResume = (id: number) => request<null>(`/api/resumes/${id}`, { method: "DELETE" });
