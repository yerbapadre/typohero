import type { InstrumentLane } from "./song";
import type { Difficulty } from "./difficulty";
import type { Character } from "./profile";

export type Mode = "single" | "multi";

export type RoomPhase = "lobby" | "setup" | "countdown" | "playing" | "results";

/** Whether lanes type whole words on a WPM pace, or single letters on the song's rhythm. */
export type NoteMode = "words" | "rhythm";

export type Member = {
  id: string;
  name: string;
  character: Character | null;
  connected: boolean;
  /** A director runs the show — the song, the note style, the sound — but takes
   *  no lane and never walks out onto the riser. */
  director: boolean;
  audioOutput: boolean;
  instrument: InstrumentLane | null;
  passageId: string | null;
  difficulty: Difficulty;
  ready: boolean;
  songCursor: string | null;
  songVote: string | null;
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
  noteMode: NoteMode;
};

export type RoomAction =
  | { t: "join"; id: string; name: string; character?: Character; director?: boolean }
  | { t: "leave"; id: string }
  | { t: "lockIn"; id: string }
  | { t: "backToLobby"; id: string }
  | { t: "clearSong"; id: string }
  | { t: "updateProfile"; id: string; name: string; character: Character }
  | { t: "pickInstrument"; id: string; instrument: InstrumentLane }
  | { t: "pickPassage"; id: string; passageId: string }
  | { t: "setDifficulty"; id: string; difficulty: Difficulty }
  | { t: "setSongCursor"; id: string; songId: string }
  | { t: "voteSong"; id: string; songId: string }
  | { t: "ready"; id: string; ready: boolean }
  | { t: "setAudioOutput"; id: string; on: boolean }
  | { t: "setDirector"; id: string; on: boolean }
  | { t: "proposeSong"; id: string; songId: string; durationMs: number }
  | { t: "confirmSong"; id: string }
  | { t: "proposeStart"; id: string }
  | { t: "confirmStart"; id: string }
  | { t: "setMode"; id: string; mode: "shared" | "distributed" }
  | { t: "setNoteMode"; id: string; noteMode: NoteMode }
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
    noteMode: "words",
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

/** Everyone who actually plays: the roster minus the directors. */
export function bandMembers(members: Member[]): Member[] {
  return members.filter((m) => !m.director);
}

// Stepping behind the desk drops your instrument: the lane is freed for someone
// else, there is nothing left to ready up, and the desk gets the sound.
function setRole(m: Member, director: boolean): Member {
  if (m.director === director) return m;
  return {
    ...m,
    director,
    instrument: director ? null : m.instrument,
    ready: director ? false : m.ready,
    audioOutput: director ? true : m.audioOutput,
  };
}

function allReady(state: RoomState): boolean {
  const active = bandMembers(state.members).filter((m) => m.connected);
  return active.length > 0 && active.every((m) => m.ready && m.instrument !== null);
}

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.t) {
    case "join": {
      const existing = member(state, action.id);
      // A reconnect keeps whatever role you had, unless this join asked for a
      // different one — reopening the room as a director should switch you.
      if (existing) {
        return mapMember(state, action.id, (m) => {
          const back = { ...m, connected: true };
          return action.director === undefined ? back : setRole(back, action.director);
        });
      }
      const director = action.director ?? false;
      const m: Member = {
        id: action.id,
        name: action.name,
        character: action.character ?? null,
        connected: true,
        director,
        // A director is usually the machine wired to the PA, so it starts on.
        audioOutput: director,
        instrument: null,
        passageId: null,
        difficulty: "medium",
        ready: false,
        songCursor: null,
        songVote: null,
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

    case "lockIn": {
      if (!isHost(state, action.id) || state.phase !== "lobby") return state;
      return { ...state, phase: "setup" };
    }

    case "backToLobby": {
      if (!isHost(state, action.id) || state.phase !== "setup") return state;
      return {
        ...state,
        phase: "lobby",
        songProposal: null,
        songId: null,
        songDurationMs: null,
        members: state.members.map((m) => ({ ...m, ready: false, songCursor: null, songVote: null })),
      };
    }

    case "clearSong": {
      if (!isHost(state, action.id) || state.phase !== "setup") return state;
      return {
        ...state,
        songId: null,
        songDurationMs: null,
        songProposal: null,
        members: state.members.map((m) => ({ ...m, ready: false })),
      };
    }

    case "updateProfile":
      return mapMember(state, action.id, (m) => ({
        ...m,
        name: action.name,
        character: action.character,
      }));

    case "pickInstrument": {
      if (state.songId === null) return state;
      if (member(state, action.id)?.director) return state;
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

    case "setSongCursor":
      return mapMember(state, action.id, (m) => ({ ...m, songCursor: action.songId }));

    case "voteSong":
      return mapMember(state, action.id, (m) => ({ ...m, songVote: action.songId }));

    case "ready": {
      const m = member(state, action.id);
      if (!m || m.director || m.instrument === null) return state;
      return mapMember(state, action.id, (x) => ({ ...x, ready: action.ready }));
    }

    case "setAudioOutput":
      return mapMember(state, action.id, (m) => ({ ...m, audioOutput: action.on }));

    // Stepping behind the desk drops your instrument: the lane is freed for
    // someone else, and there is nothing left to ready up.
    case "setDirector": {
      if (state.phase !== "lobby" && state.phase !== "setup") return state;
      return mapMember(state, action.id, (m) => setRole(m, action.on));
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

    case "setNoteMode": {
      if (!isHost(state, action.id)) return state;
      if (state.phase !== "lobby" && state.phase !== "setup") return state;
      return { ...state, noteMode: action.noteMode };
    }

    case "setMode": {
      if (!isHost(state, action.id)) return state;
      if (action.mode === "distributed") {
        return { ...state, members: state.members.map((m) => ({ ...m, audioOutput: true })) };
      }
      // One machine carries the room: the director if there is one, since they
      // are already running the desk, otherwise whoever got here first.
      const speaker = state.members.find((m) => m.director) ?? state.members[0];
      return {
        ...state,
        members: state.members.map((m) => ({ ...m, audioOutput: m.id === speaker?.id })),
      };
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
