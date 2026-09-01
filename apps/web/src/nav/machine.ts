import type { Character, Difficulty, InstrumentLane } from "@typohero/engine";

export type RunConfig = {
  character: Character | null;
  instrument: InstrumentLane | null;
  songId: string | null;
  passageId: string | null;
  difficulty: Difficulty;
};

export const defaultConfig: RunConfig = {
  character: null,
  instrument: null,
  songId: null,
  passageId: null,
  difficulty: "medium",
};
