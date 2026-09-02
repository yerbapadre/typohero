import { useState } from "react";
import type { RoomState, Song } from "@typohero/engine";
import { useRoom } from "../net/useRoom";
import { useSongs } from "../net/useSongs";
import { useChart } from "../net/useChart";
import type { CrowdMember } from "../net/useRoom";
import type { WornShirt } from "@typohero/protocol";
import { CabinetPage } from "../ui/CabinetPage";
import { CabinetButton, CabinetField, CabinetInput, CabinetPanel, CabinetStatus } from "../ui/cabinet";
import { StageView } from "../screens/multi/StageView";
import { MultiResults } from "../screens/multi/MultiResults";
import { CrowdFloor } from "../screens/multi/CrowdFloor";
import { frogById } from "../characters";
import { leadingCrowdPick } from "../game/crowdVotes";

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
      <CabinetPanel className="w-full max-w-md">
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.length === 4) onSubmit(draft);
          }}
        >
          <CabinetField label="Band code">
            <CabinetInput
              code
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.toUpperCase())}
              placeholder="code"
              maxLength={4}
            />
          </CabinetField>
          <CabinetButton type="submit" variant="primary" full disabled={draft.length < 4}>
            Open the Stage →
          </CabinetButton>
        </form>
      </CabinetPanel>
    </CabinetPage>
  );
}

function StageScreen({ roomId }: { roomId: string }) {
  const room = useRoom(roomId, "stage", true, undefined, undefined, true);
  const songs = useSongs();
  const snap = room.snapshot;
  const chartFile = useChart(snap?.songId ?? null);
  const song = songs?.find((s) => s.id === snap?.songId) ?? null;

  if (!snap) {
    return <CabinetStatus>opening the stage at {roomId}…</CabinetStatus>;
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
        chart={snap.noteMode === "rhythm" ? chartFile : null}
        youId={null}
        positions={room.positions}
        crowd={room.crowd}
        wardrobe={room.wardrobe}
        reactions={room.reactions}
        controllableCrowd={false}
      />
    );
  }

  return (
    <PreShow
      roomId={roomId}
      snapshot={snap}
      crowd={room.crowd}
      wardrobe={room.wardrobe}
      songs={songs}
    />
  );
}

// Holding screen before the count-in: the marquee, who's on the bill, and the
// pit already filling up with guests.
function PreShow({
  roomId,
  snapshot,
  crowd,
  wardrobe,
  songs,
}: {
  roomId: string;
  snapshot: RoomState;
  crowd: CrowdMember[];
  wardrobe: Record<string, WornShirt>;
  songs: Song[] | null;
}) {
  const band = snapshot.members.filter((m) => m.connected && !m.director);

  // The pit's running vote, up on the big screen until the band commits.
  const pick = snapshot.songId ? null : leadingCrowdPick(crowd);
  const pickTitle = pick ? (songs?.find((s) => s.id === pick.songId)?.title ?? pick.songId) : null;

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

        {pickTitle && pick && (
          <div className="border-2 border-cabinet-border bg-cabinet-btn px-6 py-3 text-center">
            <div className="text-[10px] uppercase tracking-[0.4em] text-cabinet-text/40">
              crowd favorite
            </div>
            <div className="mt-1 text-lg uppercase tracking-widest text-cabinet-accent md:text-2xl">
              ♥ {pickTitle}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-cabinet-text/40">
              {pick.votes} {pick.votes === 1 ? "vote" : "votes"} from the pit
            </div>
          </div>
        )}

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
        <CrowdFloor crowd={crowd} wardrobe={wardrobe} youId={null} controllable={false} energy={1} />
      </div>
    </div>
  );
}
