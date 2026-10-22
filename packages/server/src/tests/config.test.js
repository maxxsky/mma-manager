// P5 #53 (BE4): no fallback JWT secret — the server refuses to start without one.
import { describe, it, expect } from "vitest";
import { getJwtSecret, JWT_SECRET_MIN_LENGTH } from "../config.js";

describe("getJwtSecret", () => {
  it("throws when JWT_SECRET is missing, in any NODE_ENV", () => {
    for (const NODE_ENV of [undefined, "development", "test", "production"]) {
      expect(() => getJwtSecret({ NODE_ENV })).toThrow(/JWT_SECRET is not set/);
    }
  });

  it("rejects placeholders and short secrets", () => {
    expect(() => getJwtSecret({ JWT_SECRET: "change-me-to-a-random-secret" })).toThrow(/at least/);
    expect(() => getJwtSecret({ JWT_SECRET: "dev-secret-do-not-use-in-prod" })).toThrow(/at least/);
    expect(() => getJwtSecret({ JWT_SECRET: "x".repeat(JWT_SECRET_MIN_LENGTH - 1) })).toThrow(/at least/);
  });

  it("returns a real secret unchanged", () => {
    const s = "k".repeat(JWT_SECRET_MIN_LENGTH);
    expect(getJwtSecret({ JWT_SECRET: s })).toBe(s);
  });
});
