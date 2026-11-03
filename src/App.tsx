import { FormEvent, useMemo, useState } from "react";

type Project = {
  id: number;
  title: string;
  course: string;
  semester: string;
  description: string;
  skills: string[];
  source: "Canvas" | "Personal";
};

type Resume = {
  id: number;
  title: string;
  date: string;
};

type Section = "Profile" | "Resume" | "Projects" | "Canvas";
type AuthMode = "login" | "create";

const initialProjects: Project[] = [
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

const initialResumes: Resume[] = [
  { id: 1, title: "Software Engineer Resume v2", date: "October 4, 2026" },
  { id: 2, title: "Full-Stack Developer Resume", date: "September 28, 2026" },
  {
    id: 3,
    title: "Data Structures & Algorithms Resume",
    date: "September 15, 2026",
  },
];

const skillOptions = [
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
  const [authMode, setAuthMode] = useState<AuthMode | null>(() =>
    window.localStorage.getItem("resumegptUsername") ? null : "login",
  );
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = window.localStorage.getItem("resumegptProjects");
      return saved ? (JSON.parse(saved) as Project[]) : initialProjects;
    } catch (error) {
      console.error("Could not load saved projects.", error);
      return initialProjects;
    }
  });
  const [resumes, setResumes] = useState<Resume[]>(initialResumes);
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
          (skillFilter === "All skills" || project.skills.includes(skillFilter))
        );
      }),
    [projects, query, courseFilter, semesterFilter, skillFilter],
  );

  const persistProjects = (next: Project[]) => {
    setProjects(next);
    window.localStorage.setItem("resumegptProjects", JSON.stringify(next));
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill)
        ? current.filter((value) => value !== skill)
        : [...current, skill],
    );
  };

  const handleGenerate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roleDescription.trim()) {
      setNotice("Describe the role you want to target first.");
      return;
    }
    if (!selectedSkills.length) {
      setNotice("Choose at least one skill to emphasize.");
      return;
    }
    const next: Resume = {
      id: Date.now(),
      title: `${roleDescription.trim().split("\n")[0].slice(0, 42)} Resume`,
      date: new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    };
    setResumes((current) => [next, ...current]);
    setNotice("Your tailored resume draft is ready in your resume library.");
    setSection("Profile");
  };

  const handleAddProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectTitle.trim() || !projectDescription.trim()) {
      setProjectError("Add a project title and description to continue.");
      return;
    }
    const next = [
      {
        id: Date.now(),
        title: projectTitle.trim(),
        course: projectCourse.trim() || "Personal",
        semester: "Fall 2026",
        description: projectDescription.trim(),
        skills: projectSkills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        source: "Personal" as const,
      },
      ...projects,
    ];
    persistProjects(next);
    setProjectTitle("");
    setProjectDescription("");
    setProjectCourse("");
    setProjectSkills("");
    setProjectError("");
    setModal(null);
    setNotice("Project added to your library.");
  };

  const handleImport = () => {
    const existing = new Set(projects.map((project) => project.title));
    const imported = initialProjects.filter(
      (project) => project.source === "Canvas" && !existing.has(project.title),
    );
    if (!imported.length) {
      setNotice("Your Canvas coursework is already up to date.");
      setModal(null);
      return;
    }
    persistProjects([...imported, ...projects]);
    setModal(null);
    setNotice(`${imported.length} Canvas project${imported.length > 1 ? "s" : ""} imported.`);
  };

  const logout = () => {
    window.localStorage.removeItem("resumegptUsername");
    setUsername("");
    setNotice("You have been logged out of this demo.");
    setAuthMode("login");
  };

  if (authMode) {
    return (
      <AuthPage
        mode={authMode}
        onChangeMode={setAuthMode}
        onAuthenticated={(name) => {
          window.localStorage.setItem("resumegptUsername", name);
          setUsername(name);
          setAuthMode(null);
          setSection("Profile");
        }}
      />
    );
  }

  if (section === "Canvas") {
    const canvasProject = initialProjects[0];
    const isFlagged = projects.some((project) => project.title === canvasProject.title);
    return (
      <CanvasPage
        flagged={isFlagged}
        onToggleFlag={() => {
          if (isFlagged) {
            persistProjects(projects.filter((project) => project.title !== canvasProject.title));
          } else {
            persistProjects([canvasProject, ...projects]);
          }
        }}
        onViewProjects={() => setSection("Projects")}
        onReturn={() => setSection("Profile")}
      />
    );
  }

  return (
    <div className="app-shell">
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
        {section === "Profile" && (
          <ProfilePage
            username={username || "there"}
            resumes={resumes}
            projects={projects}
            onNavigate={setSection}
            notice={notice}
            onDismissNotice={() => setNotice("")}
          />
        )}

        {section === "Resume" && (
          <ResumePage
            selectedSkills={selectedSkills}
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
            onDelete={(id) => {
              persistProjects(projects.filter((project) => project.id !== id));
              setNotice("Project removed from your library.");
            }}
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
                  <button className="primary-button" type="submit">Save project <span aria-hidden="true">→</span></button>
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
  onAuthenticated: (username: string) => void;
}) {
  const [username, setUsername] = useState("");
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
    onAuthenticated(name);
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
  resumes,
  projects,
  onNavigate,
  notice,
  onDismissNotice,
}: {
  username: string;
  resumes: Resume[];
  projects: Project[];
  onNavigate: (section: Section) => void;
  notice: string;
  onDismissNotice: () => void;
}) {
  return (
    <>
      <div className="profile-hero">
        <Eyebrow>STUDENT WORKSPACE</Eyebrow>
        <h1>Welcome back,<br />{username}.</h1>
        <p>Keep your experience current and your next application ready.</p>
      </div>
      <Notice message={notice} onDismiss={onDismissNotice} />
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="surface-card recent-card">
            <SectionHeading eyebrow="RESUME LIBRARY" title="Recent resumes" action="View all" onAction={() => onNavigate("Resume")} />
            <div className="resume-list">
              {resumes.slice(0, 3).map((resume, index) => (
                <button className="resume-row" key={resume.id} onClick={() => onNavigate("Resume")}>
                  <span className="resume-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="resume-info"><strong>{resume.title}</strong><small>Created {resume.date}</small></span>
                  <span className="row-action">Open</span>
                </button>
              ))}
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
          <h2>{username}</h2>
          <dl>
            <div><dt>School</dt><dd>UNC Charlotte</dd></div>
            <div><dt>Major</dt><dd>Computer Science</dd></div>
            <div><dt>Graduation</dt><dd>Spring 2027</dd></div>
          </dl>
          <p className="profile-footnote">ResumeGPT syncs coursework to turn your experience into a stronger resume.</p>
        </aside>
      </div>
    </>
  );
}

