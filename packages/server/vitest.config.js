import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.js"],
    testTimeout: 30000,
    hookTimeout: 30000,
    // NOTE: DATABASE_URL is NOT set here — helpers.js sets it dynamically
    // before importing the app, so both db.js and server modules use the
    // same TEST_DATABASE_URL source of truth.
  },
  resolve: {
    alias: {
      "@ironfist/engine": fileURLToPath(new URL("../engine/src", import.meta.url)),
    },
  },
});
