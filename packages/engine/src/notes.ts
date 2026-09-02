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

// How much of the accumulated text a crowd-facing ticker shows at once.
export const TYPED_TAIL_CHARS = 88;

/**
 * The passage as it has been typed so far, tail first — whole words plus the
 * letters of the word in flight, capped at `maxChars`.
 *
 * `letters` is the lane's cursor, which counts typed letters only: spaces are
 * lane delimiters and never typed. They go back in here, because this string is
 * for reading (the big screen, the pit) rather than for matching keystrokes.
 * That makes one helper serve both note modes — a word lane's cursor and a
 * rhythm lane's resolved-note count are both "letters into the passage".
 *
 * Letters past the end of the passage wrap, the way a looping rhythm chart
 * reuses it; the tail restarts from the top of the passage on each pass.
 */
export function typedTail(words: string[], letters: number, maxChars = TYPED_TAIL_CHARS): string {
  if (words.length === 0 || letters <= 0 || maxChars <= 0) return "";

  let total = 0;
  for (const word of words) total += word.length;
  if (total === 0) return "";

  // Where this pass has got to. A cursor landing exactly on the end of the
  // passage is the end of that pass, not the start of the next one.
  const rest = letters % total;
  const upTo = rest === 0 ? total : rest;

  // Keep only the tail: shift whole words off the front once they scroll out.
  const shown: string[] = [];
  let width = 0;
  let seen = 0;
  for (const word of words) {
    if (seen >= upTo) break;
    const piece = word.slice(0, Math.min(word.length, upTo - seen));
    seen += piece.length;
    shown.push(piece);
    width += piece.length + 1;
    while (width > maxChars && shown.length > 1) {
      width -= shown[0]!.length + 1;
      shown.shift();
    }
  }

  // A single word longer than the window still has to be cut somewhere.
  return shown.join(" ").slice(-maxChars);
}
