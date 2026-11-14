import { execFileSync } from "node:child_process";

/** Build the throwaway test database from the schema before the suite runs. */
export default function setup() {
  execFileSync("./node_modules/.bin/prisma", ["db", "push", "--force-reset", "--skip-generate"], {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });
}
