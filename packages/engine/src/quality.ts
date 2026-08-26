import type { TypingRun } from "./typing";
import type { LiveStat } from "./scoring";

export function qualityFromRun(run: TypingRun, window = 10): number {
  let good = 0;
  let counted = 0;
  for (let i = run.cursor - 1; i >= 0 && counted < window; i--) {
    const s = run.displayChars[i];
    if (s === "pending") continue;
    counted++;
    if (s === "correct" || s === "fixed") good++;
  }
  const pad = window - counted;
  return (good + pad) / window;
}

export function liveStatFromRun(run: TypingRun): LiveStat {
  const resolved = run.cursor || 1;
  let good = 0;
  for (let i = 0; i < run.cursor; i++) {
    const s = run.displayChars[i];
    if (s === "correct" || s === "fixed") good++;
  }
  return {
    quality: qualityFromRun(run),
    streak: run.streak,
    points: run.points,
    progress: run.cursor / run.text.length,
    accuracy: good / resolved,
  };
}
