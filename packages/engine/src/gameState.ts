import type { InstrumentLane } from "./song";
import type { Difficulty } from "./difficulty";
import type { Character } from "./profile";
import type { PerformanceStats, BandScore } from "./scoring";

export type Mode = "single" | "multi";

export type PerformancePhase = "countdown" | "playing" | "results";

export type Player = {
  id: string;
  name: string;
  character: Character;
  connected: boolean;
  profileId: string | null;
};

export type PlayerPerformance = {
  playerId: string;
  instrument: InstrumentLane;
  difficulty: Difficulty;
  stats: PerformanceStats;
};

export type Performance = {
  songId: string;
  textId: string;
  phase: PerformancePhase;
  startedAtEpochMs: number | null;
  playerPerformances: PlayerPerformance[];
  band: BandScore;
};

export type Session = {
  mode: Mode;
  players: Player[];
  performance: Performance | null;
};
