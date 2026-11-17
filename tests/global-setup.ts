import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const testDb = fileURLToPath(new URL("../prisma/test.db", import.meta.url));

/** Build the throwaway test database from the schema before the suite runs. */
export default function setup() {
  // Run the Prisma CLI with the current Node binary. The ./node_modules/.bin
  // shims are shell scripts (Unix) or .cmd files (Windows), which execFileSync
  // cannot spawn directly on Windows.
  const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, "db", "push", "--force-reset", "--skip-generate"], {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });

  // Test files share one database, so removal happens once, after every suite.
  return () => rmSync(testDb, { force: true });
}
