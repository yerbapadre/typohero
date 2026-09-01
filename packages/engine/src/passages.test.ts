import { describe, expect, it } from "vitest";
import { PASSAGES, passageById, firstPassage } from "./passages";

describe("passages", () => {
  it("has unique ids", () => {
    const ids = PASSAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lengthChars matches content", () => {
    for (const p of PASSAGES) expect(p.lengthChars).toBe(p.content.length);
  });

  it("looks up by id and falls back to first", () => {
    expect(passageById("quick-fox")?.id).toBe("quick-fox");
    expect(passageById("nope")).toBeUndefined();
    expect(firstPassage()).toBe(PASSAGES[0]);
  });
});
