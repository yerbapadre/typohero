import { describe, it, expect } from "vitest";
import {
  buildChart,
  windowsFor,
  judge,
  laneTimes,
  isChartedLane,
  chartFromFile,
  HIT_WINDOWS,
  chartNotes,
  travelMsForChart,
  type ChartFile,
} from "./chart";

const grid = (count: number, stepMs: number, from = 0) =>
  Array.from({ length: count }, (_, i) => from + i * stepMs);

describe("buildChart", () => {
  it("zips letters onto rhythm times, skipping spaces", () => {
    const chart = buildChart("ab cd", grid(4, 250));
    expect(chart.notes.map((n) => n.char)).toEqual(["a", "b", "c", "d"]);
    expect(chart.notes.map((n) => n.timeMs)).toEqual([0, 250, 500, 750]);
  });

  it("tags word grouping so the highway can show boundaries", () => {
    const chart = buildChart("ab cd", grid(4, 250));
    expect(chart.notes.map((n) => n.wordIndex)).toEqual([0, 0, 1, 1]);
    expect(chart.notes.map((n) => n.wordStart)).toEqual([true, false, true, false]);
  });

  it("truncates to the shorter of letters and times", () => {
    expect(buildChart("abc", grid(10, 100)).notes).toHaveLength(3);
    expect(buildChart("abcdefghij", grid(2, 100)).notes).toHaveLength(2);
  });

  it("reuses the passage when looping, with running word indices", () => {
    const chart = buildChart("ab", grid(5, 100), { loop: true });
    expect(chart.notes.map((n) => n.char)).toEqual(["a", "b", "a", "b", "a"]);
    expect(chart.notes.map((n) => n.wordIndex)).toEqual([0, 0, 1, 1, 2]);
  });

  it("sorts times and indexes sequentially", () => {
    const chart = buildChart("abc", [500, 0, 250]);
    expect(chart.notes.map((n) => n.timeMs)).toEqual([0, 250, 500]);
    expect(chart.notes.map((n) => n.index)).toEqual([0, 1, 2]);
  });

  it("handles empty text and empty rhythm", () => {
    expect(buildChart("", grid(4, 250)).notes).toEqual([]);
    expect(buildChart("abc", []).notes).toEqual([]);
  });
});

describe("windowsFor", () => {
  it("uses the full windows when notes are far apart", () => {
    const chart = buildChart("abc", grid(3, 1000));
    expect(windowsFor(chart, 1)).toEqual(HIT_WINDOWS);
  });

  it("never lets a window reach a neighbouring note", () => {
    const chart = buildChart("abc", grid(3, 200));
    const windows = windowsFor(chart, 1);
    expect(windows.good).toBe(100);
    expect(windows.good).toBeLessThan(200);
  });

  it("scales the tiers together so grading survives dense charts", () => {
    const chart = buildChart("abc", grid(3, 200));
    const windows = windowsFor(chart, 1);
    const scale = 100 / HIT_WINDOWS.good;
    expect(windows.perfect).toBeCloseTo(HIT_WINDOWS.perfect * scale);
    expect(windows.great).toBeCloseTo(HIT_WINDOWS.great * scale);
    expect(windows.perfect).toBeLessThan(windows.great);
    expect(windows.great).toBeLessThan(windows.good);
  });

  it("only clamps on the side that has a neighbour", () => {
    const chart = buildChart("abc", [0, 1000, 1200]);
    expect(windowsFor(chart, 0)).toEqual(HIT_WINDOWS);
    expect(windowsFor(chart, 2).good).toBe(100);
  });

  it("survives duplicate times and out-of-range indices", () => {
    const chart = buildChart("abc", [0, 0, 0]);
    expect(windowsFor(chart, 1).good).toBe(0);
    expect(windowsFor(chart, 99)).toEqual(HIT_WINDOWS);
  });
});

