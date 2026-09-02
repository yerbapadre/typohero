import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Room } from "../../net/useRoom";
import { FREE_FROG_IDS, FROGS, frogById } from "../../characters";
import { isUnlocked, useUnlocks } from "../../game/unlocks";
import { FrogArt } from "../../ui/FrogArt";
import { UnlockForm } from "../../ui/UnlockForm";
import { CabinetButton, CabinetPanel, CabinetStatus, CarouselArrow, RoomHeader } from "../../ui/cabinet";
import { Playground } from "./Playground";

const CHAR_KEY = "typohero:frog";

export function Lobby({ roomId, room }: { roomId: string; room: Room }) {
  const navigate = useNavigate();
  const snap = room.snapshot!;
  const me = snap.members.find((m) => m.id === room.playerId);
  const directing = me?.director ?? false;

  useUnlocks();

  // Which frog the carousel is showing. Locked frogs can be browsed but not
  // committed, so this floats free of the frog actually on the roster.
  const [view, setView] = useState(0);
  const syncedRef = useRef(false);

  const sendRef = useRef(room.send);
  sendRef.current = room.send;

  const committedFaceId = me?.character?.faceId;
  useEffect(() => {
    if (syncedRef.current || !committedFaceId) return;
    syncedRef.current = true;
    setView(Math.max(0, FROGS.findIndex((f) => f.id === committedFaceId)));
  }, [committedFaceId]);

  useEffect(() => {
    if (me && !me.character) {
      const stored = sessionStorage.getItem(CHAR_KEY);
      const id = stored && isUnlocked(stored) ? stored : FREE_FROG_IDS[0]!;
      sendRef.current({
        type: "updateProfile",
        name: me.name,
        character: { faceId: id, outfitId: "default", instrumentSkinId: "default" },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  const onMove = useCallback((x: number, y: number, facing: -1 | 1) => {
    sendRef.current({ type: "move", x, y, facing });
  }, []);

  if (!me) {
    return <CabinetStatus>entering {roomId}…</CabinetStatus>;
  }

  const band = snap.members.filter((m) => !m.director);
  const directors = snap.members.filter((m) => m.director);
  const myFrog = frogById(me.character?.faceId) ?? FROGS[0]!;
  const viewFrog = FROGS[view]!;
  const viewLocked = !isUnlocked(viewFrog.id);

  function setFrog(id: string) {
    sessionStorage.setItem(CHAR_KEY, id);
    room.send({
      type: "updateProfile",
      name: me!.name,
      character: { faceId: id, outfitId: "default", instrumentSkinId: "default" },
    });
  }

  // Browsing is free; only unlocked frogs get pushed to the roster.
  function moveView(step: 1 | -1) {
    const next = (view + step + FROGS.length) % FROGS.length;
    setView(next);
    const f = FROGS[next]!;
    if (isUnlocked(f.id)) setFrog(f.id);
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-5 bg-cabinet-bg px-6 pb-10 pt-10 font-pixel text-cabinet-text">
      <RoomHeader eyebrow="band lobby" code={roomId} caption="share this code with your band" />

      <div className="grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
        {/* bandmates */}
        <CabinetPanel tight title={`bandmates · ${band.length}`} className="flex h-full flex-col">
          <div className="flex flex-col gap-2">
            {[...band, ...directors].map((m) => {
              const f = frogById(m.character?.faceId);
              return (
                <div
                  key={m.id}
                  className={
                    "flex items-center gap-2 border-2 px-3 py-2 " +
                    (m.id === room.playerId ? "border-cabinet-border bg-cabinet-btn" : "border-transparent")
                  }
                >
                  {f ? (
                    <img src={f.image} alt="" className="h-8 w-8 shrink-0 object-contain" />
                  ) : (
                    <span className="h-8 w-8 shrink-0 bg-cabinet-frame" />
                  )}
                  <span
                    className={
                      "min-w-0 flex-1 truncate text-xs " +
                      (m.connected ? "" : "text-cabinet-text/40 line-through")
                    }
                  >
                    {m.id === snap.hostId ? "★ " : ""}
                    {m.name}
                    {m.id === room.playerId ? " (you)" : ""}
                    {m.director ? <span className="text-cabinet-text/40"> · 🎛 director</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
          {room.crowd.length > 0 && (
            <div className="mt-3 text-[10px] uppercase tracking-widest text-cabinet-text/40">
              👥 {room.crowd.length} watching · {room.crowd.map((c) => c.name).join(", ")}
            </div>
          )}
        </CabinetPanel>

        {/* your frog — or the desk, if you're running the show */}
        {directing ? (
          <CabinetPanel tight title="the desk" className="flex h-full flex-col">
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="text-4xl">🎛</div>
              <div className="text-[11px] uppercase tracking-widest text-cabinet-accent">directing</div>
              <div className="max-w-[16rem] font-mono text-[10px] normal-case text-cabinet-text/50">
                you run the song, the note style and the sound. no frog on stage, no lane to type.
              </div>
            </div>
            <div className="mt-3 border-t-2 border-cabinet-frame pt-3">
              <CabinetButton full onClick={() => room.send({ type: "setDirector", on: false })}>
                🎸 Join the band instead
              </CabinetButton>
            </div>
          </CabinetPanel>
        ) : (
        <CabinetPanel tight title="your frog" className="flex h-full flex-col">
          <div className="flex flex-1 items-center justify-center gap-4">
            <CarouselArrow dir="prev" label="previous frog" onClick={() => moveView(-1)} />
            <div className="flex w-40 flex-col items-center gap-2">
              <div className="relative flex h-28 items-center justify-center">
                <FrogArt frog={viewFrog} dimmed={viewLocked} className="h-28 w-auto" />
                {viewLocked && (
                  <span className="pointer-events-none absolute border-2 border-cabinet-accent bg-black/70 px-2 py-1 text-[9px] uppercase tracking-widest text-cabinet-accent">
                    🔒 Locked
                  </span>
                )}
              </div>
              <div className="text-center text-[11px] uppercase tracking-widest text-cabinet-accent">{viewFrog.name}</div>
              <div className="text-center font-mono text-[10px] normal-case text-cabinet-text/50">{viewFrog.tagline}</div>
            </div>
            <CarouselArrow dir="next" label="next frog" onClick={() => moveView(1)} />
          </div>
          {viewLocked && (
            <div className="mt-3 border-t-2 border-cabinet-frame pt-3">
              <UnlockForm
                frogName={viewFrog.name}
                onUnlocked={(f) => {
                  const i = FROGS.findIndex((x) => x.id === f.id);
                  if (i >= 0) setView(i);
                  setFrog(f.id);
                }}
              />
              <div className="mt-2 text-[10px] uppercase tracking-widest text-cabinet-text/30">
                still playing as {myFrog.name}
              </div>
            </div>
          )}
          <div className="mt-3 border-t-2 border-cabinet-frame pt-3">
            <CabinetButton full onClick={() => room.send({ type: "setDirector", on: true })}>
              🎛 Direct instead — stay off the stage
            </CabinetButton>
          </div>
        </CabinetPanel>
        )}
      </div>

      <div className="w-full">
        <Playground
          mode="band"
          youId={room.playerId}
          youName={me.name}
          youImage={myFrog.image}
          members={band}
          positions={room.positions}
          onMove={onMove}
          youOnStage={!directing}
          bandName={roomId}
          crowd={room.crowd}
        />
      </div>

      {snap.hostId === room.playerId && (
        <div className="flex w-full max-w-4xl items-center justify-between gap-4 border-[3px] border-cabinet-frame bg-black/15 px-5 py-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-cabinet-accent">Note style</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-cabinet-text/40">
              {snap.noteMode === "rhythm"
                ? "letters on the song's rhythm — needs a charted song"
                : "whole words at your difficulty's pace"}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {(["words", "rhythm"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => room.send({ type: "setNoteMode", noteMode: mode })}
                className={
                  "border-2 px-4 py-3 text-xs uppercase tracking-widest transition-colors " +
                  ((snap.noteMode ?? "words") === mode
                    ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
                    : "border-cabinet-border bg-cabinet-btn text-cabinet-text/60 hover:border-cabinet-accent")
                }
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {snap.hostId === room.playerId ? (
        <CabinetButton
          variant="primary"
          size="hero"
          full
          className="max-w-4xl"
          disabled={band.length === 0}
          onClick={() => room.send({ type: "lockIn" })}
        >
          {band.length === 0
            ? "waiting for a frog to join the band…"
            : `🎸 Lock In the Band — ${band.length} ${band.length === 1 ? "frog" : "frogs"}`}
        </CabinetButton>
      ) : (
        <div className="w-full max-w-4xl border-[3px] border-cabinet-frame bg-black/15 px-6 py-6 text-center text-sm uppercase tracking-[0.2em] text-cabinet-text/50">
          waiting for the host to lock in the band…
        </div>
      )}

      <CabinetButton variant="ghost" onClick={() => navigate("/")}>
        ← Leave band
      </CabinetButton>
    </div>
  );
}
