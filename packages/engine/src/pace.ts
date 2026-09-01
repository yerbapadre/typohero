import type { Difficulty } from "./difficulty";
import type { TypingRun } from "./typing";

export const DIFFICULTY_WPM: Record<Difficulty, number> = {
  easy: 70,
  medium: 90,
  hard: 120,
  expert: 150,
  god: 190,
};

export function paceIndexFor(wpm: number, elapsedMs: number): number {
  const charsPerMs = (wpm * 5) / 60000;
  return Math.floor(charsPerMs * elapsedMs);
}

export function applyPace(run: TypingRun, paceIndex: number): TypingRun {
  const target = Math.min(paceIndex, run.text.length);
  if (target <= run.cursor) return run;

  const displayChars = run.displayChars.slice();
  for (let i = run.cursor; i < target; i++) {
    if (displayChars[i] === "pending") displayChars[i] = "missed";
  }

  return { ...run, cursor: target, displayChars, streak: 0 };
}
