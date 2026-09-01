import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../net/useRoom";
import { Roster } from "./multi/Roster";
import { MultiResults } from "./multi/MultiResults";

export function CrowdEntry() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 font-display text-white">
      <h1 className="text-4xl font-extrabold">Join the Crowd</h1>
      <p className="text-neutral-400">Enter a band's room code to watch the show.</p>
      <div className="flex gap-2">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="code"
          className="w-32 rounded-xl border-2 border-white/15 bg-neutral-900 px-4 py-3 text-center text-2xl font-bold uppercase tracking-widest outline-none focus:border-frog"
        />
        <button
          disabled={!code}
          onClick={() => navigate(`/crowd/${code}`)}
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
  const room = useRoom(roomId, "", true);
  const snap = room.snapshot;

  if (!snap) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 font-display text-white">
        joining the crowd at {roomId}…
      </div>
    );
  }

  if (snap.phase === "results") {
    return <MultiResults members={snap.members} frame={room.frame} youId={null} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-neutral-950 py-16 font-display text-white">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">now watching</div>
        <div className="font-mono text-4xl tracking-widest">{roomId}</div>
      </div>

      {snap.phase === "lobby" ? (
        <>
          <div className="text-lg text-frog">🎸 waiting for the band to start…</div>
          <div className="flex flex-col gap-1 font-mono text-sm text-neutral-400">
            {snap.members.length === 0 ? (
              <span className="text-neutral-600">no one on stage yet</span>
            ) : (
              snap.members.map((m) => (
                <div key={m.id} className={m.connected ? "" : "text-neutral-700 line-through"}>
                  {m.name} · {m.instrument ?? "no instrument"}
                  {m.ready ? " · ✓" : ""}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="text-2xl font-extrabold text-frog">NOW PLAYING</div>
          <Roster members={snap.members} frame={room.frame} youId={null} />
        </>
      )}

      <button className="mt-6 text-neutral-500 hover:text-white" onClick={() => navigate("/")}>
        Leave crowd
      </button>
    </div>
  );
}
