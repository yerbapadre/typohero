import { describe, it, expect } from "vitest";
import { streakMultiplier, strokePoints, BASE_POINTS } from "./scoring";

describe("streakMultiplier", () => {
  it("is 1x below the first tier", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(9)).toBe(1);
  });

  it("steps up at each threshold", () => {
    expect(streakMultiplier(10)).toBe(1.15);
    expect(streakMultiplier(50)).toBe(1.5);
    expect(streakMultiplier(100)).toBe(2);
    expect(streakMultiplier(250)).toBe(4);
  });

  it("caps at 5x", () => {
    expect(streakMultiplier(300)).toBe(5);
    expect(streakMultiplier(10000)).toBe(5);
  });
});

describe("strokePoints", () => {
  it("is base points at 1x", () => {
    expect(strokePoints(0)).toBe(BASE_POINTS);
  });

  it("applies the multiplier and rounds", () => {
    expect(strokePoints(10)).toBe(115);
    expect(strokePoints(150)).toBe(250);
    expect(strokePoints(300)).toBe(500);
  });
});
