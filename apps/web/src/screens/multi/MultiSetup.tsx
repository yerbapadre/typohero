import { useEffect, useRef } from "react";
import {
  INSTRUMENT_LANES,
  presentLanes,
  type Difficulty,
  type InstrumentLane,
} from "@typohero/engine";
import type { Room } from "../../net/useRoom";
import { useSongs } from "../../net/useSongs";
import { useSongPreview } from "../../game/useSongPreview";
import { tallyCrowdVotes } from "../../game/crowdVotes";
import { frogById } from "../../characters";
import { InstrumentGrid } from "../../ui/InstrumentGrid";
import { CabinetButton, CabinetPanel } from "../../ui/cabinet";
import { SongCard } from "../SongCard";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert", "god"];

export function MultiSetup({ room }: { room: Room }) {
  const snap = room.snapshot!;
  const songs = useSongs();
  const me = snap.members.find((m) => m.id === room.playerId);
  const isHost = snap.hostId === room.playerId;
  const song = songs?.find((s) => s.id === snap.songId) ?? null;
  const available = new Set<InstrumentLane>(song ? presentLanes(song) : INSTRUMENT_LANES);
  const connected = snap.members.filter((m) => m.connected);
  const crowdTally = tallyCrowdVotes(room.crowd);
  const readyCount = connected.filter((m) => m.ready && m.instrument).length;
  const allReady = connected.length > 0 && readyCount === connected.length;

  // preview the song under your cursor, just like single-player
  const previewSong = !snap.songId ? (songs?.find((s) => s.id === me?.songCursor) ?? null) : null;
  useSongPreview(previewSong);

  const sendRef = useRef(room.send);
  sendRef.current = room.send;
  const kbRef = useRef({ songs, me, isHost, songId: snap.songId });
  kbRef.current = { songs, me, isHost, songId: snap.songId };

  // give each member a starting cursor
  useEffect(() => {
    if (!snap.songId && me && !me.songCursor && songs && songs.length > 0) {
      sendRef.current({ type: "setSongCursor", songId: songs[0]!.id });
    }
  }, [snap.songId, me?.songCursor, songs?.length, me]);

  // arrows move your cursor; enter plays (host) or votes (bandmate)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const st = kbRef.current;
      const { songs, me } = st;
      if (st.songId || !songs || songs.length === 0 || !me) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const cur = Math.max(0, songs.findIndex((s) => s.id === me.songCursor));
        const next =
          e.key === "ArrowDown" ? (cur + 1) % songs.length : (cur - 1 + songs.length) % songs.length;
        sendRef.current({ type: "setSongCursor", songId: songs[next]!.id });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const s = songs.find((x) => x.id === (me.songCursor ?? songs[0]!.id))!;
        if (st.isHost) sendRef.current({ type: "proposeSong", songId: s.id, durationMs: s.durationMs });
        else sendRef.current({ type: "voteSong", songId: s.id });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!me) return null;

  const takenLanes = new Set<InstrumentLane>(
    snap.members.flatMap((m) =>
      m.id !== room.playerId && m.connected && m.instrument ? [m.instrument] : [],
    ),
  );

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-cabinet-bg px-6 pb-12 pt-12 font-pixel text-cabinet-text">
      <header className="text-center">
        <div className="text-xs uppercase tracking-widest text-cabinet-text/40">band setup</div>
        <h1 className="mt-2 text-2xl font-bold tracking-wide text-white md:text-3xl">
          {snap.songId ? (
            <>
              YOUR <span className="text-cabinet-accent">PART</span>
            </>
          ) : (
            <>
              PICK A <span className="text-cabinet-accent">SONG</span>
            </>
          )}
        </h1>
      </header>

      {/* ready strip */}
      <div className="flex flex-wrap justify-center gap-2">
        {snap.members.map((m) => {
          const f = frogById(m.character?.faceId);
          return (
            <div
              key={m.id}
              className={
                "flex items-center gap-1.5 border-2 px-2 py-1 text-[10px] uppercase tracking-widest " +
                (m.ready ? "border-cabinet-accent text-cabinet-accent" : "border-cabinet-border text-cabinet-text/50")
              }
            >
              {f && <img src={f.image} alt="" className="h-4 w-4 object-contain" />}
              {m.name}
              {m.ready ? " ✓" : ""}
            </div>
          );
        })}
      </div>

      {!snap.songId ? (
        <>
          <div className="max-w-md text-center text-[11px] uppercase tracking-widest text-cabinet-text/40">
            {isHost ? "your pick plays · ↑↓ to move · enter to lock in" : "↑↓ to browse · enter to vote · host picks the song"}
            {room.crowd.length > 0 && (
              <div className="mt-1 text-cabinet-text/30">
                👥 {room.crowd.length} in the pit voting too
              </div>
            )}
          </div>
          <CabinetPanel tight className="w-full max-w-md">
            <div className="flex max-h-[48vh] flex-col gap-2 overflow-y-auto">
              {songs === null ? (
                <span className="py-6 text-center text-xs uppercase tracking-widest text-cabinet-text/40">loading…</span>
              ) : songs.length === 0 ? (
                <span className="py-6 text-center text-xs uppercase tracking-widest text-cabinet-text/40">no songs</span>
              ) : (
                songs.map((s) => {
                  const cursorsHere = snap.members.filter((m) => m.connected && m.songCursor === s.id);
                  const votes = snap.members.filter((m) => m.songVote === s.id).length;
                  const hostCursor = snap.members.find((m) => m.id === snap.hostId)?.songCursor;
                  return (
                    <SongCard
                      key={s.id}
                      song={s}
                      active={hostCursor === s.id}
                      onClick={() => {
                        room.send({ type: "setSongCursor", songId: s.id });
                        if (isHost) room.send({ type: "proposeSong", songId: s.id, durationMs: s.durationMs });
                        else room.send({ type: "voteSong", songId: s.id });
                      }}
                      badge={
                        <div className="flex items-center gap-1.5">
                          {cursorsHere.map((m) => {
                            const f = frogById(m.character?.faceId);
                            const host = m.id === snap.hostId;
                            const mine = m.id === room.playerId;
                            return (
                              <span
                                key={m.id}
                                className={
                                  "inline-flex h-6 w-6 items-center justify-center " +
                                  (host
                                    ? "ring-2 ring-cabinet-accent"
                                    : mine
                                      ? "opacity-80 ring-1 ring-cabinet-text/50"
                                      : "opacity-40")
                                }
                                title={m.name}
                              >
                                {f ? <img src={f.image} alt="" className="h-6 w-6 object-contain" /> : null}
                              </span>
                            );
                          })}
                          {votes > 0 && (
                            <span className="border-2 border-cabinet-accent px-1.5 text-[10px] font-bold text-cabinet-accent">
                              ♥ {votes}
                            </span>
                          )}
                          {(crowdTally[s.id] ?? 0) > 0 && (
                            <span
                              className="border-2 border-cabinet-border px-1.5 text-[10px] font-bold text-cabinet-text/60"
                              title="votes from the crowd"
                            >
                              👥 {crowdTally[s.id]}
                            </span>
                          )}
                        </div>
                      }
                    />
                  );
                })
              )}
            </div>
          </CabinetPanel>
        </>
      ) : (
        <>
          <InstrumentGrid
            value={me.instrument ?? null}
            available={available}
            taken={takenLanes}
            onPick={(lane) => room.send({ type: "pickInstrument", instrument: lane })}
          />

          {isHost && (
            <CabinetButton variant="ghost" onClick={() => room.send({ type: "clearSong" })}>
              ← Change song
            </CabinetButton>
          )}

          {/* the band — each member picks difficulty, audio, and readies up */}
          <CabinetPanel tight title="the band" className="w-full max-w-md">
            <div className="flex flex-col gap-2">
              {snap.members.map((m) => {
                const mine = m.id === room.playerId;
                const f = frogById(m.character?.faceId);
                return (
                  <div key={m.id} className="border-2 border-cabinet-border bg-cabinet-btn p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-xs">
                        {f && <img src={f.image} alt="" className="h-6 w-6 shrink-0 object-contain" />}
                        <span className="truncate">
                          {m.id === snap.hostId ? "★ " : ""}
                          {m.name}
                          {mine ? " (you)" : ""}
                          <span className="text-cabinet-text/40"> · {m.instrument ?? "no instrument"}</span>
                        </span>
                      </span>
                      {mine ? (
                        <CabinetButton
                          size="sm"
                          selected={m.ready}
                          disabled={!m.instrument}
                          onClick={() => room.send({ type: "ready", ready: !m.ready })}
                          className="shrink-0"
                        >
                          {m.ready ? "✓ Ready" : "Ready"}
                        </CabinetButton>
                      ) : (
                        <span
                          className={
                            "shrink-0 text-[10px] uppercase tracking-widest " +
                            (m.ready ? "text-cabinet-accent" : "text-cabinet-text/30")
                          }
                        >
                          {m.ready ? "ready" : "…"}
                        </span>
                      )}
                    </div>

                    {mine ? (
                      <div className="mt-3 flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1">
                          {DIFFICULTIES.map((d) => (
                            <CabinetButton
                              key={d}
                              size="sm"
                              selected={m.difficulty === d}
                              onClick={() => room.send({ type: "setDifficulty", difficulty: d })}
                            >
                              {d}
                            </CabinetButton>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <CabinetButton
                            size="sm"
                            selected={m.audioOutput}
                            onClick={() => room.send({ type: "setAudioOutput", on: true })}
                          >
                            Play audio
                          </CabinetButton>
                          <CabinetButton
                            size="sm"
                            selected={!m.audioOutput}
                            onClick={() => room.send({ type: "setAudioOutput", on: false })}
                          >
                            No audio (same room)
                          </CabinetButton>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-[10px] uppercase tracking-widest text-cabinet-text/40">
                        {m.difficulty} · {m.audioOutput ? "🔊 audio" : "muted"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CabinetPanel>

          {isHost && (
            <CabinetButton
              variant="primary"
              full
              className="max-w-md"
              disabled={!allReady}
              onClick={() => room.send({ type: "proposeStart" })}
            >
              {allReady ? "▶ Start the Show" : `waiting · ${readyCount}/${connected.length} ready`}
            </CabinetButton>
          )}
        </>
      )}

      {isHost && (
        <CabinetButton variant="ghost" onClick={() => room.send({ type: "backToLobby" })}>
          ← Back to lobby
        </CabinetButton>
      )}
    </div>
  );
}
