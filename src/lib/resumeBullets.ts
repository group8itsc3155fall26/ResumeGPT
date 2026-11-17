import type { Project, ResumeBullet } from "../api";

/**
 * Deterministic stand-in for the LLM step: turns a stored project into one
 * action-oriented bullet, and keeps the course attribution attached so every
 * claim on a resume can be traced back to the assignment it came from.
 */

const VERBS = ["Developed", "Engineered", "Architected", "Implemented", "Designed", "Built"];

/** Stable verb choice so regenerating a draft does not reshuffle wording. */
function verbFor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return VERBS[Math.abs(hash) % VERBS.length];
}

/** Lowercases the first word only when it is a normal word, not an acronym like "REST". */
function lowerFirstWord(text: string): string {
  if (text.length < 2) return text.toLowerCase();
  const [, second] = text;
  return second === second.toUpperCase() ? text : text[0].toLowerCase() + text.slice(1);
}

const trimPeriod = (text: string) => text.trim().replace(/[.;]+$/, "");

export const sourceLabel = (project: Project) =>
  project.source === "Canvas"
    ? `${project.course} — ${project.title}`
    : `Personal — ${project.title}`;

export function generateBullet(project: Project): ResumeBullet {
  const verb = verbFor(project.title);
  const technologies = project.skills.slice(0, 3).join(", ");
  const outcome = project.highlight ? trimPeriod(project.highlight) : "";

  const text = outcome
    ? `${verb} ${project.title} using ${technologies}, ${outcome}.`
    : `${verb} ${project.title}${technologies ? ` using ${technologies}` : ""} — ${lowerFirstWord(
        trimPeriod(project.description),
      )}.`;

  return {
    id: `bullet-${project.id}`,
    text,
    source: sourceLabel(project),
    projectId: project.id,
  };
}

const draftTitle = (roleDescription: string) => {
  const firstLine = roleDescription.trim().split("\n")[0]?.trim() ?? "";
  if (!firstLine) return "Software Engineering Resume";
  const shortened = firstLine.length > 48 ? `${firstLine.slice(0, 48).trimEnd()}…` : firstLine;
  return `${shortened} Resume`;
};

/**
 * Ranks the student's projects by how many of their chosen skills they cover,
 * then drafts a reviewable resume. Nothing is saved until the student approves.
 */
export function buildDraft(
  projects: Project[],
  selectedSkills: string[],
  roleDescription: string,
): { title: string; bullets: ResumeBullet[] } {
  const wanted = new Set(selectedSkills.map((skill) => skill.toLowerCase()));
  const ranked = [...projects]
    .map((project) => ({
      project,
      score: project.skills.filter((skill) => wanted.has(skill.toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score || b.project.id - a.project.id)
    .slice(0, 6)
    .map(({ project }) => project);

  return {
    title: draftTitle(roleDescription),
    bullets: ranked.map(generateBullet),
  };
}
