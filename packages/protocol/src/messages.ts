import type {
  InstrumentLane,
  Difficulty,
  Character,
  RoomState,
  LiveStat,
  NoteMode,
} from "@typohero/engine";

// Something a crowd frog can carry around the pit, grabbed at the bar.
export type CrowdItem = "drink" | "pizza";

// A spectator in the pit. Crowd frogs never join the roster, so everything
// about them — where they stand, what they carry, what they voted for — rides
// this channel instead of the room snapshot.
export type CrowdMember = {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: number;
  item?: CrowdItem;
  /** Song this spectator is rooting for while the setlist is still open. */
  vote?: string;
};

export type ClientMsg =
  | { type: "join"; name: string; character?: Character; reconnectToken?: string }
  | { type: "spectate"; name?: string; id?: string; observer?: boolean }
  | { type: "move"; x: number; y: number; facing: -1 | 1 }
  | { type: "equip"; item: CrowdItem | null }
  | { type: "lockIn" }
  | { type: "backToLobby" }
  | { type: "clearSong" }
  | { type: "updateProfile"; name: string; character: Character }
  | { type: "pickInstrument"; instrument: InstrumentLane }
  | { type: "pickPassage"; passageId: string }
  | { type: "setDifficulty"; difficulty: Difficulty }
  | { type: "setSongCursor"; songId: string }
  | { type: "voteSong"; songId: string }
  | { type: "ready"; ready: boolean }
  | { type: "setAudioOutput"; on: boolean }
  | { type: "stats"; stat: LiveStat }
  | { type: "proposeSong"; songId: string; durationMs: number }
  | { type: "confirmSong" }
  | { type: "proposeStart" }
  | { type: "confirmStart" }
  | { type: "setMode"; mode: "shared" | "distributed" }
  | { type: "setNoteMode"; noteMode: NoteMode }
  | { type: "assignAudio"; playerId: string; on: boolean }
  | { type: "nextSong" };

export type ServerMsg =
  | { type: "welcome"; playerId: string; roomId: string; reconnectToken: string; snapshot: RoomState }
  | { type: "session"; snapshot: RoomState }
  | { type: "countdown"; startAtEpochMs: number }
  | { type: "frame"; atMs: number; stats: Record<string, LiveStat> }
  | { type: "results"; final: Record<string, LiveStat> }
  | { type: "crowd"; members: CrowdMember[] }
  | { type: "positions"; players: Record<string, { x: number; y: number; facing: number }> }
  | { type: "error"; code: string; message: string };
