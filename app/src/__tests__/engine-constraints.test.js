// Engine constraints & invariants — enforcement tests
// These run as part of CI to catch regressions against rules in CONSTRAINTS.md
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_SRC = join(__dirname, "..", "..", "..", "packages", "engine", "src");

// Collect all .js files recursively from engine/src, excluding node_modules
function getEngineFiles() {
  const result = execSync(
    `find "${ENGINE_SRC}" -name '*.js' -not -path '*/node_modules/*' -not -path '*/dist/*'`,
    { encoding: "utf-8" }
  );
  return result.trim().split("\n").filter(Boolean);
}

describe("Engine Constraints (CONSTRAINTS.md)", () => {
  // ── Rule #1: No Math.random() in engine code ──
  it("Rule #1 — No Math.random() in packages/engine/src/ (use rng.js random() instead)", () => {
    const files = getEngineFiles();
    const violations = [];

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip comments
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

        if (/\bMath\.random\b/.test(line)) {
          // Double-check: is this inside a multi-line comment?
          // Walk backwards to find /* or // markers
          const before = content.slice(0, content.indexOf(line)).split("\n").slice(-5).join("\n");
          const lastOpenComment = before.lastIndexOf("/*");
          const lastCloseComment = before.lastIndexOf("*/");
          if (lastOpenComment > lastCloseComment) continue; // Inside a block comment

          violations.push(`${file}:${i + 1}: ${trimmed}`);
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} Math.random() usage(s) in engine source.\n` +
        `Use seeded RNG (random()/setRNG() from rng.js) instead.\n` +
        `Violations:\n  ${violations.join("\n  ")}`
      );
    }
  });

  // ── Rule #2: No React imports in engine code ──
  it("Rule #2 — No React imports in packages/engine/src/ (engine must be pure JS)", () => {
    const files = getEngineFiles();
    const violations = [];

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip comments
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

        if (/from\s+["']react["']/.test(line)) {
          violations.push(`${file}:${i + 1}: ${trimmed}`);
        }
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Found ${violations.length} React import(s) in engine source.\n` +
        `Engine must be pure JavaScript — no React/UI dependencies.\n` +
        `Violations:\n  ${violations.join("\n  ")}`
      );
    }
  });
});
