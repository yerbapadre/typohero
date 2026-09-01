import { describe, it, expect } from "vitest";
import { buildChart } from "./chart";
import {
  createRhythmRun,
  applyRhythmKeypress,
  expireRhythmNotes,
  rhythmQuality,
  liveStatFromRhythmRun,
  summarizeRhythmRun,
  notePoints,
  timingMultiplier,
} from "./rhythm";

const chartOf = (text: string, stepMs = 1000) =>
  buildChart(
    text,
    Array.from({ length: 64 }, (_, i) => i * stepMs),
  );

const run4 = () => createRhythmRun(chartOf("abcd"));

const press = (run: ReturnType<typeof run4>, char: string, atMs: number) =>
  applyRhythmKeypress(run, { char, atMs });

describe("applyRhythmKeypress", () => {
  it("grades a correct key by how close it landed", () => {
    expect(press(run4(), "a", 0).states[0]).toBe("perfect");
    expect(press(run4(), "a", 120).states[0]).toBe("great");
    expect(press(run4(), "a", -200).states[0]).toBe("good");
  });

  it("awards fewer points for looser timing", () => {
    const perfect = press(run4(), "a", 0).points;
    const great = press(run4(), "a", 120).points;
    const good = press(run4(), "a", 200).points;
    expect(perfect).toBeGreaterThan(great);
    expect(great).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(0);
  });

  it("fails the note on a wrong key inside the window and breaks the streak", () => {
    const after = press(press(run4(), "a", 0), "z", 1000);
    expect(after.states[1]).toBe("wrong");
    expect(after.streak).toBe(0);
    expect(after.resolved).toBe(2);
  });

  it("scores no points for a wrong key however well timed", () => {
    const after = press(run4(), "z", 0);
    expect(after.points).toBe(0);
    expect(after.resolved).toBe(1);
  });

  it("ignores a press that is too early to reach the note", () => {
    const before = run4();
    const after = press(before, "a", -900);
    expect(after).toBe(before);
  });

  it("advances one note per press, in order", () => {
    let run = run4();
    run = press(run, "a", 0);
    run = press(run, "b", 1000);
    expect(run.resolved).toBe(2);
    expect(run.states.slice(0, 2)).toEqual(["perfect", "perfect"]);
    expect(run.states[2]).toBe("pending");
  });

  it("builds a streak across clean hits and tracks the longest", () => {
    let run = run4();
    run = press(run, "a", 0);
    run = press(run, "b", 1000);
    run = press(run, "c", 2000);
    expect(run.streak).toBe(3);
    run = press(run, "z", 3000);
    expect(run.streak).toBe(0);
    expect(run.longestStreak).toBe(3);
  });

  it("records the signed delta so timing drift is measurable", () => {
    const early = press(run4(), "a", -60).lastHit;
    const late = press(run4(), "a", 60).lastHit;
    expect(early?.deltaMs).toBe(-60);
    expect(late?.deltaMs).toBe(60);
    expect(early?.judgment).toBe("perfect");
  });

  it("is a no-op once the chart is finished", () => {
    let run = createRhythmRun(chartOf("a"));
    run = press(run, "a", 0);
    expect(press(run, "a", 1000)).toBe(run);
  });

  it("does not mutate the run it is given", () => {
    const before = run4();
    press(before, "a", 0);
    expect(before.resolved).toBe(0);
    expect(before.states[0]).toBe("pending");
  });
});

describe("expireRhythmNotes", () => {
  it("leaves a note alone while its window is still open", () => {
    const before = run4();
    expect(expireRhythmNotes(before, 200)).toBe(before);
  });

  it("misses notes whose window has closed and breaks the streak", () => {
    const after = expireRhythmNotes(press(run4(), "a", 0), 2500);
    expect(after.states[1]).toBe("missed");
    expect(after.states[2]).toBe("missed");
    expect(after.resolved).toBe(3);
    expect(after.streak).toBe(0);
  });

  it("keeps points already earned", () => {
    const hit = press(run4(), "a", 0);
    expect(expireRhythmNotes(hit, 9000).points).toBe(hit.points);
  });

  it("stops at the end of the chart", () => {
    const after = expireRhythmNotes(run4(), 1_000_000);
    expect(after.resolved).toBe(4);
    expect(after.states.every((s) => s === "missed")).toBe(true);
  });
});

