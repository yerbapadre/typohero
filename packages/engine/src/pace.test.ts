import { describe, it, expect } from "vitest";
import { createRun, applyKeypress } from "./typing";
import { DIFFICULTY_WPM, paceIndexFor, applyPace } from "./pace";

describe("paceIndexFor", () => {
  it("advances at wpm * 5 chars per minute", () => {
    expect(paceIndexFor(60, 60000)).toBe(300);
    expect(paceIndexFor(40, 1000)).toBe(3);
    expect(paceIndexFor(100, 0)).toBe(0);
  });

  it("maps every difficulty to a positive wpm", () => {
    for (const d of ["easy", "medium", "hard", "expert", "god"] as const) {
      expect(DIFFICULTY_WPM[d]).toBeGreaterThan(0);
    }
  });
});

describe("applyPace", () => {
  it("is a no-op when the pace is at or behind the cursor", () => {
    const run = applyKeypress(createRun("cat"), { type: "char", char: "c", atMs: 0 });
    expect(applyPace(run, 0)).toBe(run);
    expect(applyPace(run, 1)).toBe(run);
  });

  it("burns passed pending chars to missed and jumps the cursor", () => {
    const run = applyPace(createRun("cataract"), 3);
    expect(run.cursor).toBe(3);
    expect(run.displayChars.slice(0, 3)).toEqual(["missed", "missed", "missed"]);
    expect(run.displayChars[3]).toBe("pending");
  });

  it("breaks the streak when it burns", () => {
    let run = createRun("cataract");
    run = applyKeypress(run, { type: "char", char: "c", atMs: 0 });
    run = applyKeypress(run, { type: "char", char: "a", atMs: 1 });
    expect(run.streak).toBe(2);
    run = applyPace(run, 4);
    expect(run.streak).toBe(0);
    expect(run.longestStreak).toBe(2);
  });

  it("does not overwrite already-typed chars", () => {
    let run = createRun("cataract");
    run = applyKeypress(run, { type: "char", char: "c", atMs: 0 });
    run = applyPace(run, 4);
    expect(run.displayChars[0]).toBe("correct");
    expect(run.displayChars.slice(1, 4)).toEqual(["missed", "missed", "missed"]);
  });

  it("clamps the pace to the text length", () => {
    const run = applyPace(createRun("cat"), 99);
    expect(run.cursor).toBe(3);
    expect(run.displayChars).toEqual(["missed", "missed", "missed"]);
  });
});
