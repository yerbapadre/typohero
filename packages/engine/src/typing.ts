export type TypingText = string;

export type CharState = "pending" | "correct" | "incorrect" | "fixed";

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
};

export type TypingStats = {
  correct: number;
  incorrect: number;
  fixed: number;
};
