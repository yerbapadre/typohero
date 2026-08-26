import { describe, it, expect } from "vitest";
import { initialRoom, roomReducer, countdownToPlaying, type RoomState } from "./room";

function run(state: RoomState, ...actions: Parameters<typeof roomReducer>[1][]): RoomState {
  return actions.reduce(roomReducer, state);
}

function lobbyWith(...names: string[]): RoomState {
  return run(
    initialRoom(),
    ...names.map((n) => ({ t: "join" as const, id: n, name: n })),
  );
}

describe("join & host", () => {
  it("first joiner becomes host", () => {
    const s = lobbyWith("a", "b");
    expect(s.hostId).toBe("a");
    expect(s.members.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("rejoin reconnects without duplicating", () => {
    let s = lobbyWith("a");
    s = run(s, { t: "leave", id: "a" });
    expect(s.members[0]!.connected).toBe(false);
    s = run(s, { t: "join", id: "a", name: "a" });
    expect(s.members).toHaveLength(1);
    expect(s.members[0]!.connected).toBe(true);
  });

  it("host leaving promotes the next connected member", () => {
    let s = lobbyWith("a", "b");
    s = run(s, { t: "leave", id: "a" });
    expect(s.hostId).toBe("b");
  });
});

describe("song propose/confirm", () => {
  it("host proposal auto-confirms", () => {
    let s = lobbyWith("a", "b");
    s = run(s, { t: "proposeSong", id: "a", songId: "chocolate" });
    expect(s.songId).toBe("chocolate");
    expect(s.songProposal).toBeNull();
  });

  it("non-host proposal waits and cannot self-confirm", () => {
    let s = lobbyWith("a", "b");
    s = run(s, { t: "proposeSong", id: "b", songId: "chocolate" });
    expect(s.songId).toBeNull();
    expect(s.songProposal).toEqual({ songId: "chocolate", by: "b" });
    s = run(s, { t: "confirmSong", id: "b" });
    expect(s.songId).toBeNull();
  });

  it("another member can confirm a non-host proposal", () => {
    let s = lobbyWith("a", "b", "c");
    s = run(s, { t: "proposeSong", id: "b", songId: "chocolate" });
    s = run(s, { t: "confirmSong", id: "c" });
    expect(s.songId).toBe("chocolate");
  });

  it("host can confirm a non-host proposal", () => {
    let s = lobbyWith("a", "b");
    s = run(s, { t: "proposeSong", id: "b", songId: "chocolate" });
    s = run(s, { t: "confirmSong", id: "a" });
    expect(s.songId).toBe("chocolate");
  });
});

describe("instrument gating", () => {
  it("cannot pick an instrument before a song is confirmed", () => {
    let s = lobbyWith("a");
    s = run(s, { t: "pickInstrument", id: "a", instrument: "vocals" });
    expect(s.members[0]!.instrument).toBeNull();
  });

  it("can pick once a song is confirmed", () => {
    let s = lobbyWith("a");
    s = run(s, { t: "proposeSong", id: "a", songId: "chocolate" });
    s = run(s, { t: "pickInstrument", id: "a", instrument: "vocals" });
    expect(s.members[0]!.instrument).toBe("vocals");
  });

  it("rejects an instrument already taken by another member", () => {
    let s = lobbyWith("a", "b");
    s = run(s, { t: "proposeSong", id: "a", songId: "chocolate" });
    s = run(s, { t: "pickInstrument", id: "a", instrument: "vocals" });
    s = run(s, { t: "pickInstrument", id: "b", instrument: "vocals" });
    expect(s.members[1]!.instrument).toBeNull();
  });

  it("confirming a new song resets ready", () => {
    let s = lobbyWith("a");
    s = run(
      s,
      { t: "proposeSong", id: "a", songId: "chocolate" },
      { t: "pickInstrument", id: "a", instrument: "vocals" },
      { t: "ready", id: "a", ready: true },
    );
    expect(s.members[0]!.ready).toBe(true);
    s = run(s, { t: "proposeSong", id: "a", songId: "other-song" });
    expect(s.members[0]!.ready).toBe(false);
  });
});

describe("start propose/confirm & gating", () => {
  function readyBand(): RoomState {
    return run(
      lobbyWith("a", "b"),
      { t: "proposeSong", id: "a", songId: "chocolate" },
      { t: "pickInstrument", id: "a", instrument: "vocals" },
      { t: "pickInstrument", id: "b", instrument: "drums" },
      { t: "ready", id: "a", ready: true },
      { t: "ready", id: "b", ready: true },
    );
  }

  it("host start goes straight to countdown", () => {
    const s = run(readyBand(), { t: "proposeStart", id: "a" });
    expect(s.phase).toBe("countdown");
  });

  it("start is blocked until everyone is ready", () => {
    let s = run(
      lobbyWith("a", "b"),
      { t: "proposeSong", id: "a", songId: "chocolate" },
      { t: "pickInstrument", id: "a", instrument: "vocals" },
      { t: "ready", id: "a", ready: true },
    );
    s = run(s, { t: "proposeStart", id: "a" });
    expect(s.phase).toBe("lobby");
  });

  it("non-host start needs a second confirm", () => {
    let s = readyBand();
    s = run(s, { t: "proposeStart", id: "b" });
    expect(s.phase).toBe("lobby");
    s = run(s, { t: "confirmStart", id: "a" });
    expect(s.phase).toBe("countdown");
  });
});

describe("audio output modes", () => {
  it("distributed turns everyone on; shared turns only the first on", () => {
    let s = lobbyWith("a", "b", "c");
    s = run(s, { t: "setMode", id: "a", mode: "distributed" });
    expect(s.members.every((m) => m.audioOutput)).toBe(true);
    s = run(s, { t: "setMode", id: "a", mode: "shared" });
    expect(s.members.map((m) => m.audioOutput)).toEqual([true, false, false]);
  });

  it("host can assign audio output to another player", () => {
    let s = lobbyWith("a", "b");
    s = run(s, { t: "assignAudio", id: "a", playerId: "b", on: true });
    expect(s.members[1]!.audioOutput).toBe(true);
  });

  it("non-host cannot assign audio output", () => {
    let s = lobbyWith("a", "b");
    s = run(s, { t: "assignAudio", id: "b", playerId: "b", on: true });
    expect(s.members[1]!.audioOutput).toBe(false);
  });
});

describe("lifecycle", () => {
  it("countdown sets a start timestamp, then songStarted moves to playing", () => {
    let s = run(
      lobbyWith("a"),
      { t: "proposeSong", id: "a", songId: "chocolate" },
      { t: "pickInstrument", id: "a", instrument: "vocals" },
      { t: "ready", id: "a", ready: true },
      { t: "proposeStart", id: "a" },
    );
    s = countdownToPlaying(s, 1000);
    expect(s.startedAtEpochMs).toBe(4000);
    s = run(s, { t: "songStarted" });
    expect(s.phase).toBe("playing");
    s = run(s, { t: "endPerformance" });
    expect(s.phase).toBe("results");
  });

  it("nextSong returns to lobby and clears song state", () => {
    let s = run(
      lobbyWith("a"),
      { t: "proposeSong", id: "a", songId: "chocolate" },
      { t: "pickInstrument", id: "a", instrument: "vocals" },
      { t: "ready", id: "a", ready: true },
      { t: "proposeStart", id: "a" },
      { t: "endPerformance" },
      { t: "nextSong", id: "a" },
    );
    expect(s.phase).toBe("lobby");
    expect(s.songId).toBeNull();
    expect(s.members[0]!.ready).toBe(false);
  });
});
