import { strokePoints } from "./scoring";

export type TypingText = string;

export type CharState = "pending" | "correct" | "incorrect" | "fixed" | "missed";

export type StrokeOutcome = "correct" | "incorrect" | "fixed";

export type Stroke = {
  index: number;
  expected: string;
  typed: string;
  outcome: StrokeOutcome;
  atMs: number;
};

export type TypingRun = {
  text: TypingText;
  cursor: number;
  displayChars: CharState[];
  strokes: Stroke[];
  streak: number;
  longestStreak: number;
  points: number;
};

export type TypingStats = {
  correct: number;
  incorrect: number;
  fixed: number;
};

export type Keypress =
  | { type: "char"; char: string; atMs: number }
  | { type: "backspace"; atMs: number };

export function createRun(text: TypingText): TypingRun {
  return {
    text,
    cursor: 0,
    displayChars: Array.from(text, (): CharState => "pending"),
    strokes: [],
    streak: 0,
    longestStreak: 0,
    points: 0,
  };
}

export type RunSummary = {
  points: number;
  longestStreak: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  fixed: number;
  missed: number;
  typed: number;
  total: number;
};

export function summarizeRun(run: TypingRun): RunSummary {
  let correct = 0;
  let incorrect = 0;
  let fixed = 0;
  for (const s of run.strokes) {
    if (s.outcome === "correct") correct++;
    else if (s.outcome === "fixed") fixed++;
    else incorrect++;
  }
  const missed = run.displayChars.filter((c) => c === "missed").length;
  const typed = run.strokes.length;
  const accuracy = typed === 0 ? 1 : (correct + fixed) / typed;
  return {
    points: run.points,
    longestStreak: run.longestStreak,
    accuracy,
    correct,
    incorrect,
    fixed,
    missed,
    typed,
    total: run.text.length,
  };
}

export function applyKeypress(run: TypingRun, press: Keypress): TypingRun {
  if (press.type === "backspace") {
    if (run.cursor === 0) return run;
    return { ...run, cursor: run.cursor - 1 };
  }

  if (run.cursor >= run.text.length) return run;

  const index = run.cursor;
  const expected = run.text[index]!;
  const prior = run.displayChars[index]!;
  const correct = press.char === expected;

  const outcome: StrokeOutcome = !correct
    ? "incorrect"
    : prior === "incorrect" || prior === "fixed"
      ? "fixed"
      : "correct";

  const displayChars = run.displayChars.slice();
  displayChars[index] = outcome;

  const stroke: Stroke = { index, expected, typed: press.char, outcome, atMs: press.atMs };
  const streak = outcome === "incorrect" ? 0 : run.streak + 1;
  const gained = outcome === "incorrect" ? 0 : strokePoints(streak);

  return {
    ...run,
    cursor: index + 1,
    displayChars,
    strokes: [...run.strokes, stroke],
    streak,
    longestStreak: Math.max(run.longestStreak, streak),
    points: run.points + gained,
  };
}
