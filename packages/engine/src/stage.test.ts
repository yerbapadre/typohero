import { describe, it, expect } from "vitest";
import { centerOn, cursorFromProgress, bandQuality } from "./stage";

describe("centerOn", () => {
  it("moves the marked item into the middle slot", () => {
    expect(centerOn(["a", "b", "c", "d", "e"], (v) => v === "e")).toEqual(["a", "b", "e", "c", "d"]);
  });

  it("keeps the relative order of everything else", () => {
    expect(centerOn(["a", "b", "c"], (v) => v === "a")).toEqual(["b", "a", "c"]);
  });

  it("is a no-op when nothing is marked", () => {
    expect(centerOn(["a", "b", "c"], () => false)).toEqual(["a", "b", "c"]);
  });

  it("handles a single lane and an empty stage", () => {
    expect(centerOn(["a"], (v) => v === "a")).toEqual(["a"]);
    expect(centerOn([], () => true)).toEqual([]);
  });

  it("does not mutate the input", () => {
    const lanes = ["a", "b", "c"];
    centerOn(lanes, (v) => v === "c");
    expect(lanes).toEqual(["a", "b", "c"]);
  });
});

describe("cursorFromProgress", () => {
  it("maps progress onto a char index", () => {
    expect(cursorFromProgress(0.5, 10)).toBe(5);
    expect(cursorFromProgress(0, 10)).toBe(0);
    expect(cursorFromProgress(1, 10)).toBe(10);
  });

  it("clamps out-of-range progress", () => {
    expect(cursorFromProgress(-1, 10)).toBe(0);
    expect(cursorFromProgress(2, 10)).toBe(10);
  });

  it("handles empty text", () => {
    expect(cursorFromProgress(0.5, 0)).toBe(0);
  });
});

describe("bandQuality", () => {
  const stat = (quality: number) => ({ quality, streak: 0, points: 0, progress: 0, accuracy: 1 });

  it("averages the lanes", () => {
    expect(bandQuality([stat(1), stat(0.5)])).toBe(0.75);
  });

  it("counts a lane with no stat as clean", () => {
    expect(bandQuality([stat(0.5), undefined])).toBe(0.75);
  });

  it("is clean with no lanes", () => {
    expect(bandQuality([])).toBe(1);
  });
});
