import type { InstrumentLane } from "./song";
import type { Difficulty } from "./difficulty";
import type { Character } from "./profile";

export type Mode = "single" | "multi";

export type RoomPhase = "lobby" | "countdown" | "playing" | "results";

export type Member = {
  id: string;
  name: string;
  character: Character | null;
  connected: boolean;
  audioOutput: boolean;
  instrument: InstrumentLane | null;
  passageId: string | null;
  difficulty: Difficulty;
  ready: boolean;
};

export type SongProposal = { songId: string; durationMs: number; by: string };
export type StartProposal = { by: string };

export type RoomState = {
  hostId: string | null;
  phase: RoomPhase;
  members: Member[];
  songProposal: SongProposal | null;
  songId: string | null;
  songDurationMs: number | null;
  startProposal: StartProposal | null;
  startedAtEpochMs: number | null;
};

export type RoomAction =
  | { t: "join"; id: string; name: string; character?: Character }
  | { t: "leave"; id: string }
  | { t: "updateProfile"; id: string; name: string; character: Character }
  | { t: "pickInstrument"; id: string; instrument: InstrumentLane }
  | { t: "pickPassage"; id: string; passageId: string }
  | { t: "setDifficulty"; id: string; difficulty: Difficulty }
  | { t: "ready"; id: string; ready: boolean }
  | { t: "proposeSong"; id: string; songId: string; durationMs: number }
  | { t: "confirmSong"; id: string }
  | { t: "proposeStart"; id: string }
  | { t: "confirmStart"; id: string }
  | { t: "setMode"; id: string; mode: "shared" | "distributed" }
  | { t: "assignAudio"; id: string; playerId: string; on: boolean }
  | { t: "nextSong"; id: string }
  | { t: "songStarted" }
  | { t: "endPerformance" };

export const COUNTDOWN_MS = 3000;

export function initialRoom(): RoomState {
  return {
    hostId: null,
    phase: "lobby",
    members: [],
    songProposal: null,
    songId: null,
    songDurationMs: null,
    startProposal: null,
    startedAtEpochMs: null,
  };
}

function member(state: RoomState, id: string): Member | undefined {
  return state.members.find((m) => m.id === id);
}

function isHost(state: RoomState, id: string): boolean {
  return state.hostId === id;
}

function mapMember(state: RoomState, id: string, fn: (m: Member) => Member): RoomState {
  return { ...state, members: state.members.map((m) => (m.id === id ? fn(m) : m)) };
}

function allReady(state: RoomState): boolean {
  const active = state.members.filter((m) => m.connected);
  return active.length > 0 && active.every((m) => m.ready && m.instrument !== null);
}

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.t) {
    case "join": {
      const existing = member(state, action.id);
      if (existing) return mapMember(state, action.id, (m) => ({ ...m, connected: true }));
      const m: Member = {
        id: action.id,
        name: action.name,
        character: action.character ?? null,
        connected: true,
        audioOutput: false,
        instrument: null,
        passageId: null,
        difficulty: "medium",
        ready: false,
      };
      return {
        ...state,
        hostId: state.hostId ?? action.id,
        members: [...state.members, m],
      };
    }

    case "leave": {
      const members = state.members.map((m) =>
        m.id === action.id ? { ...m, connected: false } : m,
      );
      let hostId = state.hostId;
      if (state.hostId === action.id) {
        hostId = members.find((m) => m.connected)?.id ?? null;
      }
      return { ...state, members, hostId };
    }

    case "updateProfile":
      return mapMember(state, action.id, (m) => ({
        ...m,
        name: action.name,
        character: action.character,
      }));

    case "pickInstrument": {
      if (state.songId === null) return state;
      const taken = state.members.some(
        (m) => m.id !== action.id && m.connected && m.instrument === action.instrument,
      );
      if (taken) return state;
      return mapMember(state, action.id, (m) => ({
        ...m,
        instrument: action.instrument,
        ready: false,
      }));
    }

    case "pickPassage":
      return mapMember(state, action.id, (m) => ({ ...m, passageId: action.passageId }));

    case "setDifficulty":
      return mapMember(state, action.id, (m) => ({ ...m, difficulty: action.difficulty }));

    case "ready": {
      const m = member(state, action.id);
      if (!m || m.instrument === null) return state;
      return mapMember(state, action.id, (x) => ({ ...x, ready: action.ready }));
    }

    case "proposeSong": {
      const proposal: SongProposal = {
        songId: action.songId,
        durationMs: action.durationMs,
        by: action.id,
      };
      if (isHost(state, action.id)) return confirmSongInto({ ...state, songProposal: proposal });
      return { ...state, songProposal: proposal };
    }

    case "confirmSong": {
      const p = state.songProposal;
      if (!p) return state;
      if (p.by === action.id && !isHost(state, action.id)) return state;
      return confirmSongInto(state);
    }

    case "proposeStart": {
      if (!state.songId || !allReady(state)) return state;
      const proposal: StartProposal = { by: action.id };
      if (isHost(state, action.id)) return { ...state, startProposal: proposal, phase: "countdown" };
      return { ...state, startProposal: proposal };
    }

    case "confirmStart": {
      const p = state.startProposal;
      if (!p || !state.songId || !allReady(state)) return state;
      if (p.by === action.id && !isHost(state, action.id)) return state;
      return { ...state, phase: "countdown" };
    }

    case "setMode": {
      if (!isHost(state, action.id)) return state;
      const members = state.members.map((m, i) => ({
        ...m,
        audioOutput: action.mode === "distributed" ? true : i === 0,
      }));
      return { ...state, members };
    }

    case "assignAudio": {
      if (!isHost(state, action.id)) return state;
      return mapMember(state, action.playerId, (m) => ({ ...m, audioOutput: action.on }));
    }

    case "nextSong": {
      if (!isHost(state, action.id) || state.phase !== "results") return state;
      return {
        ...state,
        phase: "lobby",
        songProposal: null,
        songId: null,
        songDurationMs: null,
        startProposal: null,
        startedAtEpochMs: null,
        members: state.members.map((m) => ({ ...m, ready: false })),
      };
    }

    case "songStarted":
      if (state.phase !== "countdown") return state;
      return { ...state, phase: "playing" };

    case "endPerformance":
      return { ...state, phase: "results", startProposal: null };
  }
}

function confirmSongInto(state: RoomState): RoomState {
  const p = state.songProposal;
  if (!p) return state;
  return {
    ...state,
    songId: p.songId,
    songDurationMs: p.durationMs,
    songProposal: null,
    members: state.members.map((m) => ({ ...m, ready: false })),
  };
}

export function countdownToPlaying(state: RoomState, nowEpochMs: number): RoomState {
  if (state.phase !== "countdown") return state;
  return { ...state, startedAtEpochMs: nowEpochMs + COUNTDOWN_MS };
}
