import { describe, expect, it } from "vitest";
import { PASSAGES, passageById, firstPassage } from "./passages";
import { notesText } from "./notes";

describe("passages", () => {
  it("has unique ids", () => {
    const ids = PASSAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lengthChars matches content", () => {
    for (const p of PASSAGES) expect(p.lengthChars).toBe(p.content.length);
  });

  // Keypresses are matched against the expected char exactly, and the browser
  // only delivers single-character `key` values — so every char the player has
  // to hit must be printable ASCII. Smart quotes and em dashes would be
  // unhittable. Whitespace is exempt: `notesText` tokenizes it away, so spaces
  // and newlines are separators the player never types.
  it("only uses typeable characters", () => {
    for (const p of PASSAGES) {
      const untypeable = [...new Set(notesText(p.content))].filter(
        (c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) > 0x7e,
      );
      expect(untypeable, `${p.id} has untypeable characters`).toEqual([]);
    }
  });

  it("looks up by id and falls back to first", () => {
    expect(passageById("quick-fox")?.id).toBe("quick-fox");
    expect(passageById("nope")).toBeUndefined();
    expect(firstPassage()).toBe(PASSAGES[0]);
  });
});
