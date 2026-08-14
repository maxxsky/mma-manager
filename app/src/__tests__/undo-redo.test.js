// Undo/redo and snapshot cost.
//
// Two bugs lived here. Redo silently did nothing: undo wiped every key on the
// state object to swap in the previous snapshot, and since the stacks are
// deliberately excluded from snapshots, that wipe destroyed the redo stack it
// had just pushed to. Separately, snapshot() stringified the whole object and
// deleted the stacks afterwards, so every dispatch walked all twenty stored
// snapshots before discarding them — roughly 30ms per action mid-game.
import { describe, it, expect } from "vitest";
import { newGame, reducer, setRNG, mulberry32, snapshot } from "@ironfist/engine/index.js";

function fresh(seed = 3) {
  setRNG(mulberry32(seed));
  return newGame();
}

const trainingOf = (g) => g.roster[0].training.type;

function assign(g, program) {
  reducer(g, {
    type: "SET_TRAINING",
    fighterId: g.roster[0].id,
    program,
    intensity: "Hard",
  });
}

describe("snapshot", () => {
  it("excludes the undo and redo stacks", () => {
    const g = fresh();
    assign(g, "grappling");
    const s = snapshot(g);
    expect(s._undoStack).toBeUndefined();
    expect(s._redoStack).toBeUndefined();
  });

  it("does not grow in cost as the undo stack fills", () => {
    const g = fresh();
    const bytesEmpty = JSON.stringify(snapshot(g)).length;
    for (let i = 0; i < 20; i++) assign(g, i % 2 ? "striking" : "grappling");
    const bytesFull = JSON.stringify(snapshot(g)).length;
    // A full stack holds ~20 copies of the state. If any of that leaks into
    // the snapshot, this ratio explodes rather than staying near 1.
    expect(bytesFull).toBeLessThan(bytesEmpty * 2);
  });
});

describe("undo / redo", () => {
  it("undo restores the previous value", () => {
    const g = fresh();
    const before = trainingOf(g);
    assign(g, "grappling");
    expect(trainingOf(g)).toBe("grappling");
    reducer(g, { type: "UNDO" });
    expect(trainingOf(g)).toBe(before);
  });

  it("redo reapplies what undo took away", () => {
    const g = fresh();
    assign(g, "grappling");
    reducer(g, { type: "UNDO" });
    reducer(g, { type: "REDO" });
    expect(trainingOf(g)).toBe("grappling");
  });

  it("survives repeated round trips", () => {
    const g = fresh();
    const before = trainingOf(g);
    assign(g, "grappling");
    for (let i = 0; i < 5; i++) {
      reducer(g, { type: "UNDO" });
      expect(trainingOf(g)).toBe(before);
      reducer(g, { type: "REDO" });
      expect(trainingOf(g)).toBe("grappling");
    }
  });

  it("keeps the stacks alive across a swap", () => {
    const g = fresh();
    assign(g, "grappling");
    reducer(g, { type: "UNDO" });
    expect(Array.isArray(g._undoStack)).toBe(true);
    expect(Array.isArray(g._redoStack)).toBe(true);
    expect(g._redoStack.length).toBe(1);
  });

  it("walks back through several actions in order", () => {
    const g = fresh();
    const before = trainingOf(g);
    assign(g, "grappling");
    assign(g, "sparring");
    assign(g, "conditioning");
    expect(trainingOf(g)).toBe("conditioning");
    reducer(g, { type: "UNDO" });
    expect(trainingOf(g)).toBe("sparring");
    reducer(g, { type: "UNDO" });
    expect(trainingOf(g)).toBe("grappling");
    reducer(g, { type: "UNDO" });
    expect(trainingOf(g)).toBe(before);
  });

  it("a new action clears the redo stack", () => {
    const g = fresh();
    assign(g, "grappling");
    reducer(g, { type: "UNDO" });
    expect(g._redoStack.length).toBe(1);
    assign(g, "sparring");
    expect(g._redoStack.length).toBe(0);
    reducer(g, { type: "REDO" });
    expect(trainingOf(g)).toBe("sparring");
  });

  it("undo on an empty stack is a no-op", () => {
    const g = fresh();
    const before = trainingOf(g);
    reducer(g, { type: "UNDO" });
    reducer(g, { type: "UNDO" });
    expect(trainingOf(g)).toBe(before);
  });
});
