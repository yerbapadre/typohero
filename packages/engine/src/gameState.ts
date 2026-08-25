// Game state machine: lobby → countdown → playing → results. Shape TBD.

import type { InstrumentLane } from "./track";

export type Phase = "lobby" | "countdown" | "playing" | "results";

export type Player = { id: string; name: string; lane: InstrumentLane | null };

export type GameSnapshot = { phase: Phase; players: Player[] };
