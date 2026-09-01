import type { LiveStat } from "./scoring";

// Presentation helpers for the multi-lane stage highway. Pure so every machine
// derives the same lane order and the same coarse view of a remote player.

// Every machine renders the same lanes in the same relative order; the local
// player's lane is pulled into the middle slot so you always read your own
// track from the centre of the screen.
export function centerOn<T>(items: T[], isYou: (item: T) => boolean): T[] {
  const at = items.findIndex(isYou);
  if (at < 0) return items.slice();
  const rest = items.filter((_, i) => i !== at);
  rest.splice(Math.floor(items.length / 2), 0, items[at]!);
  return rest;
}

// A remote lane only reports `progress`, so its cursor is reconstructed rather
// than simulated. Good enough to drive the visuals; never used for scoring.
export function cursorFromProgress(progress: number, textLength: number): number {
  if (textLength <= 0) return 0;
  const at = Math.round(progress * textLength);
  return Math.max(0, Math.min(textLength, at));
}

// How tight the band as a whole is playing, for stage-wide reactions (lights,
// crowd energy). Lanes with no stat yet count as clean.
export function bandQuality(stats: (LiveStat | undefined)[]): number {
  if (stats.length === 0) return 1;
  let total = 0;
  for (const s of stats) total += s?.quality ?? 1;
  return total / stats.length;
}
