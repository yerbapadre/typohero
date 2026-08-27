import type { TypingRun } from "./typing";

export type Note = {
  index: number;
  word: string;
  charStart: number;
  charEnd: number;
  spawnMs: number;
  hitMs: number;
};

export type BuildNotesOpts = { travelMs?: number };

const DEFAULT_TRAVEL_MS = 3000;

export function tokenizeWords(passage: string): string[] {
  return passage.match(/\S+/g) ?? [];
}

// Typing text for a falling-notes passage: words with no spaces, since spaces
// are lane delimiters and are never typed.
export function notesText(passage: string): string {
  return tokenizeWords(passage).join("");
}

export function buildNotes(passage: string, wpm: number, opts: BuildNotesOpts = {}): Note[] {
  const travelMs = opts.travelMs ?? DEFAULT_TRAVEL_MS;
  const wordsPerMin = wpm / 5;
  const interval = 60000 / wordsPerMin;

  let charStart = 0;
  return tokenizeWords(passage).map((word, index) => {
    const note: Note = {
      index,
      word,
      charStart,
      charEnd: charStart + word.length,
      spawnMs: index * interval,
      hitMs: travelMs + index * interval,
    };
    charStart = note.charEnd;
    return note;
  });
}

// First char index of the word the cursor currently sits in. Backspace floor:
// you can't erase back into a word that already fell past.
export function activeWordStart(notes: Note[], cursor: number): number {
  for (const n of notes) {
    if (cursor < n.charEnd) return n.charStart;
  }
  return cursor;
}

// Burn any word whose hit line has passed but wasn't finished. Its still-pending
// chars become "missed" and the cursor jumps past it, breaking the streak.
export function applyNotePace(run: TypingRun, notes: Note[], elapsedMs: number): TypingRun {
  let target = run.cursor;
  for (const n of notes) {
    if (n.hitMs <= elapsedMs && n.charEnd > target) target = n.charEnd;
  }
  target = Math.min(target, run.text.length);
  if (target <= run.cursor) return run;

  const displayChars = run.displayChars.slice();
  let burned = false;
  for (let i = run.cursor; i < target; i++) {
    if (displayChars[i] === "pending") {
      displayChars[i] = "missed";
      burned = true;
    }
  }

  return { ...run, cursor: target, displayChars, streak: burned ? 0 : run.streak };
}
