import { tokenizeWords } from "./notes";

/** One keystroke: a letter from the passage placed at a time from the song. */
export type ChartNote = {
  index: number;
  char: string;
  timeMs: number;
  wordIndex: number;
  wordStart: boolean;
};

export type Chart = { notes: ChartNote[] };

export type Judgment = "perfect" | "great" | "good" | "miss";

export type HitWindows = { perfect: number; great: number; good: number };

/** Tuned for a room with one PA: residual latency after calibration must still land in `perfect`. */
export const HIT_WINDOWS: HitWindows = { perfect: 80, great: 150, good: 220 };

export type BuildChartOpts = {
  /** Reuse the passage from the start when the rhythm outlasts its letters. */
  loop?: boolean;
};

function letterCount(words: string[]): number {
  let count = 0;
  for (const word of words) count += word.length;
  return count;
}

export function buildChart(text: string, timesMs: number[], opts: BuildChartOpts = {}): Chart {
  const words = tokenizeWords(text);
  if (words.length === 0) return { notes: [] };

  const times = [...timesMs].sort((a, b) => a - b);
  const available = opts.loop ? times.length : Math.min(times.length, letterCount(words));

  const notes: ChartNote[] = [];
  let wordsConsumed = 0;
  let charInWord = 0;

  for (let index = 0; index < available; index++) {
    const word = words[wordsConsumed % words.length]!;
    notes.push({
      index,
      char: word[charInWord]!,
      timeMs: times[index]!,
      wordIndex: wordsConsumed,
      wordStart: charInWord === 0,
    });
    charInWord++;
    if (charInWord >= word.length) {
      charInWord = 0;
      wordsConsumed++;
    }
  }

  return { notes };
}

function halfGapToNearestNeighbour(chart: Chart, index: number): number {
  const note = chart.notes[index]!;
  const prev = chart.notes[index - 1];
  const next = chart.notes[index + 1];

  let half = Infinity;
  if (prev) half = Math.min(half, (note.timeMs - prev.timeMs) / 2);
  if (next) half = Math.min(half, (next.timeMs - note.timeMs) / 2);
  return Math.max(0, half);
}

/**
 * Hit windows for one note, never wide enough to reach a neighbouring note.
 * Dense passages scale all three tiers down together, so grading stays
 * proportional rather than collapsing into `perfect`.
 */
export function windowsFor(chart: Chart, index: number, base: HitWindows = HIT_WINDOWS): HitWindows {
  if (!chart.notes[index]) return base;

  const room = Math.min(base.good, halfGapToNearestNeighbour(chart, index));
  if (room >= base.good) return base;

  const scale = room / base.good;
  return { perfect: base.perfect * scale, great: base.great * scale, good: room };
}

export function judge(deltaMs: number, windows: HitWindows): Judgment {
  const off = Math.abs(deltaMs);
  if (off <= windows.perfect) return "perfect";
  if (off <= windows.great) return "great";
  if (off <= windows.good) return "good";
  return "miss";
}