describe("rhythmQuality", () => {
  it("starts clean", () => {
    expect(rhythmQuality(run4())).toBe(1);
  });

  it("degrades on misses and recovers once clean hits fill the window", () => {
    const chart = buildChart(
      "abcdefghij",
      Array.from({ length: 30 }, (_, i) => i * 1000),
      { loop: true },
    );
    let run = createRhythmRun(chart);
    const hitNote = () => {
      const note = chart.notes[run.resolved]!;
      run = applyRhythmKeypress(run, { char: note.char, atMs: note.timeMs });
    };

    for (let i = 0; i < 10; i++) hitNote();
    expect(rhythmQuality(run)).toBe(1);

    run = expireRhythmNotes(run, chart.notes[12]!.timeMs + 500);
    const dip = rhythmQuality(run);
    expect(run.resolved).toBe(13);
    expect(dip).toBeLessThan(1);

    for (let i = 0; i < 10; i++) hitNote();
    expect(rhythmQuality(run)).toBeGreaterThan(dip);
    expect(rhythmQuality(run)).toBe(1);
  });

  it("punishes a wrong key harder than loose timing", () => {
    const loose = rhythmQuality(press(run4(), "a", 200));
    const wrong = rhythmQuality(press(run4(), "z", 0));
    expect(loose).toBeGreaterThan(wrong);
  });
});

describe("liveStatFromRhythmRun", () => {
  it("reports progress and accuracy over resolved notes", () => {
    const run = press(press(run4(), "a", 0), "z", 1000);
    const stat = liveStatFromRhythmRun(run);
    expect(stat.progress).toBe(0.5);
    expect(stat.accuracy).toBe(0.5);
    expect(stat.points).toBe(run.points);
  });

  it("is clean before the first note", () => {
    const stat = liveStatFromRhythmRun(run4());
    expect(stat.accuracy).toBe(1);
    expect(stat.progress).toBe(0);
  });

  it("survives an empty chart", () => {
    const stat = liveStatFromRhythmRun(createRhythmRun({ notes: [] }));
    expect(stat.progress).toBe(0);
    expect(stat.accuracy).toBe(1);
  });
});

describe("summarizeRhythmRun", () => {
  it("counts each judgment and keeps the timing bias signed", () => {
    let run = run4();
    run = press(run, "a", -60);
    run = press(run, "b", 1120);
    run = press(run, "z", 2000);
    run = expireRhythmNotes(run, 9000);

    const summary = summarizeRhythmRun(run);
    expect(summary.perfect).toBe(1);
    expect(summary.great).toBe(1);
    expect(summary.wrong).toBe(1);
    expect(summary.missed).toBe(1);
    expect(summary.total).toBe(4);
    expect(summary.meanDeltaMs).toBeCloseTo((-60 + 120 + 0) / 3);
    expect(summary.meanAbsDeltaMs).toBeCloseTo((60 + 120 + 0) / 3);
  });

  it("reports a clean slate for an untouched run", () => {
    const summary = summarizeRhythmRun(run4());
    expect(summary.accuracy).toBe(1);
    expect(summary.points).toBe(0);
    expect(summary.meanDeltaMs).toBe(0);
  });
});

describe("scoring helpers", () => {
  it("ranks the timing multipliers", () => {
    expect(timingMultiplier("perfect")).toBeGreaterThan(timingMultiplier("great"));
    expect(timingMultiplier("great")).toBeGreaterThan(timingMultiplier("good"));
    expect(timingMultiplier("miss")).toBe(0);
  });

  it("compounds streak and timing", () => {
    expect(notePoints(50, "perfect")).toBeGreaterThan(notePoints(1, "perfect"));
    expect(notePoints(50, "good")).toBeLessThan(notePoints(50, "perfect"));
    expect(notePoints(50, "miss")).toBe(0);
  });
});
