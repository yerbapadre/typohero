import { INSTRUMENT_LANES, type InstrumentLane } from "@typohero/engine";
import type { Room } from "../../net/useRoom";
import { useSongs } from "../../net/useSongs";

export function Lobby({ roomId, room }: { roomId: string; room: Room }) {
  const snap = room.snapshot!;
  const songs = useSongs();
  const me = snap.members.find((m) => m.id === room.playerId);
  const isHost = snap.hostId === room.playerId;
  const takenLanes = new Set(
    snap.members.filter((m) => m.id !== room.playerId && m.instrument).map((m) => m.instrument),
  );

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-neutral-900 py-16 text-white">
      <div className="text-center">
        <div className="text-sm text-neutral-500">room code</div>
        <div className="font-mono text-4xl tracking-widest">{roomId}</div>
      </div>

      <div className="flex flex-col gap-1 font-mono text-sm">
        {snap.members.map((m) => (
          <div key={m.id} className={m.connected ? "" : "text-neutral-600 line-through"}>
            {m.id === snap.hostId ? "★ " : "  "}
            {m.name}
            {m.id === room.playerId ? " (you)" : ""}
            {" · "}
            {m.instrument ?? "no instrument"}
            {" · "}
            {m.difficulty}
            {m.ready ? " · ✓ready" : ""}
            {m.audioOutput ? " · 🔊" : ""}
          </div>
        ))}
      </div>

      {!snap.songId ? (
        <div className="flex flex-col items-center gap-3">
          <div className="text-neutral-400">pick a song</div>
          <div className="flex gap-3">
            {songs === null ? (
              <span className="text-neutral-600">loading…</span>
            ) : songs.length === 0 ? (
              <span className="text-neutral-600">no songs</span>
            ) : (
              songs.map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    room.send({ type: "proposeSong", songId: s.id, durationMs: s.durationMs })
                  }
                >
                  {s.title} — {s.artist}
                </button>
              ))
            )}
          </div>
          {snap.songProposal && (
            <div className="text-sm text-amber-400">
              proposed: {snap.songProposal.songId}
              {snap.songProposal.by !== room.playerId || isHost ? (
                <button className="ml-2 underline" onClick={() => room.send({ type: "confirmSong" })}>
                  confirm
                </button>
              ) : (
                <span className="ml-2 text-neutral-500">waiting for confirm…</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="text-neutral-400">song: {snap.songId}</div>

          <div className="flex flex-wrap justify-center gap-2">
            {INSTRUMENT_LANES.map((lane: InstrumentLane) => (
              <button
                key={lane}
                disabled={takenLanes.has(lane)}
                onClick={() => room.send({ type: "pickInstrument", instrument: lane })}
                className={
                  me?.instrument === lane
                    ? "text-sky-400"
                    : takenLanes.has(lane)
                      ? "text-neutral-700"
                      : "text-neutral-400"
                }
              >
                {lane}
              </button>
            ))}
          </div>

          <button
            disabled={!me?.instrument}
            onClick={() => room.send({ type: "ready", ready: !me?.ready })}
            className={me?.ready ? "text-green-400" : "text-white"}
          >
            {me?.ready ? "✓ ready" : "ready up"}
          </button>

          {isHost && (
            <div className="mt-4 flex flex-col items-center gap-2 text-sm">
              <div className="flex gap-2">
                <button onClick={() => room.send({ type: "setMode", mode: "shared" })}>
                  shared audio
                </button>
                <button onClick={() => room.send({ type: "setMode", mode: "distributed" })}>
                  distributed audio
                </button>
              </div>
              <button className="text-lg text-green-400" onClick={() => room.send({ type: "proposeStart" })}>
                ▶ start performance
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
