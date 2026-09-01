import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../net/useRoom";
import { CROWD_FROG_IMAGE } from "../characters";
import { Playground } from "./multi/Playground";
import { Roster } from "./multi/Roster";
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 font-display text-white">
      <h1 className="text-4xl font-extrabold">Join the Crowd</h1>
      <p className="text-neutral-400">Watch a band's show — pick a name so they know you're there.</p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="your name"
        className="w-64 rounded-xl border-2 border-white/15 bg-neutral-900 px-4 py-3 text-center text-lg outline-none focus:border-frog"
      />
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="code"
          className="w-32 rounded-xl border-2 border-white/15 bg-neutral-900 px-4 py-3 text-center text-2xl font-bold uppercase tracking-widest outline-none focus:border-frog"
        />
        <button
          disabled={!name || !code}
          onClick={watch}
          className="rounded-xl bg-frog px-6 py-3 font-extrabold text-ink transition hover:bg-[#4bb062] disabled:opacity-30"
        >
          Watch →
        </button>
      </div>
      <button className="text-neutral-500 hover:text-white" onClick={() => navigate("/")}>
        Back
      </button>
    </div>
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
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-950 font-display text-white">
        <div className="text-center">
          <div className="text-sm text-neutral-500">joining the crowd at</div>
          <div className="font-mono text-4xl tracking-widest">{roomId}</div>
        </div>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="your name"
          className="w-64 rounded-xl border-2 border-white/15 bg-neutral-900 px-4 py-3 text-center text-lg outline-none focus:border-frog"
        />
        <button
          disabled={!draft}
          onClick={() => {
            sessionStorage.setItem(NAME_KEY, draft);
            setName(draft);
          }}
          className="rounded-xl bg-frog px-6 py-3 font-extrabold text-ink transition hover:bg-[#4bb062] disabled:opacity-30"
        >
          Watch →
        </button>
        <button className="text-neutral-500 hover:text-white" onClick={() => navigate("/")}>
          Back
        </button>
      </div>
    );
  }

  return <CrowdWatch roomId={roomId} name={name} />;
}

function CrowdWatch({ roomId, name }: { roomId: string; name: string }) {
  const navigate = useNavigate();
  const [spectatorId] = useState(() => crypto.randomUUID());
  const room = useRoom(roomId, name, true, undefined, spectatorId);
  const snap = room.snapshot;

  const onMove = useCallback(
    (x: number, y: number, facing: -1 | 1) => room.send({ type: "move", x, y, facing }),
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
      <div className="flex min-h-screen flex-col items-center gap-8 bg-cabinet-bg py-16 font-pixel text-cabinet-text">
        <div className="text-2xl font-bold uppercase tracking-widest text-cabinet-accent">Now Playing</div>
        <Roster members={snap.members} frame={room.frame} youId={null} />
        <button
          className="text-sm uppercase tracking-widest text-cabinet-text/40 hover:text-cabinet-text"
          onClick={() => navigate("/")}
        >
          ← Leave crowd
        </button>
      </div>
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
