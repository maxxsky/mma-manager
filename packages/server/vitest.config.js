import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.js"],
  },
  resolve: {
    alias: {
      "@ironfist/engine": new URL("../engine/src", import.meta.url).pathname,
    },
  },
});
