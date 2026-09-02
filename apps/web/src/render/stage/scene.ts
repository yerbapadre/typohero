import type { CharState, Note } from "@typohero/engine";

// Where a lane's frog is standing. `xPercent` is null until somebody has
// actually walked it — the renderer then parks it at the lane's home slot.
export type StagePerformerView = {
  image: string | null;
  xPercent: number | null;
  yPercent: number;
  facing: 1 | -1;
};

// What the canvas needs to draw one player's track. `displayChars` is only
// populated for the local lane — remote lanes are reconstructed from the 20Hz
// LiveStat, so they render coarse (no per-character truth).
export type StageLaneView = {
  id: string;
  name: string;
  instrument: string;
  you: boolean;
  notes: Note[];
  travelMs: number;
  cursor: number;
  displayChars: CharState[] | null;
  elapsedMs: number;
  waitingMs: number | null;
  quality: number;
  streak: number;
  points: number;
  progress: number;
  /**
   * The tail of what this lane has typed, spaces restored, for the crowd-facing
   * ticker. Reconstructed from the passage and the cursor, so it reads as the
   * words the lane was *meant* to play — a remote lane's typos aren't on the
   * wire, and a stream of them would be unreadable anyway.
   */
  typed: string;
  performer: StagePerformerView;
};

export type StageScene = {
  lanes: StageLaneView[];
  travelMs: number;
  bandQuality: number;
};

// How long a word note takes to travel from the horizon to the hit line. Rhythm
// lanes derive their own travel time from how dense the chart is.
export const TRAVEL_MS = 6000;
