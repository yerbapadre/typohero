import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { CrowdItem } from "@typohero/protocol";
import { useRoom } from "../net/useRoom";
import { useSongs } from "../net/useSongs";
import { CROWD_FROG_IMAGE } from "../characters";
import { CabinetPage } from "../ui/CabinetPage";
import { Playground } from "./multi/Playground";
import { StageView } from "./multi/StageView";
import { MultiResults } from "./multi/MultiResults";

const NAME_KEY = "typohero:name";

export function CrowdEntry() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");
  const [code, setCode] = useState("");

  function watch() {
    sessionStorage.setItem(NAME_KEY, name);
    navigate(`/crowd/${code}`);
  }

  return (
    <CabinetPage
      subtitle="spectator"
      title={
        <>
          JOIN THE <span className="text-cabinet-accent">CROWD</span>
        </>
      }
    >
      <img
        src={CROWD_FROG_IMAGE}
        alt=""
        draggable={false}
        className="h-32 w-auto select-none object-contain md:h-40"
      />

      <div className="w-full max-w-md border-[3px] border-cabinet-frame bg-black/15 p-6 shadow-[8px_8px_0_var(--cab-shadow)]">
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-cabinet-accent">Your name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="frog sinatra"
              className="border-2 border-cabinet-border bg-cabinet-btn px-4 py-4 text-center text-sm text-cabinet-text outline-none placeholder:text-cabinet-text/30 focus:border-cabinet-accent"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-cabinet-accent">Band code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="code"
              maxLength={4}
              className="border-2 border-cabinet-border bg-cabinet-btn px-4 py-4 text-center text-xl uppercase tracking-[0.4em] text-cabinet-text outline-none placeholder:tracking-widest placeholder:text-cabinet-text/30 focus:border-cabinet-accent"
            />
          </label>

          <button
            disabled={!name || !code}
            onClick={watch}
            className="w-full border-2 border-cabinet-accent bg-cabinet-accent px-5 py-5 text-sm uppercase tracking-widest text-cabinet-ink transition-colors disabled:cursor-not-allowed disabled:border-cabinet-border disabled:bg-cabinet-btn disabled:text-cabinet-text/30 md:text-base"
          >
            Watch the Show →
          </button>
        </div>
      </div>

      <button
        className="text-sm uppercase tracking-widest text-cabinet-text/40 hover:text-cabinet-text"
        onClick={() => navigate("/")}
      >
        ← Back
      </button>
    </CabinetPage>
  );
}

export function CrowdView() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const roomId = (code ?? "").toUpperCase();
  const [name, setName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? "");
  const [draft, setDraft] = useState("");

  if (!name) {
    return (
      <CabinetPage
        subtitle={`joining crowd ${roomId}`}
        title={
          <>
            WHO ARE <span className="text-cabinet-accent">YOU?</span>
          </>
        }
      >
        <div className="w-full max-w-md border-[3px] border-cabinet-frame bg-black/15 p-6 shadow-[8px_8px_0_var(--cab-shadow)]">
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-cabinet-accent">Your name</span>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="frog sinatra"
                className="border-2 border-cabinet-border bg-cabinet-btn px-4 py-4 text-center text-sm text-cabinet-text outline-none placeholder:text-cabinet-text/30 focus:border-cabinet-accent"
              />
            </label>
            <button
              disabled={!draft}
              onClick={() => {
                sessionStorage.setItem(NAME_KEY, draft);
                setName(draft);
              }}
              className="w-full border-2 border-cabinet-accent bg-cabinet-accent px-5 py-5 text-sm uppercase tracking-widest text-cabinet-ink transition-colors disabled:cursor-not-allowed disabled:border-cabinet-border disabled:bg-cabinet-btn disabled:text-cabinet-text/30 md:text-base"
            >
              Watch {roomId} →
            </button>
          </div>
        </div>
        <button
          className="text-sm uppercase tracking-widest text-cabinet-text/40 hover:text-cabinet-text"
          onClick={() => navigate("/")}
        >
          ← Back
        </button>
      </CabinetPage>
    );
  }

  return <CrowdWatch roomId={roomId} name={name} />;
}

function CrowdWatch({ roomId, name }: { roomId: string; name: string }) {
  const navigate = useNavigate();
  const [spectatorId] = useState(() => crypto.randomUUID());
  const room = useRoom(roomId, name, true, undefined, spectatorId);
  const songs = useSongs();
  const snap = room.snapshot;
  const song = songs?.find((s) => s.id === snap?.songId) ?? null;

  const onMove = useCallback(
    (x: number, y: number, facing: -1 | 1) => room.send({ type: "move", x, y, facing }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onEquip = useCallback(
    (item: CrowdItem | null) => room.send({ type: "equip", item }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!snap) {
    return (
      <div className="flex h-screen items-center justify-center bg-cabinet-bg font-pixel text-sm uppercase tracking-widest text-cabinet-text/50">
        joining the crowd at {roomId}…
      </div>
    );
  }

  if (snap.phase === "results") {
    return <MultiResults members={snap.members} frame={room.frame} youId={null} />;
  }

  if (snap.phase === "playing" || snap.phase === "countdown") {
    return (
      <StageView
        roomId={roomId}
        snapshot={snap}
        frame={room.frame}
        song={song}
        youId={null}
        positions={room.positions}
        crowd={room.crowd}
        crowdYouId={spectatorId}
        crowdYouName={name}
        onMove={onMove}
        onEquip={onEquip}
        controllableCrowd
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-5 bg-cabinet-bg px-6 pb-10 pt-10 font-pixel text-cabinet-text">
      <header className="text-center">
        <div className="text-xs uppercase tracking-widest text-cabinet-text/40">now watching</div>
        <div className="mt-1 text-4xl font-bold tracking-[0.3em] text-cabinet-accent md:text-5xl">{roomId}</div>
        <div className="mt-1 text-[11px] uppercase tracking-widest text-cabinet-text/40">
          in the crowd as {name} · 👥 {room.crowd.length}
        </div>
      </header>

      <div className="w-full">
        <Playground
          mode="crowd"
          youId={spectatorId}
          youName={name}
          youImage={CROWD_FROG_IMAGE}
          members={snap.members}
          positions={room.positions}
          onMove={onMove}
          bandName={roomId}
          crowd={room.crowd}
        />
      </div>

      <button
        className="text-sm uppercase tracking-widest text-cabinet-text/40 hover:text-cabinet-text"
        onClick={() => navigate("/")}
      >
        ← Leave crowd
      </button>
    </div>
  );
}