function ResumePage({
  selectedSkills,
  onToggleSkill,
  roleDescription,
  onRoleChange,
  onSubmit,
  notice,
  onDismissNotice,
}: {
  selectedSkills: string[];
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
          <div className="student-mini"><span className="mini-avatar">JB</span><span><strong>John Bob</strong><small>Computer Science · 2027</small></span></div>
        </aside>
        <section className="chat-panel">
          <header className="chat-header">
            <div className="assistant-id"><span className="brand-mark">R</span><span><strong>ResumeGPT</strong><small><i className="status-dot" /> Ready to help</small></span></div>
            <button className="secondary-button compact" onClick={() => onRoleChange("")}>New draft</button>
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
          </div>
          <form className="composer" onSubmit={onSubmit}>
            <textarea aria-label="Describe your target role" onChange={(event) => onRoleChange(event.target.value)} placeholder="Describe the role you want to target..." rows={3} value={roleDescription} />
            <div className="composer-footer"><span>{selectedSkills.length} skills selected</span><button className="primary-button" type="submit">Generate resume <span aria-hidden="true">→</span></button></div>
          </form>
        </section>
      </div>
    </>
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
  notice: string;
  onDismissNotice: () => void;
}) {
  const courses = [...new Set(allProjects.map((project) => project.course))];
  const semesters = [...new Set(allProjects.map((project) => project.semester))];
  const skills = [...new Set(allProjects.flatMap((project) => project.skills))];
  return (
    <>
      <div className="projects-hero">
        <div><Eyebrow>EXPERIENCE LIBRARY</Eyebrow><h1>Your work,<br />ready to use.</h1><p>Keep coursework and personal projects organized so ResumeGPT<br className="desktop-break" /> can turn your experience into stronger resume bullets.</p></div>
        <div className="hero-actions"><button className="secondary-button" onClick={onImport}>Import from Canvas</button><button className="primary-button" onClick={onAdd}><span aria-hidden="true">＋</span> Add project</button></div>
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
        {projects.length ? (
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
