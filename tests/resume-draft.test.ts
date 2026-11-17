import { expect, it } from "vitest";
import type { Project } from "../src/server/db";
import { AiError, selectProjects, toResumeContent } from "../src/server/resumeDraft";

const project = (id: number, title: string, skills: string[]): Project => ({
  id,
  title,
  course: "ITSC 3155",
  semester: "Fall 2026",
  description: `${title} description.`,
  skills,
  highlight: null,
  source: "Personal",
});

const api = project(1, "REST API Client", ["Python", "Testing"]);
const web = project(2, "Web App", ["React", "TypeScript", "python"]);
const db = project(3, "Database", ["SQL"]);

it("selects projects that use a selected skill, ignoring case, best matches first", () => {
  expect(selectProjects([api, web, db], ["PYTHON", "react"]).map((p) => p.id)).toEqual([2, 1]);
  expect(selectProjects([api, web, db], ["Leadership"])).toEqual([]);
});

it("keeps only real projects and allowed skills from the AI response", () => {
  const { title, content } = toResumeContent(
    {
      title: "Software Intern Resume",
      skills: ["python", "Kubernetes", "React"],
      projects: [
        { projectId: 2, bullets: ["Built a React app."] },
        { projectId: 99, bullets: ["Invented project."] },
        { projectId: 2, bullets: ["Duplicate."] },
      ],
    },
    "Software intern",
    ["Python"],
    [api, web],
  );

  expect(title).toBe("Software Intern Resume");
  expect(content.projects).toEqual([
    { projectId: 2, title: "Web App", course: "ITSC 3155", semester: "Fall 2026", bullets: ["Built a React app."] },
  ]);
  expect(content.skills).toEqual(["Python", "React"]);
});

it("rejects an AI response with no usable projects", () => {
  expect(() => toResumeContent({ projects: [] }, "Role", ["Python"], [api])).toThrow(AiError);
});
