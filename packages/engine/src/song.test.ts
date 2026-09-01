import { describe, expect, it } from "vitest";
import {
  laneIsPresent,
  presentLanes,
  laneActiveAt,
  laneFirstActiveMs,
  type Song,
} from "./song";

const song: Song = {
  id: "s",
  title: "S",
  artist: "A",
  durationMs: 10000,
  lanes: [
    { instrument: "vocals", stem: "vocals.webm", present: true, active: [[2000, 5000], [7000, 9000]] },
    { instrument: "piano", stem: "piano.webm", present: false, active: [] },
    { instrument: "drums", stem: "drums.webm" },
  ],
};

describe("song lane helpers", () => {
  it("present reflects the flag, defaults true when absent", () => {
    expect(laneIsPresent(song, "vocals")).toBe(true);
    expect(laneIsPresent(song, "piano")).toBe(false);
    expect(laneIsPresent(song, "drums")).toBe(true);
    expect(laneIsPresent(song, "bass")).toBe(false);
  });

  it("presentLanes filters out absent stems", () => {
    expect(presentLanes(song)).toEqual(["vocals", "drums"]);
  });

  it("laneActiveAt checks segments, defaults true without data", () => {
    expect(laneActiveAt(song, "vocals", 0)).toBe(false);
    expect(laneActiveAt(song, "vocals", 3000)).toBe(true);
    expect(laneActiveAt(song, "vocals", 5000)).toBe(false);
    expect(laneActiveAt(song, "vocals", 8000)).toBe(true);
    expect(laneActiveAt(song, "drums", 0)).toBe(true);
  });

  it("laneFirstActiveMs returns first segment start, 0 without data", () => {
    expect(laneFirstActiveMs(song, "vocals")).toBe(2000);
    expect(laneFirstActiveMs(song, "drums")).toBe(0);
    expect(laneFirstActiveMs(song, "piano")).toBe(0);
  });
});
