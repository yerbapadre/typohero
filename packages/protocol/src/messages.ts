import type { InstrumentLane, Difficulty, Character, RoomState, LiveStat } from "@typohero/engine";

export type ClientMsg =
  | { type: "join"; name: string; character?: Character; reconnectToken?: string }
  | { type: "updateProfile"; name: string; character: Character }
  | { type: "pickInstrument"; instrument: InstrumentLane }
  | { type: "pickPassage"; passageId: string }
  | { type: "setDifficulty"; difficulty: Difficulty }
  | { type: "ready"; ready: boolean }
  | { type: "stats"; stat: LiveStat }
  | { type: "proposeSong"; songId: string; durationMs: number }
  | { type: "confirmSong" }
  | { type: "proposeStart" }
  | { type: "confirmStart" }
  | { type: "setMode"; mode: "shared" | "distributed" }
  | { type: "assignAudio"; playerId: string; on: boolean }
  | { type: "nextSong" };

export type ServerMsg =
  | { type: "welcome"; playerId: string; roomId: string; reconnectToken: string; snapshot: RoomState }
  | { type: "session"; snapshot: RoomState }
  | { type: "countdown"; startAtEpochMs: number }
  | { type: "frame"; atMs: number; stats: Record<string, LiveStat> }
  | { type: "results"; final: Record<string, LiveStat> }
  | { type: "error"; code: string; message: string };
