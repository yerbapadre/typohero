import { describe, it, expect } from "vitest";
import { createRun, applyKeypress, type TypingRun, type Keypress } from "./typing";

const char = (c: string, atMs = 0): Keypress => ({ type: "char", char: c, atMs });
const back = (atMs = 0): Keypress => ({ type: "backspace", atMs });

function type(run: TypingRun, text: string): TypingRun {
  return [...text].reduce((r, c, i) => applyKeypress(r, char(c, i)), run);
}

describe("createRun", () => {
  it("starts at cursor 0 with all chars pending and no history", () => {
    const run = createRun("cat");
    expect(run.cursor).toBe(0);
    expect(run.displayChars).toEqual(["pending", "pending", "pending"]);
    expect(run.strokes).toEqual([]);
    expect(run.streak).toBe(0);
    expect(run.longestStreak).toBe(0);
  });
});

describe("correct typing", () => {
  it("marks the char correct, advances, and builds streak", () => {
    const run = applyKeypress(createRun("cat"), char("c", 100));
    expect(run.cursor).toBe(1);
    expect(run.displayChars[0]).toBe("correct");
    expect(run.streak).toBe(1);
    expect(run.longestStreak).toBe(1);
    expect(run.strokes).toEqual([
      { index: 0, expected: "c", typed: "c", outcome: "correct", atMs: 100 },
    ]);
  });

  it("types a full word clean", () => {
    const run = type(createRun("cat"), "cat");
    expect(run.cursor).toBe(3);
    expect(run.displayChars).toEqual(["correct", "correct", "correct"]);
    expect(run.streak).toBe(3);
    expect(run.longestStreak).toBe(3);
  });
});

describe("points", () => {
  it("awards base points per correct stroke at 1x", () => {
    const run = type(createRun("cataract"), "cat");
    expect(run.points).toBe(300);
  });

  it("awards nothing for an incorrect stroke", () => {
    let run = type(createRun("cat"), "ca");
    const before = run.points;
    run = applyKeypress(run, char("x", 9));
    expect(run.points).toBe(before);
  });
});

describe("incorrect typing", () => {
  it("marks the char incorrect, advances, and resets streak", () => {
    let run = type(createRun("cat"), "ca");
    run = applyKeypress(run, char("x", 300));
    expect(run.cursor).toBe(3);
    expect(run.displayChars[2]).toBe("incorrect");
    expect(run.streak).toBe(0);
    expect(run.longestStreak).toBe(2);
    expect(run.strokes.at(-1)).toEqual({
      index: 2,
      expected: "t",
      typed: "x",
      outcome: "incorrect",
      atMs: 300,
    });
  });
});

describe("fixing a mistake", () => {
  it("wrong then backspace then correct yields fixed and rebuilds streak", () => {
    let run = applyKeypress(createRun("cat"), char("c", 0));
    run = applyKeypress(run, char("x", 1));
    expect(run.displayChars[1]).toBe("incorrect");
    expect(run.streak).toBe(0);

    run = applyKeypress(run, back(2));
    expect(run.cursor).toBe(1);
    expect(run.displayChars[1]).toBe("incorrect");

    run = applyKeypress(run, char("a", 3));
    expect(run.cursor).toBe(2);
    expect(run.displayChars[1]).toBe("fixed");
    expect(run.streak).toBe(1);
    expect(run.strokes.at(-1)?.outcome).toBe("fixed");
  });
});

describe("edge cases", () => {
  it("backspace at cursor 0 is a no-op", () => {
    const run = createRun("cat");
    expect(applyKeypress(run, back())).toBe(run);
  });

  it("typing past the end is a no-op", () => {
    const run = type(createRun("cat"), "cat");
    expect(applyKeypress(run, char("x", 9))).toBe(run);
  });

  it("longestStreak survives a streak reset", () => {
    let run = type(createRun("cataract"), "cata");
    expect(run.longestStreak).toBe(4);
    run = applyKeypress(run, char("z", 5));
    expect(run.streak).toBe(0);
    expect(run.longestStreak).toBe(4);
  });

  it("does not mutate the input run", () => {
    const run = createRun("cat");
    const next = applyKeypress(run, char("c"));
    expect(run.cursor).toBe(0);
    expect(run.displayChars).toEqual(["pending", "pending", "pending"]);
    expect(next).not.toBe(run);
  });
});
