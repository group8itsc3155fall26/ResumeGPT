import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  CLASS_STANDINGS,
  SESSION_KEY,
  addProject,
  addResume,
  createStudentProfile,
  demoLogin,
  editResume,
  fetchStudent,
  listProjects,
  listResumes,
  loginStudent,
  removeProject,
  removeResume,
  setActiveStudent,
  type ClassStanding,
  type Project,
  type Resume,
  type ResumeBullet,
  type Student,
} from "./api";
import {
  assignmentToProject,
  flagshipAssignment,
  mockCanvasCourses,
  type CanvasCourse,
} from "./data/canvasCatalog";
import { buildDraft } from "./lib/resumeBullets";

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
type Modal = "project" | "canvas" | null;
type Draft = {
  mode: "create" | "edit";
  id: number | null;
  title: string;
  bullets: ResumeBullet[];
};

const DEFAULT_SKILLS = ["React", "TypeScript", "Java", "SQL", "Communication", "Leadership"];

function App() {
  const [section, setSection] = useState<Section>("Profile");
  const [student, setStudent] = useState<Student | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [notice, setNotice] = useState("");

  const [modal, setModal] = useState<Modal>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCourse, setProjectCourse] = useState("");
  const [projectSkills, setProjectSkills] = useState("");
  const [projectError, setProjectError] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  const [canvasCourse, setCanvasCourse] = useState(mockCanvasCourses[0].code);
  const [canvasSelection, setCanvasSelection] = useState<string[]>([]);
  const [canvasError, setCanvasError] = useState("");
  const [importingCanvas, setImportingCanvas] = useState(false);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);

  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("All courses");
  const [semesterFilter, setSemesterFilter] = useState("All semesters");
  const [skillFilter, setSkillFilter] = useState("All skills");
  const [selectedSkills, setSelectedSkills] = useState(["React", "TypeScript"]);
  const [roleDescription, setRoleDescription] = useState("");

  // Restore the prototype session, then confirm it still exists on the server.
  useEffect(() => {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) {
      setAuthMode("login");
      setSessionChecked(true);
      return;
    }
    let stored: Student | null = null;
    try {
      stored = JSON.parse(raw) as Student;
    } catch {
      stored = null;
    }
    if (!stored?.id) {
      window.localStorage.removeItem(SESSION_KEY);
      setAuthMode("login");
      setSessionChecked(true);
      return;
    }
    setActiveStudent(stored.id);
    fetchStudent()
      .then((profile) => setStudent(profile))
      .catch(() => {
        window.localStorage.removeItem(SESSION_KEY);
        setActiveStudent(null);
        setAuthMode("login");
      })
      .finally(() => setSessionChecked(true));
  }, []);

  useEffect(() => {
    if (!student) return;
    let active = true;
    setLoadingWorkspace(true);
    Promise.all([listProjects(), listResumes()])
      .then(([projectRows, resumeRows]) => {
        if (!active) return;
        setProjects(projectRows);
        setResumes(resumeRows);
        setWorkspaceError("");
      })
      .catch((error: Error) => {
        if (active) setWorkspaceError(`Could not load your workspace. ${error.message}`);
      })
      .finally(() => active && setLoadingWorkspace(false));
    return () => {
      active = false;
    };
  }, [student]);

  const availableSkills = useMemo(() => {
    const unique = [...new Set(projects.flatMap((project) => project.skills))];
    return unique.length ? unique.slice(0, 12) : DEFAULT_SKILLS;
  }, [projects]);

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
          (semesterFilter === "All semesters" || project.semester === semesterFilter) &&
          (skillFilter === "All skills" || project.skills.includes(skillFilter))
        );
      }),
    [projects, query, courseFilter, semesterFilter, skillFilter],
  );

  const handleAuthenticated = (profile: Student) => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    setActiveStudent(profile.id);
    setStudent(profile);
    setAuthMode(null);
    setSection("Profile");
    setNotice(`Signed in as ${profile.name}.`);
  };

  const logout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setActiveStudent(null);
    setStudent(null);
    setProjects([]);
    setResumes([]);
    setNotice("");
    setAuthMode("login");
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill) ? current.filter((value) => value !== skill) : [...current, skill],
    );
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projects.length) {
      setNotice("Import Canvas coursework or add a project before generating a resume.");
      return;
    }
    if (!roleDescription.trim()) {
      setNotice("Describe the role you want to target first.");
      return;
    }
    if (!selectedSkills.length) {
      setNotice("Choose at least one skill to emphasize.");
      return;
    }
    const generated = buildDraft(projects, selectedSkills, roleDescription);
    setDraft({ mode: "create", id: null, ...generated });
    setDraftError("");
    setNotice("");
  };

  const openResume = (resume: Resume) => {
    setDraft({ mode: "edit", id: resume.id, title: resume.title, bullets: resume.bullets });
    setDraftError("");
  };

  const updateBullet = (id: string, text: string) => {
    setDraft((current) =>
      current
        ? { ...current, bullets: current.bullets.map((bullet) => (bullet.id === id ? { ...bullet, text } : bullet)) }
        : current,
    );
  };

  const removeBullet = (id: string) => {
    setDraft((current) =>
      current ? { ...current, bullets: current.bullets.filter((bullet) => bullet.id !== id) } : current,
    );
  };

  const saveDraft = async () => {
    if (!draft) return;
    const bullets = draft.bullets
      .filter((bullet) => bullet.text.trim())
      .map((bullet) => ({ ...bullet, text: bullet.text.trim() }));
    if (!draft.title.trim()) {
      setDraftError("Give the resume a title before saving.");
      return;
    }
    if (!bullets.length) {
      setDraftError("Keep at least one bullet in the resume.");
      return;
    }
    setSavingDraft(true);
    setDraftError("");
    try {
      if (draft.mode === "edit" && draft.id !== null) {
        const updated = await editResume(draft.id, { title: draft.title.trim(), bullets });
        setResumes((current) => current.map((resume) => (resume.id === updated.id ? updated : resume)));
        setNotice("Resume updated.");
      } else {
        const created = await addResume({ title: draft.title.trim(), bullets });
        setResumes((current) => [created, ...current]);
        setNotice("Resume saved to your library.");
      }
      setDraft(null);
    } catch (error) {
      setDraftError(`Could not save that resume. ${(error as Error).message}`);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDeleteResume = async (id: number) => {
    try {
      await removeResume(id);
      setResumes((current) => current.filter((resume) => resume.id !== id));
      setNotice("Resume deleted.");
    } catch (error) {
      setWorkspaceError(`Could not delete that resume. ${(error as Error).message}`);
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
      const created = await addProject({
        title: projectTitle.trim(),
        course: projectCourse.trim() || "Personal",
        semester: "Fall 2026",
        description: projectDescription.trim(),
        skills: projectSkills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        highlight: null,
        source: "Personal",
      });
      setProjects((current) => [created, ...current]);
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
      await removeProject(id);
      setProjects((current) => current.filter((project) => project.id !== id));
      setNotice("Project removed from your library.");
    } catch (error) {
      setWorkspaceError(`Could not delete that project. ${(error as Error).message}`);
    }
  };

  const openCanvasImport = () => {
    setCanvasCourse(mockCanvasCourses[0].code);
    setCanvasSelection([]);
    setCanvasError("");
    setModal("canvas");
  };

  const toggleAssignment = (id: string) => {
    setCanvasSelection((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const selectedCourse: CanvasCourse =
    mockCanvasCourses.find((course) => course.code === canvasCourse) ?? mockCanvasCourses[0];
  const importedTitles = new Set(projects.map((project) => project.title));

  const handleImport = async () => {
    const assignments = selectedCourse.assignments.filter(
      (assignment) => canvasSelection.includes(assignment.id) && !importedTitles.has(assignment.title),
    );
    if (!assignments.length) {
      setCanvasError("Select at least one assignment that is not already in your library.");
      return;
    }
    setImportingCanvas(true);
    setCanvasError("");
    try {
      const imported: Project[] = [];
      for (const assignment of assignments) {
        imported.push(await addProject(assignmentToProject(assignment)));
      }
      setProjects((current) => [...imported, ...current]);
      setCanvasSelection([]);
      setModal(null);
      setNotice(`${imported.length} Canvas assignment${imported.length > 1 ? "s" : ""} imported.`);
    } catch (error) {
      setCanvasError(`Could not import those assignments. ${(error as Error).message}`);
    } finally {
      setImportingCanvas(false);
    }
  };

  const toggleCanvasFlag = async () => {
    const saved = projects.find((project) => project.title === flagshipAssignment.title);
    try {
      if (saved) {
        await removeProject(saved.id);
        setProjects((current) => current.filter((project) => project.id !== saved.id));
        setNotice("Removed from your project library.");
      } else {
        const created = await addProject(assignmentToProject(flagshipAssignment));
        setProjects((current) => [created, ...current]);
        setNotice("Saved to your project library.");
      }
    } catch (error) {
      setWorkspaceError(`Could not update your project library. ${(error as Error).message}`);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="app-shell">
        <main className="page-content">
          <p className="muted-copy">Loading your workspace…</p>
        </main>
      </div>
    );
  }

  if (authMode) {
    return <AuthPage mode={authMode} onChangeMode={setAuthMode} onAuthenticated={handleAuthenticated} />;
  }

  if (!student) {
    return <AuthPage mode="login" onChangeMode={setAuthMode} onAuthenticated={handleAuthenticated} />;
  }

  if (section === "Canvas") {
    const isFlagged = projects.some((project) => project.title === flagshipAssignment.title);
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
          <button className="extension-badge" onClick={() => setSection("Canvas")}>
            Test-Canvas-Extension
          </button>
          <button className="logout-button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="page-content">
        {workspaceError && (
          <p aria-live="polite" className="auth-feedback error">
            {workspaceError}
          </p>
        )}

        {section === "Profile" && (
          <ProfilePage
            student={student}
            resumes={resumes}
            projects={projects}
            loading={loadingWorkspace}
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
            availableSkills={availableSkills}
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
            resumes={resumes}
            loadingResumes={loadingWorkspace}
            onOpenResume={openResume}
            onDeleteResume={(id) => void handleDeleteResume(id)}
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
            onImport={openCanvasImport}
            onDelete={(id) => void handleDeleteProject(id)}
            loading={loadingWorkspace}
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
            <button className="dialog-close" onClick={() => setModal(null)} aria-label="Close dialog">
              ×
            </button>
            {modal === "project" ? (
              <>
                <p className="eyebrow">PERSONAL EXPERIENCE</p>
                <h2 id="modal-heading">Add a project</h2>
                <p className="muted-copy">Save a project to use in your next resume.</p>
                <form className="project-form" onSubmit={handleAddProject}>
                  <label>
                    Project name
                    <input
                      value={projectTitle}
                      onChange={(event) => setProjectTitle(event.target.value)}
                      placeholder="e.g. Portfolio website"
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={projectDescription}
                      onChange={(event) => setProjectDescription(event.target.value)}
                      placeholder="What did you build or accomplish?"
                      rows={3}
                    />
                  </label>
                  <label>
                    Course or category
                    <input
                      value={projectCourse}
                      onChange={(event) => setProjectCourse(event.target.value)}
                      placeholder="e.g. ITSC 3155 or Personal"
                    />
                  </label>
                  <label>
                    Skills <span className="label-hint">Separate with commas</span>
                    <input
                      value={projectSkills}
                      onChange={(event) => setProjectSkills(event.target.value)}
                      placeholder="React, Testing, Leadership"
                    />
                  </label>
                  {projectError && (
                    <p aria-live="polite" className="auth-feedback error">
                      {projectError}
                    </p>
                  )}
                  <button className="primary-button" type="submit" disabled={savingProject}>
                    {savingProject ? "Saving…" : "Save project"} <span aria-hidden="true">→</span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="eyebrow">CANVAS INTEGRATION · MOCKED</p>
                <h2 id="modal-heading">Import coursework</h2>
                <p className="muted-copy">
                  Choose a course, then pick the assignments to turn into portfolio projects. This
                  build ships a realistic mock catalog instead of live Canvas calls.
                </p>
                <div className="course-tabs" role="tablist" aria-label="Canvas courses">
                  {mockCanvasCourses.map((course) => (
                    <button
                      aria-pressed={course.code === selectedCourse.code}
                      className={`course-tab ${course.code === selectedCourse.code ? "selected" : ""}`}
                      key={course.code}
                      onClick={() => {
                        setCanvasCourse(course.code);
                        setCanvasSelection([]);
                        setCanvasError("");
                      }}
                      role="tab"
                    >
                      {course.code}
                    </button>
                  ))}
                </div>
                <p className="course-caption">
                  {selectedCourse.name} · {selectedCourse.semester} · {selectedCourse.instructor}
                </p>
                <div className="assignment-list">
                  {selectedCourse.assignments.map((assignment) => {
                    const alreadyImported = importedTitles.has(assignment.title);
                    const selected = canvasSelection.includes(assignment.id);
                    return (
                      <label
                        className={`assignment-option ${selected ? "selected" : ""} ${
                          alreadyImported ? "imported" : ""
                        }`}
                        key={assignment.id}
                      >
                        <input
                          checked={selected || alreadyImported}
                          disabled={alreadyImported}
                          onChange={() => toggleAssignment(assignment.id)}
                          type="checkbox"
                        />
                        <span className="assignment-body">
                          <strong>{assignment.title}</strong>
                          <small>
                            {assignment.points} pts · {assignment.submission.type} · due {assignment.dueDate}
                          </small>
                          <span className="tag-list">
                            {assignment.skills.slice(0, 3).map((skill) => (
                              <span className="tag" key={skill}>
                                {skill}
                              </span>
                            ))}
                            {alreadyImported && <span className="tag imported-tag">In library</span>}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {canvasError && (
                  <p aria-live="polite" className="auth-feedback error">
                    {canvasError}
                  </p>
                )}
                <div className="dialog-actions">
                  <button className="secondary-button" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                  <button className="primary-button" onClick={() => void handleImport()} disabled={importingCanvas}>
                    {importingCanvas
                      ? "Importing…"
                      : `Import ${canvasSelection.length || ""} assignment${
                          canvasSelection.length === 1 ? "" : "s"
                        }`}{" "}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {draft && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDraft(null);
          }}
        >
          <section aria-labelledby="draft-heading" aria-modal="true" className="dialog wide" role="dialog">
            <button className="dialog-close" onClick={() => setDraft(null)} aria-label="Close dialog">
              ×
            </button>
            <p className="eyebrow">
              {draft.mode === "create" ? "DRAFT REVIEW · AI ANALYSIS" : "SAVED RESUME"}
            </p>
            <h2 id="draft-heading">
              {draft.mode === "create" ? "Review your bullets" : "Edit resume"}
            </h2>
            <p className="muted-copy">
              Every bullet keeps the coursework it came from. Edit the wording, drop anything that
              overstates your work, then save.
            </p>
            <div className="project-form">
              <label>
                Resume title
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, title: event.target.value } : current))
                  }
                />
              </label>
              <div className="bullet-editor">
                {draft.bullets.length ? (
                  draft.bullets.map((bullet) => (
                    <div className="bullet-row" key={bullet.id}>
                      <span className="source-badge">Source: {bullet.source}</span>
                      <textarea
                        aria-label={`Bullet for ${bullet.source}`}
                        onChange={(event) => updateBullet(bullet.id, event.target.value)}
                        rows={3}
                        value={bullet.text}
                      />
                      <button className="bullet-remove" onClick={() => removeBullet(bullet.id)} type="button">
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="muted-copy">No bullets left. Cancel and generate a new draft.</p>
                )}
              </div>
              {draftError && (
                <p aria-live="polite" className="auth-feedback error">
                  {draftError}
                </p>
              )}
              <button
                className="primary-button"
                disabled={savingDraft}
                onClick={() => void saveDraft()}
                type="button"
              >
                {savingDraft ? "Saving…" : draft.mode === "create" ? "Approve & save resume" : "Save changes"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AuthPage({
  mode,
  onChangeMode,
  onAuthenticated,
}: {
  mode: AuthMode;
  onChangeMode: (mode: AuthMode) => void;
  onAuthenticated: (student: Student) => void;
}) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [major, setMajor] = useState("Computer Science");
  const [college, setCollege] = useState("UNC Charlotte");
  const [classStanding, setClassStanding] = useState<ClassStanding>("Freshman");
  const [graduationYear, setGraduationYear] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"login" | "create" | "demo" | null>(null);
  const isCreate = mode === "create";

  const switchMode = (next: AuthMode) => {
    onChangeMode(next);
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(isCreate ? "create" : "login");
    try {
      const student = isCreate
        ? await createStudentProfile({
            username,
            name,
            major,
            college,
            classStanding,
            graduationYear: graduationYear ? Number(graduationYear) : null,
          })
        : await loginStudent(username);
      onAuthenticated(student);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const signInAsDemo = async () => {
    setError("");
    setBusy("demo");
    try {
      onAuthenticated(await demoLogin());
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="story-orbit story-orbit-one" />
        <div className="story-orbit story-orbit-two" />
        <button className="brand auth-brand" aria-label="ResumeGPT">
          <span className="brand-mark">R</span>
          <span>ResumeGPT</span>
        </button>
        <div className="story-copy">
          <p className="eyebrow">YOUR EXPERIENCE, CLEARLY TOLD</p>
          <h1>
            Make every
            <br />
            word earn its
            <br />
            place.
          </h1>
          <p>Turn the coursework you already did into a resume you can defend, line by line.</p>
        </div>
        <p className="story-footer">Thoughtful writing. Professional results.</p>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <p className="auth-welcome">{isCreate ? "Start building" : "Welcome back"}</p>
          <h2>{isCreate ? "Create your student profile" : "Log in to ResumeGPT"}</h2>
          <p className="auth-subtitle">
            {isCreate
              ? "Add your details once; they follow you to every resume."
              : "Use the username your profile was created with."}
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
              placeholder="e.g. jmoten"
              value={username}
            />
            {isCreate && (
              <>
                <label htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Jordan Moten"
                  value={name}
                />
                <div className="field-row">
                  <label htmlFor="auth-major">Major</label>
                  <label htmlFor="auth-college">College</label>
                </div>
                <div className="field-row">
                  <input
                    id="auth-major"
                    onChange={(event) => setMajor(event.target.value)}
                    value={major}
                  />
                  <input
                    id="auth-college"
                    onChange={(event) => setCollege(event.target.value)}
                    value={college}
                  />
                </div>
                <div className="field-row">
                  <label htmlFor="auth-standing">Class standing</label>
                  <label htmlFor="auth-year">Graduation year</label>
                </div>
                <div className="field-row">
                  <select
                    id="auth-standing"
                    onChange={(event) => setClassStanding(event.target.value as ClassStanding)}
                    value={classStanding}
                  >
                    {CLASS_STANDINGS.map((standing) => (
                      <option key={standing}>{standing}</option>
                    ))}
                  </select>
                  <input
                    id="auth-year"
                    inputMode="numeric"
                    onChange={(event) => setGraduationYear(event.target.value)}
                    placeholder="2027"
                    value={graduationYear}
                  />
                </div>
              </>
            )}
            {error && (
              <p aria-live="polite" className="auth-feedback error">
                {error}
              </p>
            )}
            <button className="primary-button auth-submit" disabled={busy !== null} type="submit">
              {busy === "create" ? "Creating…" : busy === "login" ? "Logging in…" : isCreate ? "Create profile" : "Log in"}
            </button>
          </form>
          <button
            className="secondary-button demo-button"
            disabled={busy !== null}
            onClick={() => void signInAsDemo()}
            type="button"
          >
            {busy === "demo" ? "Loading demo…" : "Continue as Demo Student"}
          </button>
          <p className="auth-switch">
            {isCreate ? "Already have a profile?" : "New to ResumeGPT?"}{" "}
            <button onClick={() => switchMode(isCreate ? "login" : "create")}>
              {isCreate ? "Log in" : "Create profile"}
            </button>
          </p>
          <p className="privacy-copy">
            Prototype sign-in: this build keeps a student id on your device, not a password. Never
            enter a password you use elsewhere.
          </p>
        </div>
      </section>
    </main>
  );
}

function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div aria-live="polite" className="notice">
      <span>{message}</span>
      <button aria-label="Dismiss message" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}

function ProfilePage({
  student,
  resumes,
  projects,
  loading,
  onNavigate,
  notice,
  onDismissNotice,
}: {
  student: Student;
  resumes: Resume[];
  projects: Project[];
  loading: boolean;
  onNavigate: (section: Section) => void;
  notice: string;
  onDismissNotice: () => void;
}) {
  return (
    <>
      <div className="profile-hero">
        <p className="eyebrow">STUDENT WORKSPACE</p>
        <h1>
          Welcome back,
          <br />
          {student.name.split(" ")[0]}.
        </h1>
        <p>Keep your experience current and your next application ready.</p>
      </div>
      <Notice message={notice} onDismiss={onDismissNotice} />
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="surface-card recent-card">
            <SectionHeading
              eyebrow="RESUME LIBRARY"
              title="Recent resumes"
              action="View all"
              onAction={() => onNavigate("Resume")}
            />
            <div className="resume-list">
              {loading ? (
                <p className="muted-copy">Loading your resumes…</p>
              ) : resumes.length ? (
                resumes.slice(0, 3).map((resume, index) => (
                  <button className="resume-row" key={resume.id} onClick={() => onNavigate("Resume")}>
                    <span className="resume-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="resume-info">
                      <strong>{resume.title}</strong>
                      <small>
                        Created {resume.date} · {resume.bullets.length} bullet
                        {resume.bullets.length === 1 ? "" : "s"}
                      </small>
                    </span>
                    <span className="row-action">Open</span>
                  </button>
                ))
              ) : (
                <p className="muted-copy">No saved resumes yet. Generate one from your projects.</p>
              )}
            </div>
          </section>
          <section className="surface-card recent-card projects-preview">
            <SectionHeading
              eyebrow="SYNCED COURSEWORK"
              title="Recent projects"
              action="View all"
              onAction={() => onNavigate("Projects")}
            />
            <div className="resume-list">
              {projects.slice(0, 2).map((project) => (
                <button className="resume-row" key={project.id} onClick={() => onNavigate("Projects")}>
                  <span className="resume-number">
                    <span className="tiny-dot" />
                  </span>
                  <span className="resume-info">
                    <strong>{project.title}</strong>
                    <small>
                      {project.course} &nbsp;·&nbsp; {project.semester}
                    </small>
                  </span>
                  <span className="row-action">Open</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <aside className="profile-card">
          <div className="avatar">
            <span />
          </div>
          <p className="eyebrow">YOUR PROFILE</p>
          <h2>{student.name}</h2>
          <dl>
            <div>
              <dt>College</dt>
              <dd>{student.college}</dd>
            </div>
            <div>
              <dt>Major</dt>
              <dd>{student.major}</dd>
            </div>
            <div>
              <dt>Standing</dt>
              <dd>{student.classStanding}</dd>
            </div>
            <div>
              <dt>Graduation</dt>
              <dd>{student.graduationYear ?? "Not set"}</dd>
            </div>
          </dl>
          <p className="profile-footnote">
            ResumeGPT syncs coursework to turn your experience into a stronger resume.
          </p>
        </aside>
      </div>
    </>
  );
}

function ResumePage({
  availableSkills,
  selectedSkills,
  onToggleSkill,
  roleDescription,
  onRoleChange,
  onSubmit,
  resumes,
  loadingResumes,
  onOpenResume,
  onDeleteResume,
  notice,
  onDismissNotice,
}: {
  availableSkills: string[];
  selectedSkills: string[];
  onToggleSkill: (skill: string) => void;
  roleDescription: string;
  onRoleChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  resumes: Resume[];
  loadingResumes: boolean;
  onOpenResume: (resume: Resume) => void;
  onDeleteResume: (id: number) => void;
  notice: string;
  onDismissNotice: () => void;
}) {
  return (
    <>
      <div className="resume-hero">
        <div>
          <p className="eyebrow">AI RESUME STUDIO</p>
          <h1>
            Build a resume that
            <br />
            sounds like you.
          </h1>
        </div>
        <p>
          Tell ResumeGPT about the role you want, choose the skills to highlight, and get a tailored
          first draft you can edit before saving.
        </p>
      </div>
      <Notice message={notice} onDismiss={onDismissNotice} />
      <div className="resume-studio">
        <aside className="skills-panel">
          <div>
            <p className="eyebrow">YOUR PROFILE</p>
            <h2>Choose skills</h2>
            <p>Select the strengths you want ResumeGPT to emphasize.</p>
          </div>
          <div className="skill-list">
            {availableSkills.map((skill) => (
              <button
                aria-pressed={selectedSkills.includes(skill)}
                className={`skill-option ${selectedSkills.includes(skill) ? "selected" : ""}`}
                key={skill}
                onClick={() => onToggleSkill(skill)}
              >
                {skill}
                <span className="checkbox" />
              </button>
            ))}
          </div>
        </aside>
        <section className="chat-panel">
          <header className="chat-header">
            <div className="assistant-id">
              <span className="brand-mark">R</span>
              <span>
                <strong>ResumeGPT</strong>
                <small>
                  <i className="status-dot" /> Ready to help
                </small>
              </span>
            </div>
            <button className="secondary-button compact" onClick={() => onRoleChange("")}>
              New draft
            </button>
          </header>
          <div className="conversation">
            <div className="assistant-message">
              <span className="brand-mark small">R</span>
              <div>
                <strong>ResumeGPT</strong>
                <p>
                  What kind of role are you applying for? I will pull from your saved coursework and
                  draft bullets you can review before they reach a resume.
                </p>
                <div className="suggestions">
                  {[
                    "Software engineering internship",
                    "Entry-level data analyst",
                    "Highlight project leadership",
                  ].map((suggestion) => (
                    <button key={suggestion} onClick={() => onRoleChange(suggestion)}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <form className="composer" onSubmit={onSubmit}>
            <textarea
              aria-label="Describe your target role"
              onChange={(event) => onRoleChange(event.target.value)}
              placeholder="Describe the role you want to target..."
              rows={3}
              value={roleDescription}
            />
            <div className="composer-footer">
              <span>{selectedSkills.length} skills selected</span>
              <button className="primary-button" type="submit">
                Generate resume <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="surface-card library-card resume-library">
        <SectionHeading eyebrow="SAVED RESUME" title="Resume library" />
        <div className="library-count">{resumes.length} saved</div>
        <div className="resume-list">
          {loadingResumes ? (
            <p className="muted-copy">Loading your resumes…</p>
          ) : resumes.length ? (
            resumes.map((resume, index) => (
              <div className="resume-row" key={resume.id}>
                <span className="resume-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="resume-info">
                  <strong>{resume.title}</strong>
                  <small>
                    Created {resume.date} · {resume.bullets.length} bullet
                    {resume.bullets.length === 1 ? "" : "s"}
                  </small>
                </span>
                <button className="row-action" onClick={() => onOpenResume(resume)}>
                  Edit
                </button>
                <button className="row-action destructive" onClick={() => onDeleteResume(resume.id)}>
                  Delete
                </button>
              </div>
            ))
          ) : (
            <p className="muted-copy">
              Nothing saved yet. Describe a target role above and generate your first draft.
            </p>
          )}
        </div>
      </section>
    </>
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
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-action" onClick={onAction}>
          {action} <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
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
        <div>
          <p className="eyebrow">EXPERIENCE LIBRARY</p>
          <h1>
            Your work,
            <br />
            ready to use.
          </h1>
          <p>
            Keep coursework and personal projects organized so ResumeGPT
            <br className="desktop-break" /> can turn your experience into stronger resume bullets.
          </p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" onClick={onImport}>
            Import from Canvas
          </button>
          <button className="primary-button" onClick={onAdd}>
            <span aria-hidden="true">＋</span> Add project
          </button>
        </div>
      </div>
      <Notice message={notice} onDismiss={onDismissNotice} />
      <section className="surface-card library-card">
        <SectionHeading eyebrow="SAVED EXPERIENCE" title="Project library" />
        <div className="library-count">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </div>
        <div className="filter-bar">
          <label className="search-field">
            <span aria-hidden="true" className="search-icon" />
            <input
              aria-label="Search projects or skills"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search projects or skills"
              value={query}
            />
          </label>
          <label className="filter-select">
            <span>COURSE</span>
            <select
              aria-label="Filter by course"
              onChange={(event) => onCourseChange(event.target.value)}
              value={courseFilter}
            >
              <option>All courses</option>
              {courses.map((course) => (
                <option key={course}>{course}</option>
              ))}
            </select>
          </label>
          <label className="filter-select">
            <span>SEMESTER</span>
            <select
              aria-label="Filter by semester"
              onChange={(event) => onSemesterChange(event.target.value)}
              value={semesterFilter}
            >
              <option>All semesters</option>
              {semesters.map((semester) => (
                <option key={semester}>{semester}</option>
              ))}
            </select>
          </label>
          <label className="filter-select">
            <span>SKILL</span>
            <select
              aria-label="Filter by skill"
              onChange={(event) => onSkillChange(event.target.value)}
              value={skillFilter}
            >
              <option>All skills</option>
              {skills.map((skill) => (
                <option key={skill}>{skill}</option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <p className="muted-copy">Loading your projects…</p>
        ) : projects.length ? (
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <div className="project-meta">
                  <span>
                    <i className="status-dot" />
                    {project.source === "Canvas" ? "CANVAS SYNC" : "PERSONAL PROJECT"}
                  </span>
                  <button aria-label={`Delete ${project.title}`} onClick={() => onDelete(project.id)}>
                    Delete
                  </button>
                </div>
                <h3>{project.title}</h3>
                <p className="project-course">
                  {project.course} <span>·</span> {project.semester}
                </p>
                <p className="project-description">{project.description}</p>
                <div className="tag-list">
                  {project.skills.map((skill) => (
                    <span className="tag" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">⌕</span>
            <h3>No projects found</h3>
            <p>Try changing your filters or add a new project to your library.</p>
            <button
              className="secondary-button"
              onClick={() => {
                onQueryChange("");
                onCourseChange("All courses");
                onSemesterChange("All semesters");
                onSkillChange("All skills");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </>
  );
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
  const assignment = flagshipAssignment;
  return (
    <main className="canvas-demo">
      <header className="canvas-topbar">
        <button className="canvas-menu" aria-label="Open course menu">
          ☰
        </button>
        <div className="canvas-crumbs">
          <strong>{assignment.course} - 001</strong>
          <span>›</span>
          <strong>Assignments</strong>
          <span>›</span>
          <span>{assignment.title}</span>
        </div>
        <button className="canvas-student">Student View</button>
      </header>
      <div className="canvas-layout">
        <nav className="canvas-rail" aria-label="Canvas global navigation">
          <div className="canvas-flower" aria-hidden="true">
            ✿
          </div>
          <button>
            <span>♙</span>Account
          </button>
          <button>
            <span>▦</span>Dashboard
          </button>
          <button className="rail-selected">
            <span>◇</span>Courses
          </button>
          <button>
            <span>▣</span>Calendar
          </button>
          <button>
            <span>▱</span>Inbox
          </button>
          <button>
            <span>ⓘ</span>Help
          </button>
        </nav>
        <nav className="canvas-course-nav" aria-label="Course navigation">
          {[
            "Home",
            "Announcements",
            "Syllabus",
            "Modules",
            "Assignments",
            "Discussions",
            "Grades",
            "People",
            "Pages",
            "Files",
            "Quizzes",
            "Collaborations",
          ].map((item) => (
            <button className={item === "Assignments" ? "course-selected" : ""} key={item}>
              {item}
            </button>
          ))}
        </nav>
        <section className="canvas-assignment">
          <div className="canvas-assignment-title">
            <div>
              <h1>{assignment.title}</h1>
              <p>Due {assignment.dueDate}</p>
            </div>
            <span className="published-state">✓ &nbsp;Published</span>
          </div>
          <div className="canvas-details">
            <span>
              <strong>Points</strong> {assignment.points}
            </span>
            <span>
              <strong>Submitting</strong> {assignment.submission.type}
            </span>
            <span>
              <strong>Course</strong> {assignment.courseName}
            </span>
          </div>
          <section className="assignment-copy">
            <h2>Overview</h2>
            <p>{assignment.description}</p>
            <div className="learning-callout">
              <strong>Skills this work can demonstrate</strong>
              <span>{assignment.skills.join(" · ")}</span>
            </div>
            <h2>Your submission</h2>
            <button className="starter-file">
              <span className="file-icon">▯</span>
              <span>
                <strong>{assignment.submission.detail}</strong>
                <small>
                  {assignment.submission.type} · submitted {assignment.submission.submittedAt}
                </small>
              </span>
            </button>
          </section>
          <button className="canvas-return" onClick={onReturn}>
            ← Return to ResumeGPT
          </button>
        </section>
        <aside className="canvas-submit">
          <button>Submit Assignment</button>
          <a href="#rubric">▫ &nbsp; View Rubric</a>
          <a href="#submission">▫ &nbsp; Show By Type</a>
          <hr />
          <h2>Submission</h2>
          <strong>Submitted</strong>
          <p>{assignment.submission.submittedAt}</p>
        </aside>
      </div>
      <aside className="extension-card" aria-label="ResumeGPT Canvas extension">
        <div className="extension-heading">
          <span className="brand-mark">R</span>
          <span>
            <strong>ResumeGPT</strong>
            <small>Chrome extension test</small>
          </span>
        </div>
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

export default App;
