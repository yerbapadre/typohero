import { judge, windowsFor, type Chart, type Judgment } from "./chart";
import { strokePoints, type LiveStat } from "./scoring";
import type { CharState } from "./typing";

export type NoteState = "pending" | "perfect" | "great" | "good" | "wrong" | "missed";

/** `judgment` grades the timing only; a wrong key still records how close it was. */
export type RhythmHit = {
  index: number;
  expected: string;
  typed: string;
  judgment: Judgment;
  deltaMs: number;
};

export type RhythmRun = {
  chart: Chart;
  resolved: number;
  states: NoteState[];
  hits: RhythmHit[];
  streak: number;
  longestStreak: number;
  points: number;
  lastHit: RhythmHit | null;
};

export type RhythmKeypress = { char: string; atMs: number };

const POINT_MULTIPLIER: Record<Judgment, number> = {
  perfect: 1,
  great: 0.7,
  good: 0.4,
  miss: 0,
};

/** Softer than the point curve: a correct key played loosely should still sound like music. */
const QUALITY_SCORE: Record<NoteState, number> = {
  pending: 1,
  perfect: 1,
  great: 0.9,
  good: 0.7,
  wrong: 0,
  missed: 0,
};

export function timingMultiplier(judgment: Judgment): number {
  return POINT_MULTIPLIER[judgment];
}

export function notePoints(streak: number, judgment: Judgment): number {
  return Math.round(strokePoints(streak) * timingMultiplier(judgment));
}

export function createRhythmRun(chart: Chart): RhythmRun {
  return {
    chart,
    resolved: 0,
    states: chart.notes.map((): NoteState => "pending"),
    hits: [],
    streak: 0,
    longestStreak: 0,
    points: 0,
    lastHit: null,
  };
}

/**
 * Matches a keystroke against the one hittable note. A press outside that note's
 * window is too early to mean anything and is ignored rather than penalised;
 * notes are only failed by a wrong key inside the window, or by expiry.
 */
export function applyRhythmKeypress(run: RhythmRun, press: RhythmKeypress): RhythmRun {
  const note = run.chart.notes[run.resolved];
  if (!note) return run;

  const deltaMs = press.atMs - note.timeMs;
  const judgment = judge(deltaMs, windowsFor(run.chart, run.resolved));
  if (judgment === "miss") return run;

  const correct = press.char === note.char;
  const streak = correct ? run.streak + 1 : 0;
  const hit: RhythmHit = {
    index: note.index,
    expected: note.char,
    typed: press.char,
    judgment,
    deltaMs,
  };

  const states = run.states.slice();
  states[note.index] = correct ? judgment : "wrong";

  return {
    ...run,
    resolved: run.resolved + 1,
    states,
    hits: [...run.hits, hit],
    streak,
    longestStreak: Math.max(run.longestStreak, streak),
    points: run.points + (correct ? notePoints(streak, judgment) : 0),
    lastHit: hit,
  };
}

export function expireRhythmNotes(run: RhythmRun, atMs: number): RhythmRun {
  let resolved = run.resolved;
  let states: NoteState[] | null = null;

  while (resolved < run.chart.notes.length) {
    const note = run.chart.notes[resolved]!;
    if (note.timeMs + windowsFor(run.chart, resolved).good >= atMs) break;
    states ??= run.states.slice();
    states[note.index] = "missed";
    resolved++;
  }

  if (!states) return run;
  return { ...run, resolved, states, streak: 0 };
}

const CHAR_STATE: Record<NoteState, CharState> = {
  pending: "pending",
  perfect: "correct",
  great: "correct",
  good: "fixed",
  wrong: "incorrect",
  missed: "missed",
};

/** Note states in the word-mode vocabulary, so the shared highway can colour them. */
export function charStatesFromRhythm(run: RhythmRun): CharState[] {
  return run.states.map((state) => CHAR_STATE[state]);
}

export function rhythmQuality(run: RhythmRun, window = 10): number {
  let total = 0;
  let counted = 0;
  for (let i = run.resolved - 1; i >= 0 && counted < window; i--) {
    const state = run.states[i];
    if (!state || state === "pending") continue;
    counted++;
    total += QUALITY_SCORE[state];
  }
  return (total + (window - counted)) / window;
}

function cleanCount(run: RhythmRun): number {
  let clean = 0;
  for (let i = 0; i < run.resolved; i++) {
    const state = run.states[i];
    if (state === "perfect" || state === "great" || state === "good") clean++;
  }
  return clean;
}

export function liveStatFromRhythmRun(run: RhythmRun): LiveStat {
  return {
    quality: rhythmQuality(run),
    streak: run.streak,
    points: run.points,
    progress: run.chart.notes.length === 0 ? 0 : run.resolved / run.chart.notes.length,
    accuracy: run.resolved === 0 ? 1 : cleanCount(run) / run.resolved,
  };
}

/** `meanDeltaMs` keeps its sign: a consistently negative run means the player is rushing. */
export type RhythmSummary = {
  points: number;
  longestStreak: number;
  accuracy: number;
  perfect: number;
  great: number;
  good: number;
  wrong: number;
  missed: number;
  total: number;
  meanDeltaMs: number;
  meanAbsDeltaMs: number;
};

export function summarizeRhythmRun(run: RhythmRun): RhythmSummary {
  const counts = { perfect: 0, great: 0, good: 0, wrong: 0, missed: 0 };
  for (let i = 0; i < run.resolved; i++) {
    const state = run.states[i];
    if (state && state !== "pending") counts[state]++;
  }

  let delta = 0;
  let absDelta = 0;
  for (const hit of run.hits) {
    delta += hit.deltaMs;
    absDelta += Math.abs(hit.deltaMs);
  }
  const hits = run.hits.length || 1;

  return {
    points: run.points,
    longestStreak: run.longestStreak,
    accuracy: run.resolved === 0 ? 1 : cleanCount(run) / run.resolved,
    ...counts,
    total: run.chart.notes.length,
    meanDeltaMs: delta / hits,
    meanAbsDeltaMs: absDelta / hits,
  };
}
