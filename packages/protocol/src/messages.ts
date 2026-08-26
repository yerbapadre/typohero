import type { Session, InstrumentLane, Difficulty, PerformanceStats } from "@typohero/engine";

export type ClientMsg =
  | { type: "join"; role: "player" | "stage"; name: string }
  | { type: "pickInstrument"; instrument: InstrumentLane }
  | { type: "setDifficulty"; difficulty: Difficulty }
  | { type: "ready" }
  | { type: "stats"; stats: PerformanceStats };

export type ServerMsg =
  | { type: "welcome"; playerId: string; roomId: string }
  | { type: "session"; session: Session };
