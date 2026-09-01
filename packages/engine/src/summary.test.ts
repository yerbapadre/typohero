import { describe, expect, it } from "vitest";
import { createRun, applyKeypress, summarizeRun } from "./typing";

function type(text: string, input: string) {
  let run = createRun(text);
  let atMs = 0;
  for (const char of input) run = applyKeypress(run, { type: "char", char, atMs: (atMs += 1) });
  return run;
}

describe("summarizeRun", () => {
  it("all correct is 100% accuracy", () => {
    const s = summarizeRun(type("cat", "cat"));
    expect(s.accuracy).toBe(1);
    expect(s.correct).toBe(3);
    expect(s.incorrect).toBe(0);
    expect(s.total).toBe(3);
  });

  it("counts incorrect and lowers accuracy", () => {
    const s = summarizeRun(type("cat", "cxt"));
    expect(s.incorrect).toBe(1);
    expect(s.correct).toBe(2);
    expect(s.accuracy).toBeCloseTo(2 / 3);
  });

  it("empty run is 100% accuracy", () => {
    expect(summarizeRun(createRun("cat")).accuracy).toBe(1);
  });
});
