const PROJECTS_KEY = "resumegpt-projects";
const AGREEMENT_KEY = "resumegpt-project-storage-agreement";
const MAX_FILE_SIZE = 1024 * 1024;

const starterProjects = [
  {
    id: "itsc-3155-web-app",
    title: "ITSC-3155 Web Application Project",
    course: "ITSC 3155",
    semester: "Fall 2026",
    description:
      "Designed and built a responsive web application with a student team, from early requirements through usability testing.",
    role: "Full-stack developer",
    technologies: ["React", "TypeScript", "Vite"],
    skills: ["React", "TypeScript", "Teamwork"],
    links: [],
    file: null,
    source: "Canvas sync",
  },
  {
    id: "database-management-system",
    title: "Database Management System",
    course: "ITSC 3160",
    semester: "Fall 2026",
    description:
      "Created a normalized relational database and documented queries for a semester-long data management project.",
    role: "Database developer",
    technologies: ["PostgreSQL", "SQL"],
    skills: ["SQL", "Data Modeling", "Documentation"],
    links: [],
    file: null,
    source: "Canvas sync",
  },
  {
    id: "operating-systems-simulator",
    title: "Operating Systems Simulator",
    course: "ITSC 3146",
    semester: "Fall 2026",
    description:
      "Implemented a simulator to explore process scheduling, memory allocation, and operating system performance.",
    role: "Software developer",
    technologies: ["Python", "Git"],
    skills: ["Python", "Algorithms", "Testing"],
    links: [],
    file: null,
    source: "Canvas sync",
  },
];

const canvasAssignments = [
  {
    id: "canvas-mobile-weather",
    title: "Mobile Weather Dashboard",
    course: "ITSC 3155",
    semester: "Fall 2026",
    description:
      "Built a responsive weather dashboard that retrieves and presents forecast data from a public API.",
    role: "Front-end developer",
    technologies: ["React", "REST API", "CSS"],
    skills: ["API Integration", "Responsive Design", "Testing"],
  },
  {
    id: "canvas-security-audit",
    title: "Application Security Audit",
    course: "ITIS 3200",
    semester: "Fall 2026",
    description:
      "Reviewed a sample web application for common security risks and documented recommended mitigations.",
    role: "Security analyst",
    technologies: ["OWASP", "Burp Suite"],
    skills: ["Security Analysis", "Technical Writing", "Risk Assessment"],
  },
  {
    id: "canvas-data-visualization",
    title: "Campus Data Visualization",
    course: "ITSC 2214",
    semester: "Spring 2026",
    description:
      "Analyzed a campus data set and communicated trends through an interactive visualization.",
    role: "Data analyst",
    technologies: ["Python", "Pandas", "Matplotlib"],
    skills: ["Data Analysis", "Visualization", "Communication"],
  },
];

const projectGrid = document.querySelector("#project-grid");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyCopy = document.querySelector("#empty-copy");
const emptyAction = document.querySelector("#empty-action");
const projectCount = document.querySelector("#project-count");
const searchInput = document.querySelector("#project-search");
const courseFilter = document.querySelector("#course-filter");
const semesterFilter = document.querySelector("#semester-filter");
const skillFilter = document.querySelector("#skill-filter");
const agreementDialog = document.querySelector("#agreement-dialog");
const agreementCheckbox = document.querySelector("#agreement-checkbox");
const acceptAgreement = document.querySelector("#accept-agreement");
const projectDialog = document.querySelector("#project-dialog");
const projectForm = document.querySelector("#project-form");
const projectFormTitle = document.querySelector("#project-form-title");
const projectFormMessage = document.querySelector("#project-form-message");
const saveProjectButton = document.querySelector("#save-project");
const openProjectForm = document.querySelector("#open-project-form");
const closeProjectForm = document.querySelector("#close-project-form");
const cancelProjectForm = document.querySelector("#cancel-project-form");
const selectedSkillsElement = document.querySelector("#selected-skills");
const customSkillInput = document.querySelector("#custom-skill");
const addCustomSkillButton = document.querySelector("#add-custom-skill");
const aiSuggestButton = document.querySelector("#ai-suggest-skills");
const aiSkillReview = document.querySelector("#ai-skill-review");
const aiSkillList = document.querySelector("#ai-skill-list");
const fileHelp = document.querySelector("#file-help");
const detailDialog = document.querySelector("#detail-dialog");
const closeDetail = document.querySelector("#close-detail");
const editProjectButton = document.querySelector("#edit-project");
const deleteProjectButton = document.querySelector("#delete-project");
const canvasDialog = document.querySelector("#canvas-dialog");
const openCanvasImport = document.querySelector("#open-canvas-import");
const closeCanvasImport = document.querySelector("#close-canvas-import");
const cancelCanvasImport = document.querySelector("#cancel-canvas-import");
const canvasList = document.querySelector("#canvas-list");
const canvasConsent = document.querySelector("#canvas-consent");
const canvasMessage = document.querySelector("#canvas-message");
const importCanvasButton = document.querySelector("#import-canvas-projects");
const toast = document.querySelector("#toast");

