// Game events streamed over the transport. Shape TBD.

export type KeystrokeEvent = { type: "keystroke"; playerId: string; char: string };

export type GameEvent = KeystrokeEvent;
