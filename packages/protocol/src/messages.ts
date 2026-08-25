import type { GameSnapshot } from "@typohero/engine";
import type { GameEvent } from "./events";

export type ClientMsg =
  | { type: "join"; role: "player" | "stage"; name: string }
  | { type: "event"; event: GameEvent };

export type ServerMsg =
  | { type: "welcome"; playerId: string; roomId: string }
  | { type: "snapshot"; snapshot: GameSnapshot };
