import { FormEvent, useEffect, useMemo, useState } from "react";

type Project = {
  id: number;
  title: string;
  course: string;
  semester: string;
  description: string;
  skills: string[];
  source: "Canvas" | "Personal";
};

/** AI-drafted resume body: only a skills section and a projects section. */
type ResumeContent = {
  targetRole: string;
  skills: string[];
  projects: { projectId: number; title: string; course: string; semester: string; bullets: string[] }[];
};

type Resume = {
  id: number;
  title: string;
  date: string;
  content: ResumeContent | null;
};

type NewProject = Omit<Project, "id">;

type Section = "Profile" | "Resume" | "Projects" | "Canvas";

/** Collected when a student creates an account; not collected on plain login. */
type StudentProfile = { fullName: string; major: string; graduationYear: string };

const PROFILE_KEY = "resumegptProfile";

function loadProfile(): StudentProfile | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "null") as Partial<StudentProfile> | null;
    return value?.fullName && value.major && value.graduationYear
      ? { fullName: value.fullName, major: value.major, graduationYear: value.graduationYear }
      : null;
  } catch {
    return null;
  }
}

/** "John Bob" -> "JB" (first and last word). */
const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/);
  return [words[0], words.length > 1 ? words[words.length - 1] : ""]
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};
type AuthMode = "login" | "create";

const PROJECTS_API = "/api/projects";
const RESUMES_API = "/api/resumes";

/** Fetch helper: the API reports validation failures as { error } with a 4xx. */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }
  return (response.status === 204 ? null : await response.json()) as T;
}