let editingProjectId = null;
let detailProjectId = null;
let selectedSkills = new Set();
let pendingAiSkills = new Set();
let toastTimer;

function normalizeProject(project) {
  return {
    id: project.id || `project-${Date.now()}`,
    title: project.title || "Untitled project",
    course: project.course || "Course not specified",
    semester: project.semester || "Semester not specified",
    description: project.description || "No description has been added yet.",
    role: project.role || "Role not specified",
    technologies: Array.isArray(project.technologies)
      ? project.technologies
      : [],
    skills: Array.isArray(project.skills) ? project.skills : [],
    links: Array.isArray(project.links) ? project.links : [],
    file: project.file || null,
    source: project.source || "Added manually",
  };
}

function loadProjects() {
  const savedProjects = window.localStorage.getItem(PROJECTS_KEY);

  if (savedProjects === null) {
    return starterProjects.map(normalizeProject);
  }

  try {
    const parsedProjects = JSON.parse(savedProjects);
    return Array.isArray(parsedProjects)
      ? parsedProjects.map(normalizeProject)
      : starterProjects.map(normalizeProject);
  } catch {
    return starterProjects.map(normalizeProject);
  }
}

let projects = loadProjects();

function showToast(message, type = "success") {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function showFormMessage(element, message, type = "error") {
  element.textContent = message;
  element.className = `form-message ${type}`;
  element.hidden = false;
}

function clearFormMessage(element) {
  element.hidden = true;
  element.textContent = "";
}

function commitProjects(nextProjects, successMessage, errorTarget) {
  try {
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(nextProjects));
    projects = nextProjects;
    updateFilters();
    renderProjects();
    showToast(successMessage);
    return true;
  } catch {
    const message =
      "Your project could not be saved. Check available browser storage and try again.";
    showToast(message, "error");
    if (errorTarget) {
      showFormMessage(errorTarget, message);
    }
    return false;
  }
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((first, second) =>
    first.localeCompare(second),
  );
}

function populateSelect(select, values) {
  const currentValue = select.value;

  while (select.options.length > 1) {
    select.remove(1);
  }

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });

  select.value = values.includes(currentValue) ? currentValue : "";
}

function updateFilters() {
  populateSelect(
    courseFilter,
    uniqueSorted(projects.map((project) => project.course)),
  );
  populateSelect(
    semesterFilter,
    uniqueSorted(projects.map((project) => project.semester)),
  );
  populateSelect(
    skillFilter,
    uniqueSorted(projects.flatMap((project) => project.skills)),
  );
}

function createSkillTag(skill) {
  const tag = document.createElement("span");
  tag.className = "skill-tag";
  tag.textContent = skill;
  return tag;
}

function confirmAndDelete(project) {
  const shouldDelete = window.confirm(
    `Delete "${project.title}"? This cannot be undone.`,
  );

  if (!shouldDelete) {
    return;
  }

  const nextProjects = projects.filter((item) => item.id !== project.id);
  if (commitProjects(nextProjects, `"${project.title}" was deleted.`)) {
    if (detailDialog.open) {
      detailDialog.close();
    }
  }
}

