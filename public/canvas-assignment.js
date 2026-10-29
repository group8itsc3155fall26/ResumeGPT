const PROJECTS_KEY = "resumegpt-projects";
const AGREEMENT_KEY = "resumegpt-project-storage-agreement";
const PROJECT_ID = "canvas-extension-rest-api-client";

const flagButton = document.querySelector("#flag-project");
const message = document.querySelector("#extension-message");

const assignmentProject = {
  id: PROJECT_ID,
  title: "Programming Assignment 4: REST API Client",
  course: "ITSC 3155",
  semester: "Fall 2026",
  description:
    "Built a command-line REST API client that validates responses, handles request failures, and presents weather data clearly.",
  role: "Software developer",
  technologies: ["Node.js", "TypeScript", "REST API"],
  skills: ["API Integration", "JSON Processing", "Testing", "Error Handling"],
  links: [],
  file: null,
  source: "Canvas sync",
};

function readProjects() {
  const storedProjects = window.localStorage.getItem(PROJECTS_KEY);
  if (!storedProjects) {
    return [];
  }

  const parsedProjects = JSON.parse(storedProjects);
  if (!Array.isArray(parsedProjects)) {
    throw new Error("The saved project library is not valid.");
  }
  return parsedProjects;
}

function showMessage(text, type = "success", includeProjectLink = false) {
  message.replaceChildren(document.createTextNode(text));
  message.className = `extension-message${type === "error" ? " error" : ""}`;

  if (includeProjectLink) {
    message.append(document.createTextNode(" "));
    const link = document.createElement("a");
    link.href = "/project-library.html";
    link.textContent = "View Projects";
    message.append(link);
  }

  message.hidden = false;
}

function updateExistingState() {
  try {
    const projects = readProjects();
    if (projects.some((project) => project.id === PROJECT_ID)) {
      flagButton.textContent = "Flagged for ResumeGPT";
      flagButton.disabled = true;
      showMessage(
        "This assignment is already in your project library.",
        "success",
        true,
      );
    }
  } catch {
    showMessage(
      "ResumeGPT could not read your project library. Open Projects to repair your saved data.",
      "error",
      true,
    );
  }
}

flagButton.addEventListener("click", () => {
  if (window.localStorage.getItem(AGREEMENT_KEY) !== "accepted") {
    showMessage(
      "Accept the project storage agreement in ResumeGPT before flagging assignments.",
      "error",
      true,
    );
    return;
  }

  try {
    const projects = readProjects();
    if (projects.some((project) => project.id === PROJECT_ID)) {
      updateExistingState();
      return;
    }

    window.localStorage.setItem(
      PROJECTS_KEY,
      JSON.stringify([assignmentProject, ...projects]),
    );
    flagButton.textContent = "Flagged for ResumeGPT";
    flagButton.disabled = true;
    showMessage(
      "Project added successfully. Grades were not imported.",
      "success",
      true,
    );
    window.setTimeout(() => {
      window.location.assign(
        `/project-library.html?project=${encodeURIComponent(PROJECT_ID)}`,
      );
    }, 600);
  } catch {
    showMessage(
      "The project could not be saved. Check browser storage and try again.",
      "error",
    );
  }
});

updateExistingState();
