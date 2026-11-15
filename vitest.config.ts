import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Throwaway SQLite file; the path is resolved next to prisma/schema.prisma.
    env: { DATABASE_URL: "file:./test.db" },
    globalSetup: "./tests/global-setup.ts",
  },
});