function createProjectCard(project) {
  const card = document.createElement("article");
  card.className = "project-card";

  const topline = document.createElement("div");
  topline.className = "card-topline";

  const source = document.createElement("span");
  source.className = `source-badge${project.source === "Added manually" ? " manual" : ""}`;
  source.textContent = project.source;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-project";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${project.title}`);
  deleteButton.addEventListener("click", () => confirmAndDelete(project));

  const title = document.createElement("h3");
  title.textContent = project.title;

  const meta = document.createElement("p");
  meta.className = "project-meta";
  const course = document.createElement("span");
  course.textContent = project.course;
  const semester = document.createElement("span");
  semester.textContent = project.semester;
  meta.append(course, semester);

  const description = document.createElement("p");
  description.className = "card-description";
  description.textContent = project.description;

  const skills = document.createElement("div");
  skills.className = "skill-tags";
  skills.setAttribute("aria-label", "Project skills");
  project.skills.slice(0, 4).forEach((skill) => skills.append(createSkillTag(skill)));

  const viewButton = document.createElement("button");
  viewButton.className = "view-project";
  viewButton.type = "button";
  viewButton.textContent = "View project";
  viewButton.addEventListener("click", () => openProjectDetails(project.id));

  topline.append(source, deleteButton);
  card.append(topline, title, meta, description, skills, viewButton);
  return card;
}

function getFilteredProjects() {
  const query = searchInput.value.trim().toLowerCase();

  return projects.filter((project) => {
    const searchableText = [
      project.title,
      project.course,
      project.semester,
      project.description,
      project.role,
      ...project.technologies,
      ...project.skills,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!query || searchableText.includes(query)) &&
      (!courseFilter.value || project.course === courseFilter.value) &&
      (!semesterFilter.value || project.semester === semesterFilter.value) &&
      (!skillFilter.value || project.skills.includes(skillFilter.value))
    );
  });
}

function clearFilters() {
  searchInput.value = "";
  courseFilter.value = "";
  semesterFilter.value = "";
  skillFilter.value = "";
  renderProjects();
}

function renderProjects() {
  const visibleProjects = getFilteredProjects();
  projectGrid.replaceChildren(
    ...visibleProjects.map((project) => createProjectCard(project)),
  );

  const visibleCount = visibleProjects.length;
  projectCount.textContent = `${visibleCount} ${visibleCount === 1 ? "project" : "projects"}`;
  emptyState.hidden = visibleCount > 0;
  projectGrid.hidden = visibleCount === 0;

  if (visibleCount === 0 && projects.length === 0) {
    emptyTitle.textContent = "Your project library is empty";
    emptyCopy.textContent =
      "Add coursework or a personal project to start building your experience library.";
    emptyAction.textContent = "Add your first project";
  } else if (visibleCount === 0) {
    emptyTitle.textContent = "No projects found";
    emptyCopy.textContent =
      "Try adjusting your search or filters to find a saved project.";
    emptyAction.textContent = "Clear filters";
  }
}

function addSelectedSkill(skill) {
  const cleanSkill = skill.trim();
  if (!cleanSkill) {
    return;
  }
  selectedSkills.add(cleanSkill);
  pendingAiSkills.delete(cleanSkill);
  renderSkillBuilder();
}

