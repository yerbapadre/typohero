import type { CharState, Note } from "@typohero/engine";

// What the canvas needs to draw one player's track. `displayChars` is only
// populated for the local lane — remote lanes are reconstructed from the 20Hz
// LiveStat, so they render coarse (no per-character truth).
export type StageLaneView = {
  id: string;
  name: string;
  instrument: string;
  you: boolean;
  notes: Note[];
  cursor: number;
  displayChars: CharState[] | null;
  elapsedMs: number;
  waitingMs: number | null;
  quality: number;
  streak: number;
  points: number;
  progress: number;
};

export type StageScene = {
  lanes: StageLaneView[];
  travelMs: number;
  bandQuality: number;
};

// How long a note takes to travel from the horizon to the hit line.
export const TRAVEL_MS = 6000;