const postProject = (input: NewProject) =>
  api<Project>(PROJECTS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

const deleteProject = (id: number) => api<null>(`${PROJECTS_API}/${id}`, { method: "DELETE" });

const generateResume = (prompt: string, skills: string[]) =>
  api<Resume>(`${RESUMES_API}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, skills }),
    // The server gives up on Gemini after ~65s (main model + fallback); never spin past that.
    signal: AbortSignal.timeout(75_000),
  }).catch((error: Error) => {
    if (error.name === "TimeoutError") throw new Error("The request timed out. Make sure `pnpm server` is running and try again.");
    throw error;
  });

// Canvas demo fixtures: what the extension "syncs". Saved projects live in the database.
const canvasProjects: Project[] = [
  {
    id: 1,
    title: "Programming Assignment 4: REST API Client",
    course: "ITSC 3155",
    semester: "Fall 2026",
    description:
      "Built a command-line REST API client that validates responses, handles request failures, and presents weather data clearly.",
    skills: ["API Integration", "JSON Processing", "Testing", "Error Handling"],
    source: "Canvas",
  },
  {
    id: 2,
    title: "ITSC-3155 Web Application Project",
    course: "ITSC 3155",
    semester: "Fall 2026",
    description:
      "Designed and built a responsive web application with a student team, from early requirements through usability testing.",
    skills: ["React", "TypeScript", "Teamwork"],
    source: "Canvas",
  },
  {
    id: 3,
    title: "Database Management System",
    course: "ITSC 3160",
    semester: "Fall 2026",
    description:
      "Created a normalized relational database and documented queries for a semester-long data management project.",
    skills: ["SQL", "Data Modeling", "Documentation"],
    source: "Canvas",
  },
  {
    id: 4,
    title: "Personal Portfolio Website",
    course: "Personal",
    semester: "Spring 2026",
    description:
      "Built a personal portfolio to showcase selected coursework, projects, and technical skills.",
    skills: ["React", "CSS", "Accessibility"],
    source: "Personal",
  },
];

/** Shown in the skill picker until the student has projects with skills of their own. */
const defaultSkillOptions = [
  "React",
  "TypeScript",
  "Python",
  "SQL",
  "Communication",
  "Leadership",
];

function App() {
  const [section, setSection] = useState<Section>("Profile");
  const [username, setUsername] = useState(
    () => window.localStorage.getItem("resumegptUsername") || "",
  );
  const [profile, setProfile] = useState<StudentProfile | null>(loadProfile);
  const [authMode, setAuthMode] = useState<AuthMode | null>(() =>
    window.localStorage.getItem("resumegptUsername") ? null : "login",
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("All courses");
  const [semesterFilter, setSemesterFilter] = useState("All semesters");
  const [skillFilter, setSkillFilter] = useState("All skills");
  const [selectedSkills, setSelectedSkills] = useState(["React", "TypeScript"]);
  const [roleDescription, setRoleDescription] = useState("");
  const [modal, setModal] = useState<"project" | "import" | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCourse, setProjectCourse] = useState("");
  const [projectSkills, setProjectSkills] = useState("");
  const [projectError, setProjectError] = useState("");
  const [notice, setNotice] = useState("");

  // Skills the student can pick: every skill on their projects, once each (case-insensitive).
  const skillOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const skill of projects.flatMap((project) => project.skills)) {
      if (!byKey.has(skill.toLowerCase())) byKey.set(skill.toLowerCase(), skill);
    }
    return byKey.size ? [...byKey.values()] : defaultSkillOptions;
  }, [projects]);

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const searchText =
          `${project.title} ${project.description} ${project.skills.join(" ")}`.toLowerCase();
        return (
          (!query || searchText.includes(query.toLowerCase())) &&
          (courseFilter === "All courses" || project.course === courseFilter) &&
          (semesterFilter === "All semesters" ||
            project.semester === semesterFilter) &&
          (skillFilter === "All skills" ||
            project.skills.some((skill) => skill.toLowerCase() === skillFilter.toLowerCase()))
        );
      }),
    [projects, query, courseFilter, semesterFilter, skillFilter],
  );

  useEffect(() => {
    let active = true;
    api<Project[]>(PROJECTS_API)
      .then((rows) => {
        if (!active) return;
        setProjects(rows);
        setProjectsError("");
      })
      .catch((error: Error) => {
        if (active) setProjectsError(`Could not load your projects. ${error.message}`);
      })
      .finally(() => active && setLoadingProjects(false));
    api<Resume[]>(RESUMES_API)
      .then((rows) => active && setResumes(rows))
      .catch(() => {
        /* the resume library just stays empty; project errors are already shown */
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill)
        ? current.filter((value) => value !== skill)
        : [...current, skill],
    );
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (generating) return;
    if (!roleDescription.trim()) {
      setNotice("Describe the role you want to target first.");
      return;
    }
    if (!selectedSkills.length) {
      setNotice("Choose at least one skill to emphasize.");
      return;
    }
    setGenerating(true);
    setNotice("");
    try {
      const created = await generateResume(roleDescription.trim(), selectedSkills);
      setResumes((current) => [created, ...current]);
      setActiveResumeId(created.id);
      setNotice("Your tailored resume draft is ready and saved to your resume library.");
    } catch (error) {
      setNotice(`Could not generate your resume. ${(error as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectTitle.trim() || !projectDescription.trim()) {
      setProjectError("Add a project title and description to continue.");
      return;
    }
    setSavingProject(true);
    setProjectError("");
    try {
      const created = await postProject({
        title: projectTitle.trim(),
        course: projectCourse.trim() || "Personal",
        semester: "Fall 2026",
        description: projectDescription.trim(),
        skills: projectSkills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        source: "Personal",
      });
      setProjects((current) => [created, ...current]);
      setProjectsError("");
      setProjectTitle("");
      setProjectDescription("");
      setProjectCourse("");
      setProjectSkills("");
      setModal(null);
      setNotice("Project added to your library.");
    } catch (error) {
      setProjectError(`Could not save your project. ${(error as Error).message}`);
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await deleteProject(id);
      setProjects((current) => current.filter((project) => project.id !== id));
      setProjectsError("");
      setNotice("Project removed from your library.");
    } catch (error) {
      setProjectsError(`Could not delete that project. ${(error as Error).message}`);
    }
  };

  const handleImport = async () => {
    const existing = new Set(projects.map((project) => project.title));
    const pending = canvasProjects.filter(
      (project) => project.source === "Canvas" && !existing.has(project.title),
    );
    if (!pending.length) {
      setNotice("Your Canvas coursework is already up to date.");
      setModal(null);
      return;
    }
    try {
      const imported: Project[] = [];
      for (const project of pending) imported.push(await postProject(project));
      setProjects((current) => [...imported, ...current]);
      setModal(null);
      setNotice(`${imported.length} Canvas project${imported.length > 1 ? "s" : ""} imported.`);
    } catch (error) {
      setProjectsError(`Could not import Canvas projects. ${(error as Error).message}`);
    }
  };

  const toggleCanvasFlag = async () => {
    const canvasProject = canvasProjects[0];
    const saved = projects.find((project) => project.title === canvasProject.title);
    try {
      if (saved) {
        await deleteProject(saved.id);
        setProjects((current) => current.filter((project) => project.id !== saved.id));
      } else {
        const created = await postProject(canvasProject);
        setProjects((current) => [created, ...current]);
      }
    } catch (error) {
      setProjectsError(`Could not update your Canvas projects. ${(error as Error).message}`);
    }
  };

  const logout = () => {
    window.localStorage.removeItem("resumegptUsername");
    window.localStorage.removeItem(PROFILE_KEY);
    setUsername("");
    setProfile(null);
    setNotice("You have been logged out of this demo.");
    setAuthMode("login");
  };

  if (authMode) {
    return (
      <AuthPage
        mode={authMode}
        onChangeMode={setAuthMode}
        onAuthenticated={(name, newProfile) => {
          window.localStorage.setItem("resumegptUsername", name);
          // Plain login has no profile details, so the profile cards stay empty.
          if (newProfile) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
          else window.localStorage.removeItem(PROFILE_KEY);
          setUsername(name);
          setProfile(newProfile);
          setAuthMode(null);
          setSection("Profile");
        }}
      />
    );
  }

  if (section === "Canvas") {
    const canvasProject = canvasProjects[0];
    const isFlagged = projects.some((project) => project.title === canvasProject.title);
    return (
      <CanvasPage
        flagged={isFlagged}
        onToggleFlag={() => void toggleCanvasFlag()}
        onViewProjects={() => setSection("Projects")}
        onReturn={() => setSection("Profile")}
      />
    );
  }

  return (
    <div className={`app-shell ${section === "Profile" ? "" : "secondary-page"}`}>
      <header className="topbar">
        <button className="brand" onClick={() => setSection("Profile")} aria-label="ResumeGPT home">
          <span className="brand-mark">R</span>
          <span>ResumeGPT</span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          {(["Profile", "Resume", "Projects"] as const).map((item) => (
            <button
              aria-current={section === item ? "page" : undefined}
              className={`nav-item ${section === item ? "active" : ""}`}
              key={item}
              onClick={() => {
                setSection(item);
                setNotice("");
              }}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="extension-badge" onClick={() => setSection("Canvas")}>Test-Canvas-Extension</button>
          <button className="logout-button" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="page-content">
        {projectsError && (
          <p aria-live="polite" className="auth-feedback error">
            {projectsError}
          </p>
        )}
        {section === "Profile" && (
          <ProfilePage
            username={username || "there"}
            profile={profile}
            resumes={resumes}
            projects={projects}
            onNavigate={setSection}
            onOpenResume={(id) => {
              setActiveResumeId(id);
              setSection("Resume");
            }}
            notice={notice}
            onDismissNotice={() => setNotice("")}
          />
        )}

        {section === "Resume" && (
          <ResumePage
            profile={profile}
            skillOptions={skillOptions}
            selectedSkills={selectedSkills}
            generating={generating}
            activeResume={resumes.find((resume) => resume.id === activeResumeId) ?? null}
            onNewDraft={() => {
              setRoleDescription("");
              setActiveResumeId(null);
            }}
            onToggleSkill={toggleSkill}
            roleDescription={roleDescription}
            onRoleChange={setRoleDescription}
            onSubmit={handleGenerate}
            notice={notice}
            onDismissNotice={() => setNotice("")}
          />
        )}

        {section === "Projects" && (
          <ProjectsPage
            projects={filteredProjects}
            allProjects={projects}
            query={query}
            onQueryChange={setQuery}
            courseFilter={courseFilter}
            onCourseChange={setCourseFilter}
            semesterFilter={semesterFilter}
            onSemesterChange={setSemesterFilter}
            skillFilter={skillFilter}
            onSkillChange={setSkillFilter}
            onAdd={() => {
              setNotice("");
              setProjectError("");
              setModal("project");
            }}
            onImport={() => {
              setNotice("");
              setModal("import");
            }}
            onDelete={(id) => void handleDeleteProject(id)}
            loading={loadingProjects}
            notice={notice}
            onDismissNotice={() => setNotice("")}
          />
        )}
      </main>

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <section aria-labelledby="modal-heading" aria-modal="true" className="dialog" role="dialog">
            <button className="dialog-close" onClick={() => setModal(null)} aria-label="Close dialog">×</button>
            {modal === "project" ? (
              <>
                <p className="eyebrow">PERSONAL EXPERIENCE</p>
                <h2 id="modal-heading">Add a project</h2>
                <p className="muted-copy">Save a project to use in your next resume.</p>
                <form className="project-form" onSubmit={handleAddProject}>
                  <label>
                    Project name
                    <input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} placeholder="e.g. Portfolio website" />
                  </label>
                  <label>
                    Description
                    <textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} placeholder="What did you build or accomplish?" rows={3} />
                  </label>
                  <label>
                    Course or category
                    <input value={projectCourse} onChange={(event) => setProjectCourse(event.target.value)} placeholder="e.g. ITSC 3155 or Personal" />
                  </label>
                  <label>
                    Skills <span className="label-hint">Separate with commas</span>
                    <input value={projectSkills} onChange={(event) => setProjectSkills(event.target.value)} placeholder="React, Testing, Leadership" />
                  </label>
                  {projectError && <p aria-live="polite" className="auth-feedback error">{projectError}</p>}
                  <button className="primary-button" type="submit" disabled={savingProject}>
                    {savingProject ? "Saving…" : "Save project"} <span aria-hidden="true">→</span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="eyebrow">CANVAS INTEGRATION</p>
                <h2 id="modal-heading">Import coursework</h2>
                <p className="muted-copy">Sync coursework projects from your connected Canvas account into your experience library.</p>
                <div className="canvas-notice"><span className="status-dot" /> Canvas connection ready</div>
                <div className="dialog-actions">
                  <button className="secondary-button" onClick={() => setModal(null)}>Cancel</button>
                  <button className="primary-button" onClick={handleImport}>Import projects <span aria-hidden="true">→</span></button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/** Count of distinct skills across projects, ignoring case ("Python" and "PYTHON" count once). */
const countSkills = (projects: Project[]) =>
  new Set(projects.flatMap((project) => project.skills.map((skill) => skill.toLowerCase()))).size;

/** Large serif numbers with gold dividers; fills the right side of the page heroes. */
function HeroStats({ stats }: { stats: { label: string; value: number }[] }) {
  return (
    <dl className="hero-stats">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

function CanvasPage({
  flagged,
  onToggleFlag,
  onViewProjects,
  onReturn,
}: {
  flagged: boolean;
  onToggleFlag: () => void;
  onViewProjects: () => void;
  onReturn: () => void;
}) {
  return (
    <main className="canvas-demo">
      <header className="canvas-topbar">
        <button className="canvas-menu" aria-label="Open course menu">☰</button>
        <div className="canvas-crumbs">
          <strong>ITSC 3155 - 001</strong><span>›</span><strong>Assignments</strong><span>›</span><span>Programming Assignment 4</span>
        </div>
        <button className="canvas-student">Student View</button>
      </header>
      <div className="canvas-layout">
        <nav className="canvas-rail" aria-label="Canvas global navigation">
          <div className="canvas-flower" aria-hidden="true">✿</div>
          <button><span>♙</span>Account</button>
          <button><span>▦</span>Dashboard</button>
          <button className="rail-selected"><span>◇</span>Courses</button>
          <button><span>▣</span>Calendar</button>
          <button><span>▱</span>Inbox</button>
          <button><span>ⓘ</span>Help</button>
        </nav>
        <nav className="canvas-course-nav" aria-label="Course navigation">
          {["Home", "Announcements", "Syllabus", "Modules", "Assignments", "Discussions", "Grades", "People", "Pages", "Files", "Quizzes", "Collaborations"].map((item) => (
            <button className={item === "Assignments" ? "course-selected" : ""} key={item}>{item}</button>
          ))}
        </nav>
        <section className="canvas-assignment">
          <div className="canvas-assignment-title">
            <div><h1>Programming Assignment 4: REST API Client</h1><p>Due Friday by 11:59pm</p></div>
            <span className="published-state">✓ &nbsp;Published</span>
          </div>
          <div className="canvas-details">
            <span><strong>Points</strong> 100</span>
            <span><strong>Submitting</strong> a file upload</span>
            <span><strong>File types</strong> zip</span>
          </div>
          <section className="assignment-copy">
            <h2>Overview</h2>
            <p>In this assignment, you will build a command-line application that retrieves data from a public REST API, validates the response, and presents useful results to the user. Your program should demonstrate clean module design, asynchronous programming, and thoughtful error handling.</p>
            <div className="learning-callout"><strong>Learning objectives</strong><span>Practice API integration, JSON data processing, input validation, testing, and technical documentation.</span></div>
            <h2>Requirements</h2>
            <ol>
              <li>Create a Node.js project using JavaScript or TypeScript. Keep API logic, formatting, and user input in separate modules.</li>
              <li>Accept a city name from the command line and request current conditions from the provided weather API endpoint.</li>
              <li>Display the city, temperature, conditions, humidity, and the time the result was retrieved.</li>
              <li>Handle missing input, unsuccessful requests, rate limits, and incomplete response data without crashing.</li>
              <li>Write at least five automated tests covering successful and unsuccessful requests.</li>
            </ol>
            <h2>Starter files</h2>
            <button className="starter-file"><span className="file-icon">▯</span><span><strong>pa4-starter.zip</strong><small>Starter repository and sample API response</small></span></button>
            <h2>Submission</h2>
            <p>Submit one ZIP file containing your source code, tests, <code>package.json</code>, and a README with setup instructions. Do not include <code>node_modules</code> or API keys.</p>
          </section>
          <button className="canvas-return" onClick={onReturn}>← Return to ResumeGPT</button>
        </section>
        <aside className="canvas-submit">
          <button>Submit Assignment</button>
          <a href="#rubric">▫ &nbsp; View Rubric</a>
          <a href="#submission">▫ &nbsp; Show By Type</a>
          <hr />
          <h2>Submission</h2>
          <strong>Not Submitted!</strong>
          <p>No submission has been made.</p>
        </aside>
      </div>
      <aside className="extension-card" aria-label="ResumeGPT Canvas extension">
        <div className="extension-heading"><span className="brand-mark">R</span><span><strong>ResumeGPT</strong><small>Chrome extension test</small></span></div>
        <p>Save this assignment as a project and use it when building your next resume.</p>
        <button className={`flag-button ${flagged ? "flagged" : ""}`} onClick={onToggleFlag}>
          {flagged ? "Flagged for ResumeGPT" : "Flag for ResumeGPT"}
        </button>
        {flagged && (
          <div className="extension-saved">
            This assignment is already in your project library.
            <button onClick={onViewProjects}>View Projects</button>
          </div>
        )}
      </aside>
    </main>
  );
}

function AuthPage({
  mode,
  onChangeMode,
  onAuthenticated,
}: {
  mode: AuthMode;
  onChangeMode: (mode: AuthMode) => void;
  onAuthenticated: (username: string, profile: StudentProfile | null) => void;
}) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isCreate = mode === "create";

  const switchMode = (next: AuthMode) => {
    onChangeMode(next);
    setError("");
    setMessage("");
    setConfirmPassword("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const name = username.trim();
    if (!name) {
      setError("Enter your username to continue.");
      return;
    }
    if (password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }
    if (isCreate && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    if (!isCreate) {
      onAuthenticated(name, null);
      return;
    }
    const year = graduationYear.trim();
    if (!fullName.trim() || !major.trim()) {
      setError("Enter your full name and major.");
      return;
    }
    const thisYear = new Date().getFullYear();
    if (!/^\d{4}$/.test(year) || Number(year) < thisYear - 10 || Number(year) > thisYear + 10) {
      setError("Enter your graduation year as four digits, for example 2027.");
      return;
    }
    onAuthenticated(name, { fullName: fullName.trim(), major: major.trim(), graduationYear: year });
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="story-orbit story-orbit-one" />
        <div className="story-orbit story-orbit-two" />
        <button className="brand auth-brand" aria-label="ResumeGPT">
          <span className="brand-mark">R</span><span>ResumeGPT</span>
        </button>
        <div className="story-copy">
          <Eyebrow>YOUR EXPERIENCE, CLEARLY TOLD</Eyebrow>
          <h1>Make every<br />word earn its<br />place.</h1>
          <p>Turn your experience into a focused resume built for the role you want next.</p>
        </div>
        <p className="story-footer">Thoughtful writing. Professional results.</p>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <p className="auth-welcome">{isCreate ? "Start building" : "Welcome back"}</p>
          <h2>{isCreate ? "Create your account" : "Log in to your account"}</h2>
          <p className="auth-subtitle">
            {isCreate
              ? "Create an account and start your first resume."
              : "Continue where you left off."}
          </p>
          <form className="auth-form" onSubmit={submit} noValidate>
            {isCreate && (
              <>
                <label htmlFor="auth-full-name">Full name</label>
                <input
                  autoComplete="name"
                  id="auth-full-name"
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  value={fullName}
                />
                <label htmlFor="auth-major">Major</label>
                <input
                  id="auth-major"
                  onChange={(event) => setMajor(event.target.value)}
                  placeholder="e.g. Computer Science"
                  value={major}
                />
                <label htmlFor="auth-graduation-year">Graduation year</label>
                <input
                  id="auth-graduation-year"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) => setGraduationYear(event.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 2027"
                  value={graduationYear}
                />
              </>
            )}
            <label htmlFor="auth-username">Username</label>
            <input
              autoComplete="username"
              id="auth-username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              value={username}
            />
            <div className="auth-password-label">
              <label htmlFor="auth-password">Password</label>
              {!isCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMessage(
                      username.trim()
                        ? `Recovery instructions are ready for ${username.trim()}.`
                        : "Enter your username first, then request recovery instructions.",
                    );
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="auth-password-field">
              <input
                autoComplete={isCreate ? "new-password" : "current-password"}
                id="auth-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {isCreate && (
              <>
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  autoComplete="new-password"
                  id="confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password again"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                />
              </>
            )}
            {(error || message) && (
              <p aria-live="polite" className={`auth-feedback ${error ? "error" : ""}`}>
                {error || message}
              </p>
            )}
            <button className="primary-button auth-submit" type="submit">
              {isCreate ? "Create account" : "Log in"}
            </button>
          </form>
          <p className="auth-switch">
            {isCreate ? "Already have an account?" : "New to ResumeGPT?"}{" "}
            <button onClick={() => switchMode(isCreate ? "login" : "create")}>
              {isCreate ? "Log in" : "Create account"}
            </button>
          </p>
          <p className="privacy-copy">
            Your profile name may be shared with ResumeGPT. Never submit passwords you use elsewhere.{" "}
            <button onClick={() => setMessage("Your login details stay in this demo and are not sent anywhere.")}>
              Learn how we handle your data
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2>{title}</h2>
      </div>
      {action && <button className="text-action" onClick={onAction}>{action} <span aria-hidden="true">→</span></button>}
    </div>
  );
}

function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div aria-live="polite" className="notice">
      <span>{message}</span>
      <button aria-label="Dismiss message" onClick={onDismiss}>×</button>
    </div>
  );
}

function ProfilePage({
  username,
  profile,
  resumes,
  projects,
  onNavigate,
  onOpenResume,
  notice,
  onDismissNotice,
}: {
  username: string;
  profile: StudentProfile | null;
  resumes: Resume[];
  projects: Project[];
  onNavigate: (section: Section) => void;
  onOpenResume: (id: number) => void;
  notice: string;
  onDismissNotice: () => void;
}) {
  return (
    <>
      <div className="profile-hero">
        <div>
          <Eyebrow>STUDENT WORKSPACE</Eyebrow>
          <h1>Welcome back,<br />{username}.</h1>
          <p>Keep your experience current and your next application ready.</p>
        </div>
        <HeroStats
          stats={[
            { label: "Resumes", value: resumes.length },
            { label: "Projects", value: projects.length },
            { label: "Skills", value: countSkills(projects) },
          ]}
        />
      </div>
      <Notice message={notice} onDismiss={onDismissNotice} />
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="surface-card recent-card">
            <SectionHeading eyebrow="RESUME LIBRARY" title="Recent resumes" action="View all" onAction={() => onNavigate("Resume")} />
            <div className="resume-list">
              {resumes.slice(0, 3).map((resume, index) => (
                <button className="resume-row" key={resume.id} onClick={() => onOpenResume(resume.id)}>
                  <span className="resume-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="resume-info"><strong>{resume.title}</strong><small>Created {resume.date}</small></span>
                  <span className="row-action">Open</span>
                </button>
              ))}
              {!resumes.length && <p className="muted-copy">No resumes yet. Generate one in the Resume tab.</p>}
            </div>
          </section>
          <section className="surface-card recent-card projects-preview">
            <SectionHeading eyebrow="SYNCED COURSEWORK" title="Recent projects" action="View all" onAction={() => onNavigate("Projects")} />
            <div className="resume-list">
              {projects.slice(0, 2).map((project) => (
                <button className="resume-row" key={project.id} onClick={() => onNavigate("Projects")}>
                  <span className="resume-number"><span className="tiny-dot" /></span>
                  <span className="resume-info"><strong>{project.title}</strong><small>{project.course} &nbsp;·&nbsp; {project.semester}</small></span>
                  <span className="row-action">Open</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <aside className="profile-card">
          <div className="avatar"><span /></div>
          <Eyebrow>YOUR PROFILE</Eyebrow>
          <h2>{profile?.fullName ?? username}</h2>
          {profile && (
            <dl>
              <div><dt>Major</dt><dd>{profile.major}</dd></div>
              <div><dt>Graduation</dt><dd>{profile.graduationYear}</dd></div>
            </dl>
          )}
          <p className="profile-footnote">ResumeGPT syncs coursework to turn your experience into a stronger resume.</p>
        </aside>
      </div>
    </>
  );
}

function ResumePage({
  profile,
  skillOptions,
  selectedSkills,
  generating,
  activeResume,
  onNewDraft,
  onToggleSkill,
  roleDescription,
  onRoleChange,
  onSubmit,
  notice,
  onDismissNotice,
}: {
  profile: StudentProfile | null;
  skillOptions: string[];
  selectedSkills: string[];
  generating: boolean;
  activeResume: Resume | null;
  onNewDraft: () => void;
  onToggleSkill: (skill: string) => void;
  roleDescription: string;
  onRoleChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  notice: string;
  onDismissNotice: () => void;
}) {
  return (
    <>
      <div className="resume-hero">
        <div><Eyebrow>AI RESUME STUDIO</Eyebrow><h1>Build a resume that<br />sounds like you.</h1></div>
        <p>Tell ResumeGPT about the role you want, choose the skills to highlight, and get a tailored first draft.</p>
      </div>
      <Notice message={notice} onDismiss={onDismissNotice} />
      <div className="resume-studio">
        <aside className="skills-panel">
          <div><Eyebrow>YOUR PROFILE</Eyebrow><h2>Choose skills</h2><p>Select the strengths you want ResumeGPT to emphasize.</p></div>
          <div className="skill-list">
            {skillOptions.map((skill) => (
              <button
                aria-pressed={selectedSkills.includes(skill)}
                className={`skill-option ${selectedSkills.includes(skill) ? "selected" : ""}`}
                key={skill}
                onClick={() => onToggleSkill(skill)}
              >
                {skill}<span className="checkbox" />
              </button>
            ))}
          </div>
          {profile && (
            <div className="student-mini">
              <span className="mini-avatar">{initialsOf(profile.fullName)}</span>
              <span><strong>{profile.fullName}</strong><small>{profile.major} · {profile.graduationYear}</small></span>
            </div>
          )}
        </aside>
        <section className="chat-panel">
          <header className="chat-header">
            <div className="assistant-id"><span className="brand-mark">R</span><span><strong>ResumeGPT</strong><small><i className="status-dot" /> {generating ? "Drafting your resume..." : "Ready to help"}</small></span></div>
            <button className="secondary-button compact" onClick={onNewDraft}>New draft</button>
          </header>
          <div className="conversation">
            <div className="assistant-message">
              <span className="brand-mark small">R</span>
              <div><strong>ResumeGPT</strong><p>What kind of role are you applying for? Share the job, company, or experience you want your resume to emphasize.</p>
                <div className="suggestions">
                  {["Software engineering internship", "Entry-level data analyst", "Highlight project leadership"].map((suggestion) => (
                    <button key={suggestion} onClick={() => onRoleChange(suggestion)}>{suggestion}</button>
                  ))}
                </div>
              </div>
            </div>
            {generating && (
              <div className="assistant-message" aria-live="polite">
                <span className="brand-mark small">R</span>
                <div><strong>ResumeGPT</strong><p>Reading your projects that use {selectedSkills.join(", ")} and drafting bullets...</p></div>
              </div>
            )}
            {!generating && activeResume && (
              activeResume.content ? (
                <ResumeDraft resume={activeResume} content={activeResume.content} />
              ) : (
                <div className="assistant-message">
                  <span className="brand-mark small">R</span>
                  <div><strong>ResumeGPT</strong><p>"{activeResume.title}" was created before AI drafting, so there is no draft to show. Generate a new one below.</p></div>
                </div>
              )
            )}
          </div>
          <form className="composer" onSubmit={onSubmit}>
            <textarea aria-label="Describe your target role" onChange={(event) => onRoleChange(event.target.value)} placeholder="Describe the role you want to target..." rows={3} value={roleDescription} />
            <div className="composer-footer"><span>{selectedSkills.length} skills selected</span><button className="primary-button" disabled={generating} type="submit">{generating ? "Generating..." : <>Generate resume <span aria-hidden="true">→</span></>}</button></div>
          </form>
        </section>
      </div>
    </>
  );
}

function ResumeDraft({ resume, content }: { resume: Resume; content: ResumeContent }) {
  const [copied, setCopied] = useState(false);
  const plainText = [
    "SKILLS",
    content.skills.join(" · "),
    "",
    "PROJECTS",
    ...content.projects.flatMap((project) => [
      `${project.title} | ${project.course} | ${project.semester}`,
      ...project.bullets.map((bullet) => `• ${bullet}`),
      "",
    ]),
  ].join("\n");
  const copy = () => {
    navigator.clipboard
      .writeText(plainText)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <article className="resume-draft" aria-label={resume.title}>
      <header className="resume-draft-header">
        <div><h2>{resume.title}</h2><small>For: {content.targetRole} · {resume.date}</small></div>
        <button className="secondary-button compact" onClick={copy} type="button">{copied ? "Copied" : "Copy text"}</button>
      </header>
      <section>
        <h3>Skills</h3>
        <div className="tag-list">{content.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
      </section>
      <section>
        <h3>Projects</h3>
        {content.projects.map((project) => (
          <div className="resume-draft-project" key={project.projectId}>
            <div className="resume-draft-project-heading"><strong>{project.title}</strong><small>{project.course} · {project.semester}</small></div>
            <ul>{project.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          </div>
        ))}
      </section>
    </article>
  );
}

function ProjectsPage({
  projects,
  allProjects,
  query,
  onQueryChange,
  courseFilter,
  onCourseChange,
  semesterFilter,
  onSemesterChange,
  skillFilter,
  onSkillChange,
  onAdd,
  onImport,
  onDelete,
  loading,
  notice,
  onDismissNotice,
}: {
  projects: Project[];
  allProjects: Project[];
  query: string;
  onQueryChange: (value: string) => void;
  courseFilter: string;
  onCourseChange: (value: string) => void;
  semesterFilter: string;
  onSemesterChange: (value: string) => void;
  skillFilter: string;
  onSkillChange: (value: string) => void;
  onAdd: () => void;
  onImport: () => void;
  onDelete: (id: number) => void;
  loading: boolean;
  notice: string;
  onDismissNotice: () => void;
}) {
  const courses = [...new Set(allProjects.map((project) => project.course))];
  const semesters = [...new Set(allProjects.map((project) => project.semester))];
  // One dropdown entry per skill, ignoring case (first spelling seen wins).
  const skillsByKey = new Map<string, string>();
  for (const skill of allProjects.flatMap((project) => project.skills)) {
    if (!skillsByKey.has(skill.toLowerCase())) skillsByKey.set(skill.toLowerCase(), skill);
  }
  const skills = [...skillsByKey.values()];
  return (
    <>
      <div className="projects-hero">
        <div><Eyebrow>EXPERIENCE LIBRARY</Eyebrow><h1>Your work,<br />ready to use.</h1><p>Keep coursework and personal projects organized so ResumeGPT<br className="desktop-break" /> can turn your experience into stronger resume bullets.</p></div>
        <div className="hero-side">
          <HeroStats
            stats={[
              { label: "Projects", value: allProjects.length },
              { label: "Courses", value: courses.length },
              { label: "Skills", value: skills.length },
            ]}
          />
          <div className="hero-actions"><button className="secondary-button" onClick={onImport}>Import from Canvas</button><button className="primary-button" onClick={onAdd}><span aria-hidden="true">＋</span> Add project</button></div>
        </div>
      </div>
      <Notice message={notice} onDismiss={onDismissNotice} />
      <section className="surface-card library-card">
        <SectionHeading eyebrow="SAVED EXPERIENCE" title="Project library" />
        <div className="library-count">{projects.length} {projects.length === 1 ? "project" : "projects"}</div>
        <div className="filter-bar">
          <label className="search-field"><span aria-hidden="true" className="search-icon" /><input aria-label="Search projects or skills" onChange={(event) => onQueryChange(event.target.value)} placeholder="Search projects or skills" value={query} /></label>
          <label className="filter-select"><span>COURSE</span><select aria-label="Filter by course" onChange={(event) => onCourseChange(event.target.value)} value={courseFilter}><option>All courses</option>{courses.map((course) => <option key={course}>{course}</option>)}</select></label>
          <label className="filter-select"><span>SEMESTER</span><select aria-label="Filter by semester" onChange={(event) => onSemesterChange(event.target.value)} value={semesterFilter}><option>All semesters</option>{semesters.map((semester) => <option key={semester}>{semester}</option>)}</select></label>
          <label className="filter-select"><span>SKILL</span><select aria-label="Filter by skill" onChange={(event) => onSkillChange(event.target.value)} value={skillFilter}><option>All skills</option>{skills.map((skill) => <option key={skill}>{skill}</option>)}</select></label>
        </div>
        {loading ? (
          <p className="muted-copy">Loading your projects…</p>
        ) : projects.length ? (
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-meta"><span><i className="status-dot" />{project.source === "Canvas" ? "CANVAS SYNC" : "PERSONAL PROJECT"}</span><button aria-label={`Delete ${project.title}`} onClick={() => onDelete(project.id)}>Delete</button></div>
                <h3>{project.title}</h3>
                <p className="project-course">{project.course} <span>·</span> {project.semester}</p>
                <p className="project-description">{project.description}</p>
                <div className="tag-list">{project.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><span className="empty-icon">⌕</span><h3>No projects found</h3><p>Try changing your filters or add a new project to your library.</p><button className="secondary-button" onClick={() => { onQueryChange(""); onCourseChange("All courses"); onSemesterChange("All semesters"); onSkillChange("All skills"); }}>Clear filters</button></div>
        )}
      </section>
    </>
  );
}

export default App;