describe("judge", () => {
  it("grades by absolute distance, early and late alike", () => {
    expect(judge(0, HIT_WINDOWS)).toBe("perfect");
    expect(judge(-70, HIT_WINDOWS)).toBe("perfect");
    expect(judge(120, HIT_WINDOWS)).toBe("great");
    expect(judge(-200, HIT_WINDOWS)).toBe("good");
    expect(judge(300, HIT_WINDOWS)).toBe("miss");
  });

  it("treats each boundary as inclusive", () => {
    expect(judge(HIT_WINDOWS.perfect, HIT_WINDOWS)).toBe("perfect");
    expect(judge(HIT_WINDOWS.great, HIT_WINDOWS)).toBe("great");
    expect(judge(HIT_WINDOWS.good, HIT_WINDOWS)).toBe("good");
  });
});

describe("chart files", () => {
  const file: ChartFile = {
    songId: "s",
    bpm: 120,
    subdivision: 4,
    beatsMs: [0, 500, 1000],
    lanes: {
      drums: { easy: [0, 500], god: [0, 250, 500, 750] },
      bass: { easy: [] },
    },
  };

  it("reads the times for a lane and difficulty", () => {
    expect(laneTimes(file, "drums", "easy")).toEqual([0, 500]);
    expect(laneTimes(file, "drums", "god")).toHaveLength(4);
  });

  it("returns nothing for an uncharted lane or missing difficulty", () => {
    expect(laneTimes(file, "vocals", "easy")).toEqual([]);
    expect(laneTimes(file, "drums", "expert")).toEqual([]);
  });

  it("knows which lanes were charted", () => {
    expect(isChartedLane(file, "drums")).toBe(true);
    expect(isChartedLane(file, "bass")).toBe(false);
    expect(isChartedLane(file, "piano")).toBe(false);
  });

  it("builds a playable chart straight from the file", () => {
    const chart = chartFromFile(file, "drums", "god", "abcd");
    expect(chart.notes.map((n) => n.char)).toEqual(["a", "b", "c", "d"]);
    expect(chart.notes.map((n) => n.timeMs)).toEqual([0, 250, 500, 750]);
  });

  it("yields an empty chart for an uncharted lane", () => {
    expect(chartFromFile(file, "vocals", "easy", "abcd").notes).toEqual([]);
  });
});

describe("chartNotes", () => {
  it("lands each letter on the hit line at its charted time", () => {
    const notes = chartNotes(buildChart("ab", [1000, 1250]), 600);
    expect(notes.map((n) => n.hitMs)).toEqual([1000, 1250]);
    expect(notes.map((n) => n.spawnMs)).toEqual([400, 650]);
  });

  it("gives every note a single-character span", () => {
    const notes = chartNotes(buildChart("ab", [0, 250]), 600);
    expect(notes.map((n) => n.word)).toEqual(["a", "b"]);
    expect(notes.map((n) => [n.charStart, n.charEnd])).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });
});

describe("travelMsForChart", () => {
  it("keeps roughly the requested number of notes in flight", () => {
    const eighths = buildChart("abcdefgh", grid(8, 250), { loop: true });
    expect(travelMsForChart(eighths, 8)).toBe(2000);
  });

  it("shortens travel for dense charts and lengthens it for sparse ones", () => {
    const dense = buildChart("abcdefgh", grid(8, 125), { loop: true });
    const sparse = buildChart("abcdefgh", grid(8, 500), { loop: true });
    expect(travelMsForChart(dense)).toBeLessThan(travelMsForChart(sparse));
  });

  it("ignores an outlying rest by taking the median gap", () => {
    const chart = buildChart("abcd", [0, 250, 500, 30000], { loop: true });
    expect(travelMsForChart(chart, 8)).toBe(2000);
  });

  it("stays within sane bounds", () => {
    const veryDense = buildChart("abcd", grid(4, 5), { loop: true });
    const verySparse = buildChart("abcd", grid(4, 20000), { loop: true });
    expect(travelMsForChart(veryDense)).toBe(1100);
    expect(travelMsForChart(verySparse)).toBe(4000);
  });

  it("falls back for a chart with fewer than two notes", () => {
    expect(travelMsForChart(buildChart("a", [0]))).toBe(4000);
  });
});
