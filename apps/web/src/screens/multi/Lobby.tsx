import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Room } from "../../net/useRoom";
import { FROGS, frogById } from "../../characters";
import { Playground } from "./Playground";

const CHAR_KEY = "typohero:frog";

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col border-[3px] border-cabinet-frame bg-black/15 p-4 shadow-[6px_6px_0_var(--cab-shadow)]">
      {title && <div className="mb-3 text-xs uppercase tracking-widest text-cabinet-accent">{title}</div>}
      {children}
    </div>
  );
}

export function Lobby({ roomId, room }: { roomId: string; room: Room }) {
  const navigate = useNavigate();
  const snap = room.snapshot!;
  const me = snap.members.find((m) => m.id === room.playerId);

  const sendRef = useRef(room.send);
  sendRef.current = room.send;

  useEffect(() => {
    if (me && !me.character) {
      const id = sessionStorage.getItem(CHAR_KEY) ?? FROGS[0]!.id;
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
    return (
      <div className="flex h-screen items-center justify-center bg-cabinet-bg font-pixel text-sm uppercase tracking-widest text-cabinet-text/50">
        entering {roomId}…
      </div>
    );
  }

  const myFrog = frogById(me.character?.faceId) ?? FROGS[0]!;
  const frogIndex = Math.max(0, FROGS.findIndex((f) => f.id === me.character?.faceId));

  function setFrog(id: string) {
    sessionStorage.setItem(CHAR_KEY, id);
    room.send({
      type: "updateProfile",
      name: me!.name,
      character: { faceId: id, outfitId: "default", instrumentSkinId: "default" },
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-5 bg-cabinet-bg px-6 pb-10 pt-10 font-pixel text-cabinet-text">
      <header className="text-center">
        <div className="text-xs uppercase tracking-widest text-cabinet-text/40">band lobby</div>
        <div className="mt-1 text-4xl font-bold tracking-[0.3em] text-cabinet-accent md:text-5xl">{roomId}</div>
        <div className="mt-1 text-[11px] uppercase tracking-widest text-cabinet-text/40">
          share this code with your band
        </div>
      </header>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
        {/* bandmates */}
        <Panel title={`bandmates · ${snap.members.length}`}>
          <div className="flex flex-col gap-2">
            {snap.members.map((m) => {
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
                  </span>
                </div>
              );
            })}
          </div>
          {room.crowd.length > 0 && (
            <div className="mt-3 text-[10px] uppercase tracking-widest text-cabinet-text/40">
              👥 {room.crowd.length} watching · {room.crowd.join(", ")}
            </div>
          )}
        </Panel>

        {/* your frog */}
        <Panel title="your frog">
          <div className="flex flex-1 items-center justify-center gap-4">
            <button
              onClick={() => setFrog(FROGS[(frogIndex - 1 + FROGS.length) % FROGS.length]!.id)}
              className="border-2 border-cabinet-border bg-cabinet-btn px-3 py-2 text-lg transition-colors hover:border-cabinet-accent"
              aria-label="previous frog"
            >
              ‹
            </button>
            <div className="flex w-40 flex-col items-center gap-2">
              <img src={myFrog.image} alt="" className="h-28 w-auto object-contain" />
              <div className="text-center text-[11px] uppercase tracking-widest text-cabinet-accent">{myFrog.name}</div>
              <div className="text-center font-mono text-[10px] normal-case text-cabinet-text/50">{myFrog.tagline}</div>
            </div>
            <button
              onClick={() => setFrog(FROGS[(frogIndex + 1) % FROGS.length]!.id)}
              className="border-2 border-cabinet-border bg-cabinet-btn px-3 py-2 text-lg transition-colors hover:border-cabinet-accent"
              aria-label="next frog"
            >
              ›
            </button>
          </div>
        </Panel>
      </div>

      <div className="w-full max-w-4xl">
        <Playground members={snap.members} youId={room.playerId} positions={room.positions} onMove={onMove} />
      </div>

      {snap.hostId === room.playerId ? (
        <button
          onClick={() => room.send({ type: "lockIn" })}
          className="w-full max-w-4xl border-[3px] border-cabinet-accent bg-cabinet-accent px-6 py-6 text-lg font-bold uppercase tracking-[0.2em] text-cabinet-ink shadow-[6px_6px_0_var(--cab-shadow)] transition-colors hover:bg-[#ffcf5a] md:text-2xl"
        >
          🎸 Lock In the Band — {snap.members.length} {snap.members.length === 1 ? "frog" : "frogs"}
        </button>
      ) : (
        <div className="w-full max-w-4xl border-[3px] border-cabinet-frame bg-black/15 px-6 py-6 text-center text-sm uppercase tracking-[0.2em] text-cabinet-text/50">
          waiting for the host to lock in the band…
        </div>
      )}

      <button
        className="text-sm uppercase tracking-widest text-cabinet-text/40 hover:text-cabinet-text"
        onClick={() => navigate("/")}
      >
        ← Leave band
      </button>
    </div>
  );
}
