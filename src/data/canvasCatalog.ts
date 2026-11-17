/**
 * Mock Canvas catalog used by the "Import from Canvas" flow.
 * Realistic CS coursework so the rest of the app can be built and demoed
 * without live Canvas API calls. Swapping this for a Canvas client later
 * means mapping its JSON onto CanvasAssignment.
 */

export type CanvasAssignment = {
  id: string;
  title: string;
  course: string;
  courseName: string;
  semester: string;
  points: number;
  dueDate: string;
  submission: { type: string; detail: string; submittedAt: string };
  /** What the professor asked for — the same text a Canvas assignment description returns. */
  description: string;
  skills: string[];
  /** What the student actually produced, phrased to slot into a resume bullet. */
  highlight: string;
};

export type CanvasCourse = {
  code: string;
  name: string;
  semester: string;
  instructor: string;
  assignments: CanvasAssignment[];
};

export const mockCanvasCourses: CanvasCourse[] = [
  {
    code: "ITSC 3155",
    name: "Software Engineering",
    semester: "Fall 2026",
    instructor: "Dr. Priya Raman",
    assignments: [
      {
        id: "itsc3155-sprint",
        title: "Team Sprint Project — ResumeGPT Web App",
        course: "ITSC 3155",
        courseName: "Software Engineering",
        semester: "Fall 2026",
        points: 250,
        dueDate: "Nov 12, 2026",
        submission: {
          type: "GitHub repository",
          detail: "github.com/group8itsc3155fall26/ResumeGPT",
          submittedAt: "Nov 12, 2026",
        },
        description:
          "In a five-person Agile team, plan and deliver a working web application across four one-week sprints. Each sprint ends with a demoable increment, a retrospective, and tests for any new data-layer behavior.",
        skills: ["React", "TypeScript", "Express", "Prisma", "Agile", "Teamwork"],
        highlight:
          "shipping four demoable sprint increments and a tested Prisma data layer",
      },
      {
        id: "itsc3155-rest",
        title: "Lab 3 — REST API Client",
        course: "ITSC 3155",
        courseName: "Software Engineering",
        semester: "Fall 2026",
        points: 100,
        dueDate: "Oct 3, 2026",
        submission: {
          type: "GitHub repository",
          detail: "github.com/jmoten2/itsc3155-rest-client",
          submittedAt: "Oct 2, 2026",
        },
        description:
          "Build a command-line client that retrieves weather data from a public REST API, validates the response shape, and reports failures without crashing. Include automated tests for success and failure paths.",
        skills: ["Node.js", "TypeScript", "REST APIs", "JSON", "Error Handling"],
        highlight:
          "handling timeouts, rate limits, and malformed payloads across 11 automated tests",
      },
      {
        id: "itsc3155-tests",
        title: "Lab 5 — Automated Test Suite",
        course: "ITSC 3155",
        courseName: "Software Engineering",
        semester: "Fall 2026",
        points: 120,
        dueDate: "Nov 5, 2026",
        submission: { type: "File upload", detail: "lab5-tests.zip", submittedAt: "Nov 5, 2026" },
        description:
          "Add unit tests for an existing module, cover the validation failure paths, and wire the suite into continuous integration so pull requests cannot merge without passing tests.",
        skills: ["Vitest", "Unit Testing", "Test Design", "CI"],
        highlight:
          "raising data-layer coverage to 92% across create, read, and validation paths",
      },
      {
        id: "itsc3155-uml",
        title: "Assignment 2 — Requirements & UML Modeling",
        course: "ITSC 3155",
        courseName: "Software Engineering",
        semester: "Fall 2026",
        points: 90,
        dueDate: "Sep 19, 2026",
        submission: { type: "File upload", detail: "uml-design.pdf", submittedAt: "Sep 18, 2026" },
        description:
          "Elicit requirements for a small system, then document the design with a class diagram and a sequence diagram for its riskiest operation.",
        skills: ["UML", "Systems Design", "Documentation"],
        highlight:
          "documenting class and sequence diagrams that drove the persistence layer",
      },
    ],
  },
  {
    code: "ITSC 2214",
    name: "Data Structures and Algorithms",
    semester: "Spring 2026",
    instructor: "Prof. Marcus Webb",
    assignments: [
      {
        id: "itsc2214-graph",
        title: "Programming Project 3 — Graph Shortest-Path Engine",
        course: "ITSC 2214",
        courseName: "Data Structures and Algorithms",
        semester: "Spring 2026",
        points: 200,
        dueDate: "Apr 24, 2026",
        submission: {
          type: "GitHub repository",
          detail: "github.com/jmoten2/pp3-graph-engine",
          submittedAt: "Apr 24, 2026",
        },
        description:
          "Implement Dijkstra's algorithm over a weighted graph read from file, using a priority queue. Report the shortest path cost and route, and document the running time.",
        skills: ["Java", "Graph Algorithms", "Priority Queues", "Big-O Analysis"],
        highlight:
          "cutting route lookup to O((V + E) log V) against a 50,000-edge graph",
      },
      {
        id: "itsc2214-index",
        title: "Programming Project 1 — Word Frequency Index",
        course: "ITSC 2214",
        courseName: "Data Structures and Algorithms",
        semester: "Spring 2026",
        points: 150,
        dueDate: "Feb 20, 2026",
        submission: {
          type: "GitHub repository",
          detail: "github.com/jmoten2/pp1-word-index",
          submittedAt: "Feb 19, 2026",
        },
        description:
          "Read a large text corpus, build an index of word frequencies, and answer lookup queries. Compare a hash map and a binary search tree implementation.",
        skills: ["Java", "Hash Maps", "Binary Search Trees", "File I/O"],
        highlight: "indexing a 1.2M-word corpus in under two seconds",
      },
      {
        id: "itsc2214-sorting",
        title: "Programming Project 2 — Sorting Benchmark Suite",
        course: "ITSC 2214",
        courseName: "Data Structures and Algorithms",
        semester: "Spring 2026",
        points: 150,
        dueDate: "Mar 27, 2026",
        submission: { type: "File upload", detail: "pp2-sorting.zip", submittedAt: "Mar 26, 2026" },
        description:
          "Implement six sorting algorithms in C++, benchmark them across several input distributions, and explain the measured differences against their theoretical bounds.",
        skills: ["C++", "Sorting Algorithms", "Benchmarking", "Data Analysis"],
        highlight:
          "comparing six sorts across ten input distributions with reproducible timing runs",
      },
    ],
  },
  {
    code: "ITSC 3160",
    name: "Database Design and Implementation",
    semester: "Fall 2026",
    instructor: "Dr. Elena Fischer",
    assignments: [
      {
        id: "itsc3160-advising",
        title: "Semester Project — University Advising Database",
        course: "ITSC 3160",
        courseName: "Database Design and Implementation",
        semester: "Fall 2026",
        points: 300,
        dueDate: "Dec 4, 2026",
        submission: {
          type: "GitHub repository",
          detail: "github.com/jmoten2/advising-db",
          submittedAt: "Nov 8, 2026",
        },
        description:
          "Design and implement a relational database for a university advising office. Deliver an ER diagram, normalized schema, seed data, and the queries that support advisor reporting.",
        skills: ["SQL", "Database Design", "Normalization", "ER Modeling", "SQLite"],
        highlight:
          "normalizing a 14-table advising schema to 3NF and removing duplicate enrollment rows across 12,000 records",
      },
      {
        id: "itsc3160-query",
        title: "Lab 5 — Query Optimization",
        course: "ITSC 3160",
        courseName: "Database Design and Implementation",
        semester: "Fall 2026",
        points: 100,
        dueDate: "Nov 1, 2026",
        submission: { type: "File upload", detail: "lab5-queries.sql", submittedAt: "Oct 31, 2026" },
        description:
          "Profile slow reporting queries with EXPLAIN plans, add appropriate indexes, and rewrite joins where needed. Document the before and after timings.",
        skills: ["SQL", "Indexing", "Query Plans", "Performance Tuning"],
        highlight: "cutting report query time 40% with composite indexes and rewritten joins",
      },
      {
        id: "itsc3160-er",
        title: "Assignment 3 — ER Modeling for a Hospital System",
        course: "ITSC 3160",
        courseName: "Database Design and Implementation",
        semester: "Fall 2026",
        points: 90,
        dueDate: "Oct 10, 2026",
        submission: { type: "File upload", detail: "hospital-erd.pdf", submittedAt: "Oct 9, 2026" },
        description:
          "Model patients, providers, appointments, and billing as an entity-relationship diagram with full cardinality and participation constraints, then translate it into relations.",
        skills: ["ER Modeling", "Data Modeling", "Documentation"],
        highlight:
          "modeling patient, provider, and billing entities with complete cardinality constraints",
      },
    ],
  },
];

/** Flattens the catalog into the project shape the API accepts. */
export function assignmentToProject(assignment: CanvasAssignment) {
  return {
    title: assignment.title,
    course: assignment.course,
    semester: assignment.semester,
    description: assignment.description,
    skills: assignment.skills,
    highlight: assignment.highlight,
    source: "Canvas" as const,
  };
}

export const flagshipAssignment = mockCanvasCourses[0].assignments[0];
