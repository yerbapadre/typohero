import { describe, it, expect } from "vitest";
import { createRun, applyKeypress } from "./typing";
import { buildNotes, notesText, tokenizeWords, activeWordStart, applyNotePace } from "./notes";

const PASSAGE = "the quick brown";

describe("tokenizeWords / notesText", () => {
  it("splits on whitespace and joins spaceless", () => {
    expect(tokenizeWords(PASSAGE)).toEqual(["the", "quick", "brown"]);
    expect(notesText(PASSAGE)).toBe("thequickbrown");
  });

  it("collapses arbitrary whitespace runs", () => {
    expect(tokenizeWords("  a\t b\n c ")).toEqual(["a", "b", "c"]);
  });
});

describe("buildNotes", () => {
  it("maps each word to contiguous char ranges over the spaceless text", () => {
    const notes = buildNotes(PASSAGE, 40, { travelMs: 3000 });
    expect(notes.map((n) => [n.charStart, n.charEnd])).toEqual([
      [0, 3],
      [3, 8],
      [8, 13],
    ]);
    expect(notes.map((n) => n.word)).toEqual(["the", "quick", "brown"]);
  });

  it("spaces hits by words-per-minute and offsets spawn by travel time", () => {
    // 40 wpm = 8 wpm-words/min -> 7500ms between hits
    const notes = buildNotes(PASSAGE, 40, { travelMs: 3000 });
    expect(notes[0]!.spawnMs).toBe(0);
    expect(notes[0]!.hitMs).toBe(3000);
    expect(notes[1]!.hitMs).toBe(3000 + 7500);
    expect(notes[1]!.spawnMs).toBe(7500);
  });
});

describe("activeWordStart", () => {
  const notes = buildNotes(PASSAGE, 40);
  it("returns the start of the word containing the cursor", () => {
    expect(activeWordStart(notes, 0)).toBe(0);
    expect(activeWordStart(notes, 2)).toBe(0);
    expect(activeWordStart(notes, 3)).toBe(3);
    expect(activeWordStart(notes, 9)).toBe(8);
  });
  it("returns the cursor itself once all words are cleared", () => {
    expect(activeWordStart(notes, 13)).toBe(13);
  });
});

describe("applyNotePace", () => {
  const notes = buildNotes(PASSAGE, 40, { travelMs: 3000 });

  it("is a no-op before any word's hit line passes", () => {
    const run = createRun(notesText(PASSAGE));
    expect(applyNotePace(run, notes, 0)).toBe(run);
    expect(applyNotePace(run, notes, 2999)).toBe(run);
  });

  it("burns an unfinished word to missed and jumps past it", () => {
    const run = createRun(notesText(PASSAGE));
    const paced = applyNotePace(run, notes, 3000);
    expect(paced.cursor).toBe(3);
    expect(paced.displayChars.slice(0, 3)).toEqual(["missed", "missed", "missed"]);
    expect(paced.displayChars[3]).toBe("pending");
    expect(paced.streak).toBe(0);
  });

  it("does not overwrite already-typed chars and only burns the pending tail", () => {
    let run = createRun(notesText(PASSAGE));
    run = applyKeypress(run, { type: "char", char: "t", atMs: 0 });
    run = applyKeypress(run, { type: "char", char: "h", atMs: 1 });
    const paced = applyNotePace(run, notes, 3000);
    expect(paced.displayChars.slice(0, 2)).toEqual(["correct", "correct"]);
    expect(paced.displayChars[2]).toBe("missed");
    expect(paced.cursor).toBe(3);
  });

  it("keeps the streak when a passed word was fully typed", () => {
    let run = createRun(notesText(PASSAGE));
    for (const ch of "the") run = applyKeypress(run, { type: "char", char: ch, atMs: 0 });
    expect(run.streak).toBe(3);
    const paced = applyNotePace(run, notes, 3000);
    expect(paced.streak).toBe(3);
    expect(paced.cursor).toBe(3);
  });
});
