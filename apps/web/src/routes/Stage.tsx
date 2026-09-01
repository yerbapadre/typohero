import { useState } from "react";
import type { RoomState } from "@typohero/engine";
import { useRoom } from "../net/useRoom";
import { useSongs } from "../net/useSongs";
import type { CrowdMember } from "../net/useRoom";
import { CabinetPage } from "../ui/CabinetPage";
import { StageView } from "../screens/multi/StageView";
import { MultiResults } from "../screens/multi/MultiResults";
import { CrowdFloor } from "../screens/multi/CrowdFloor";
import { frogById } from "../characters";

// The big screen wired to the venue projector: `/stage/<code>`. It watches a
// room as an observer — it mirrors the band's lanes and the crowd pit without
// taking a lane or a crowd frog of its own.
function codeFromPath(): string {
  return (location.pathname.split("/").filter(Boolean)[1] ?? "").toUpperCase();
}

export function Stage() {
  const [code, setCode] = useState(codeFromPath);

  if (!code) {
    return (
      <StageEntry
        onSubmit={(next) => {
          history.replaceState(null, "", `/stage/${next}`);
          setCode(next);
        }}
      />
    );
  }

  return <StageScreen roomId={code} />;
}

function StageEntry({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <CabinetPage
      subtitle="big screen"
      title={
        <>
          THE <span className="text-cabinet-accent">STAGE</span>
        </>
      }
    >
      <div className="w-full max-w-md border-[3px] border-cabinet-frame bg-black/15 p-6 shadow-[8px_8px_0_var(--cab-shadow)]">
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-cabinet-accent">Band code</span>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.toUpperCase())}
              placeholder="code"
              maxLength={4}
              className="border-2 border-cabinet-border bg-cabinet-btn px-4 py-4 text-center text-xl uppercase tracking-[0.4em] text-cabinet-text outline-none placeholder:tracking-widest placeholder:text-cabinet-text/30 focus:border-cabinet-accent"
            />
          </label>
          <button
            disabled={draft.length < 4}
            onClick={() => onSubmit(draft)}
            className="w-full border-2 border-cabinet-accent bg-cabinet-accent px-5 py-5 text-sm uppercase tracking-widest text-cabinet-ink transition-colors disabled:cursor-not-allowed disabled:border-cabinet-border disabled:bg-cabinet-btn disabled:text-cabinet-text/30 md:text-base"
          >
            Open the Stage →
          </button>
        </div>
      </div>
    </CabinetPage>
  );
}

function StageScreen({ roomId }: { roomId: string }) {
  const room = useRoom(roomId, "stage", true, undefined, undefined, true);
  const songs = useSongs();
  const snap = room.snapshot;
  const song = songs?.find((s) => s.id === snap?.songId) ?? null;

  if (!snap) {
    return (
      <div className="flex h-screen items-center justify-center bg-cabinet-bg font-pixel text-sm uppercase tracking-widest text-cabinet-text/50">
        opening the stage at {roomId}…
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
        controllableCrowd={false}
      />
    );
  }

  return <PreShow roomId={roomId} snapshot={snap} crowd={room.crowd} />;
}

// Holding screen before the count-in: the marquee, who's on the bill, and the
// pit already filling up with guests.
function PreShow({
  roomId,
  snapshot,
  crowd,
}: {
  roomId: string;
  snapshot: RoomState;
  crowd: CrowdMember[];
}) {
  const band = snapshot.members.filter((m) => m.connected);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cabinet-bg font-pixel text-cabinet-text">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-8">
        <div className="border-[3px] border-cabinet-accent bg-cabinet-btn px-10 py-6 text-center shadow-[10px_10px_0_var(--cab-shadow)]">
          <div className="text-[10px] uppercase tracking-[0.4em] text-cabinet-text/50">
            live tonight
          </div>
          <div className="mt-3 text-2xl uppercase tracking-widest text-cabinet-accent md:text-4xl">
            Frog Sinatra
          </div>
          <div className="mt-1 text-sm uppercase tracking-[0.3em] text-cabinet-text/60 md:text-base">
            and the Tadpoles
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-cabinet-text/40">
            band code
          </div>
          <div className="text-5xl tracking-[0.3em] text-white md:text-7xl">{roomId}</div>
        </div>

        <div className="text-xs uppercase tracking-widest text-cabinet-text/40">
          join the crowd → /crowd
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {band.map((m) => {
            const frog = frogById(m.character?.faceId);
            return (
              <div
                key={m.id}
                className="flex items-center gap-2 border-2 border-cabinet-border bg-cabinet-btn px-3 py-2"
              >
                {frog && <img src={frog.image} alt="" className="h-7 w-auto object-contain" />}
                <span className="text-[11px] uppercase tracking-widest">
                  {m.name}
                  {m.instrument && (
                    <span className="text-cabinet-text/40"> · {m.instrument}</span>
                  )}
                </span>
              </div>
            );
          })}
          {band.length === 0 && (
            <div className="text-xs uppercase tracking-widest text-cabinet-text/30">
              nobody on the bill yet
            </div>
          )}
        </div>
      </div>

      <div className="h-[21vh] min-h-[150px] shrink-0">
        <CrowdFloor crowd={crowd} youId={null} controllable={false} energy={1} />
      </div>
    </div>
  );
}
