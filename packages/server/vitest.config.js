import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.js"],
    testTimeout: 30000,
    env: {
      DATABASE_URL: "postgresql://postgres@localhost:5432/mma_manager_test",
    },
  },
  resolve: {
    alias: {
      "@ironfist/engine": fileURLToPath(new URL("../engine/src", import.meta.url)),
    },
  },
});