function renderSkillBuilder() {
  selectedSkillsElement.replaceChildren();
  selectedSkills.forEach((skill) => {
    const tag = document.createElement("span");
    tag.className = "selected-skill";
    tag.append(document.createTextNode(skill));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${skill}`);
    remove.addEventListener("click", () => {
      selectedSkills.delete(skill);
      renderSkillBuilder();
    });
    tag.append(remove);
    selectedSkillsElement.append(tag);
  });

  aiSkillList.replaceChildren();
  pendingAiSkills.forEach((skill) => {
    const row = document.createElement("div");
    row.className = "ai-skill-item";

    const label = document.createElement("span");
    label.textContent = skill;

    const actions = document.createElement("span");
    const accept = document.createElement("button");
    accept.type = "button";
    accept.textContent = "Accept";
    accept.addEventListener("click", () => addSelectedSkill(skill));

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "Dismiss";
    dismiss.addEventListener("click", () => {
      pendingAiSkills.delete(skill);
      renderSkillBuilder();
    });

    actions.append(accept, dismiss);
    row.append(label, actions);
    aiSkillList.append(row);
  });

  aiSkillReview.hidden = pendingAiSkills.size === 0;
}

function suggestSkills() {
  const content = [
    projectForm.elements.title.value,
    projectForm.elements.description.value,
    projectForm.elements.role.value,
    projectForm.elements.technologies.value,
  ]
    .join(" ")
    .toLowerCase();

  const suggestions = new Set();
  const keywordSkills = [
    [["react", "frontend", "front-end"], "UI Development"],
    [["python", "data", "sql"], "Data Analysis"],
    [["team", "collaborat"], "Collaboration"],
    [["lead", "manager"], "Leadership"],
    [["test", "quality"], "Quality Assurance"],
    [["api", "backend", "back-end"], "API Integration"],
    [["design", "user", "ux"], "User-Centered Design"],
    [["security", "audit"], "Security Analysis"],
  ];

  keywordSkills.forEach(([keywords, skill]) => {
    if (keywords.some((keyword) => content.includes(keyword))) {
      suggestions.add(skill);
    }
  });

  if (suggestions.size < 2) {
    suggestions.add("Problem Solving");
    suggestions.add("Technical Communication");
  }

  suggestions.forEach((skill) => {
    if (!selectedSkills.has(skill)) {
      pendingAiSkills.add(skill);
    }
  });
  renderSkillBuilder();
}

function resetProjectForm() {
  projectForm.reset();
  editingProjectId = null;
  selectedSkills = new Set();
  pendingAiSkills = new Set();
  projectFormTitle.textContent = "Add a project";
  saveProjectButton.textContent = "Save project";
  fileHelp.textContent = "Optional. Files up to 1 MB are saved in this browser.";
  clearFormMessage(projectFormMessage);
  renderSkillBuilder();
}

function openAddProjectDialog() {
  resetProjectForm();
  projectDialog.showModal();
  projectForm.elements.title.focus();
}

function openEditProjectDialog(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) {
    showToast("That project could not be found.", "error");
    return;
  }

  resetProjectForm();
  editingProjectId = project.id;
  projectFormTitle.textContent = "Edit project";
  saveProjectButton.textContent = "Save changes";
  projectForm.elements.title.value = project.title;
  projectForm.elements.course.value = project.course;
  projectForm.elements.semester.value = project.semester;
  projectForm.elements.description.value = project.description;
  projectForm.elements.role.value = project.role;
  projectForm.elements.technologies.value = project.technologies.join(", ");
  projectForm.elements.links.value = project.links.join(", ");
  selectedSkills = new Set(project.skills);
  if (project.file) {
    fileHelp.textContent = `Current file: ${project.file.name}. Choose another file to replace it.`;
  }
  renderSkillBuilder();
  projectDialog.showModal();
  projectForm.elements.title.focus();
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function openProjectDetails(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) {
    showToast("That project could not be found.", "error");
    return;
  }

  detailProjectId = project.id;
  document.querySelector("#detail-source").textContent = project.source;
  document.querySelector("#detail-title").textContent = project.title;
  document.querySelector("#detail-meta").textContent =
    `${project.course} · ${project.semester}`;
  document.querySelector("#detail-description").textContent =
    project.description;
  document.querySelector("#detail-role").textContent = project.role;
  document.querySelector("#detail-technologies").textContent =
    project.technologies.join(", ") || "Not specified";

  const detailSkills = document.querySelector("#detail-skills");
  detailSkills.replaceChildren(
    ...project.skills.map((skill) => createSkillTag(skill)),
  );

  const linksSection = document.querySelector("#detail-links-section");
  const linksElement = document.querySelector("#detail-links");
  linksElement.replaceChildren();
  project.links.forEach((link) => {
    const href = safeUrl(link);
    if (!href) {
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = link;
    linksElement.append(anchor);
  });
  linksSection.hidden = linksElement.children.length === 0;

  const fileSection = document.querySelector("#detail-file-section");
  const fileLink = document.querySelector("#detail-file");
  fileSection.hidden = !project.file;
  if (project.file) {
    fileLink.href = project.file.dataUrl;
    fileLink.download = project.file.name;
    fileLink.textContent = `${project.file.name} · ${formatFileSize(project.file.size)}`;
  }

  detailDialog.showModal();
}

function formatFileSize(bytes) {
  return bytes < 1024
    ? `${bytes} bytes`
    : `${Math.round(bytes / 1024)} KB`;
}

function readProjectFile(file) {
  if (!file) {
    return Promise.resolve(null);
  }
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error("Choose a file smaller than 1 MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result,
      });
    });
    reader.addEventListener("error", () => {
      reject(new Error("The selected file could not be read."));
    });
    reader.readAsDataURL(file);
  });
}

function renderCanvasAssignments() {
  canvasList.replaceChildren();
  canvasAssignments.forEach((assignment) => {
    const alreadyImported = projects.some((project) => project.id === assignment.id);
    const label = document.createElement("label");
    label.className = `canvas-assignment${alreadyImported ? " imported" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = assignment.id;
    checkbox.disabled = alreadyImported;
    checkbox.addEventListener("change", updateCanvasImportButton);

    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = assignment.title;
    const meta = document.createElement("small");
    meta.textContent = alreadyImported
      ? `${assignment.course} · Already imported`
      : `${assignment.course} · ${assignment.semester}`;
    copy.append(title, meta);
    label.append(checkbox, copy);
    canvasList.append(label);
  });
}

function updateCanvasImportButton() {
  const hasSelection = canvasList.querySelectorAll("input:checked").length > 0;
  importCanvasButton.disabled = !canvasConsent.checked || !hasSelection;
}

function openCanvasDialog() {
  canvasConsent.checked = false;
  clearFormMessage(canvasMessage);
  renderCanvasAssignments();
  updateCanvasImportButton();
  canvasDialog.showModal();
}

[searchInput, courseFilter, semesterFilter, skillFilter].forEach((control) => {
  control.addEventListener("input", renderProjects);
});

agreementCheckbox.addEventListener("change", () => {
  acceptAgreement.disabled = !agreementCheckbox.checked;
});

acceptAgreement.addEventListener("click", () => {
  try {
    window.localStorage.setItem(AGREEMENT_KEY, "accepted");
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    agreementDialog.close();
  } catch {
    window.alert(
      "Project storage could not be enabled. Check your browser storage settings and try again.",
    );
  }
});

agreementDialog.addEventListener("cancel", (event) => event.preventDefault());
openProjectForm.addEventListener("click", openAddProjectDialog);
closeProjectForm.addEventListener("click", () => projectDialog.close());
cancelProjectForm.addEventListener("click", () => projectDialog.close());

emptyAction.addEventListener("click", () => {
  if (projects.length === 0) {
    clearFilters();
    openAddProjectDialog();
    return;
  }
  clearFilters();
});

document.querySelectorAll("[data-skill-suggestion]").forEach((button) => {
  button.addEventListener("click", () => addSelectedSkill(button.dataset.skillSuggestion));
});

addCustomSkillButton.addEventListener("click", () => {
  addSelectedSkill(customSkillInput.value);
  customSkillInput.value = "";
  customSkillInput.focus();
});

customSkillInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCustomSkillButton.click();
  }
});

aiSuggestButton.addEventListener("click", suggestSkills);

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormMessage(projectFormMessage);

  if (pendingAiSkills.size > 0) {
    const message =
      "Accept or dismiss every AI-suggested skill before saving.";
    showFormMessage(projectFormMessage, message);
    showToast(message, "error");
    return;
  }

  if (selectedSkills.size === 0) {
    const message = "Add at least one skill before saving.";
    showFormMessage(projectFormMessage, message);
    showToast(message, "error");
    return;
  }

  saveProjectButton.disabled = true;
  saveProjectButton.textContent = "Saving...";

  try {
    const formData = new FormData(projectForm);
    const existingProject = projects.find(
      (project) => project.id === editingProjectId,
    );
    const selectedFile = projectForm.elements.projectFile.files[0];
    const uploadedFile = await readProjectFile(selectedFile);
    const project = normalizeProject({
      id: editingProjectId || `manual-${Date.now()}`,
      title: String(formData.get("title")).trim(),
      course: String(formData.get("course")).trim(),
      semester: String(formData.get("semester")).trim(),
      description: String(formData.get("description")).trim(),
      role: String(formData.get("role")).trim(),
      technologies: String(formData.get("technologies"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      skills: [...selectedSkills],
      links: String(formData.get("links"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      file: uploadedFile || existingProject?.file || null,
      source: existingProject?.source || "Added manually",
    });

    const isEditing = Boolean(editingProjectId);
    const nextProjects = isEditing
      ? projects.map((item) => (item.id === project.id ? project : item))
      : [project, ...projects];
    const message = isEditing
      ? `"${project.title}" was updated successfully.`
      : `"${project.title}" was saved successfully.`;

    if (commitProjects(nextProjects, message, projectFormMessage)) {
      projectDialog.close();
    }
  } catch (error) {
    const message = error.message || "The project could not be saved.";
    showFormMessage(projectFormMessage, message);
    showToast(message, "error");
  } finally {
    saveProjectButton.disabled = false;
    saveProjectButton.textContent = editingProjectId
      ? "Save changes"
      : "Save project";
  }
});

projectDialog.addEventListener("click", (event) => {
  if (event.target === projectDialog) {
    projectDialog.close();
  }
});

closeDetail.addEventListener("click", () => detailDialog.close());
editProjectButton.addEventListener("click", () => {
  detailDialog.close();
  openEditProjectDialog(detailProjectId);
});
deleteProjectButton.addEventListener("click", () => {
  const project = projects.find((item) => item.id === detailProjectId);
  if (project) {
    confirmAndDelete(project);
  }
});
detailDialog.addEventListener("click", (event) => {
  if (event.target === detailDialog) {
    detailDialog.close();
  }
});

openCanvasImport.addEventListener("click", openCanvasDialog);
closeCanvasImport.addEventListener("click", () => canvasDialog.close());
cancelCanvasImport.addEventListener("click", () => canvasDialog.close());
canvasConsent.addEventListener("change", updateCanvasImportButton);
canvasDialog.addEventListener("click", (event) => {
  if (event.target === canvasDialog) {
    canvasDialog.close();
  }
});

importCanvasButton.addEventListener("click", () => {
  clearFormMessage(canvasMessage);
  const selectedIds = [
    ...canvasList.querySelectorAll("input:checked"),
  ].map((input) => input.value);

  if (!canvasConsent.checked) {
    const message = "Give consent before importing Canvas assignments.";
    showFormMessage(canvasMessage, message);
    showToast(message, "error");
    return;
  }
  if (selectedIds.length === 0) {
    const message = "Choose at least one assignment to import.";
    showFormMessage(canvasMessage, message);
    showToast(message, "error");
    return;
  }

  const importedProjects = canvasAssignments
    .filter((assignment) => selectedIds.includes(assignment.id))
    .map((assignment) =>
      normalizeProject({
        ...assignment,
        links: [],
        file: null,
        source: "Canvas sync",
      }),
    );

  const nextProjects = [...importedProjects, ...projects];
  const count = importedProjects.length;
  if (
    commitProjects(
      nextProjects,
      `${count} Canvas ${count === 1 ? "assignment was" : "assignments were"} imported successfully. Grades were not imported.`,
      canvasMessage,
    )
  ) {
    canvasDialog.close();
  }
});

updateFilters();
renderProjects();

if (window.localStorage.getItem(AGREEMENT_KEY) !== "accepted") {
  agreementDialog.showModal();
} else {
  const highlightedProjectId = new URLSearchParams(
    window.location.search,
  ).get("project");

  if (highlightedProjectId) {
    clearFilters();
    openProjectDetails(highlightedProjectId);
    window.history.replaceState({}, "", "/project-library.html");
  }
}
