import type { ReactNode } from "react";
import { bandQuality, centerOn, type RoomState, type LiveStat, type Song } from "@typohero/engine";
import type { CrowdMember, Position } from "../../net/useRoom";
import { StageCanvas } from "../../render/StageCanvas";
import { TRAVEL_MS } from "../../render/stage/scene";
import { homeXPercent, RISER_ZONE } from "../../render/stage/performers";
import { useStageScene, type LocalLane } from "../../game/useStageScene";
import { useStageWalk } from "../../game/useStageWalk";
import { useCountIn } from "../../game/useCountIn";
import { CrowdFloor } from "./CrowdFloor";

// The shared stage: the same lane highway on every machine, the band's frogs
// on the riser behind it, the crowd pit along the front. A band member gets
// their own lane centred and typed live and steers their own frog with the
// arrow keys; a spectator or the big screen watches the same scene with no
// lane of their own.
export function StageView({
  roomId,
  snapshot,
  frame,
  song,
  youId,
  local,
  positions,
  onBandMove,
  crowd,
  crowdYouId,
  crowdYouName,
  onMove,
  controllableCrowd,
  footer,
}: {
  roomId: string;
  snapshot: RoomState;
  frame: Record<string, LiveStat>;
  song: Song | null;
  youId: string | null;
  local?: LocalLane | null;
  positions: Record<string, Position>;
  // Only a band member gets this — it steers their frog on the riser.
  onBandMove?: (x: number, y: number, facing: -1 | 1) => void;
  crowd: CrowdMember[];
  crowdYouId?: string | null;
  crowdYouName?: string;
  onMove?: (x: number, y: number, facing: -1 | 1) => void;
  controllableCrowd: boolean;
  footer?: ReactNode;
}) {
  const { waiting, remainingMs } = useCountIn(snapshot.startedAtEpochMs);

  const playing = snapshot.members.filter((m) => m.connected && m.instrument);
  // Your frog starts above your own lane — the same slot the renderer parks
  // everyone else's in, since `centerOn` decides the lane order.
  const order = centerOn(playing, (m) => m.id === youId);
  const youLane = order.findIndex((m) => m.id === youId);

  const getWalk = useStageWalk({
    enabled: youLane >= 0 && !!onBandMove,
    startX: youLane < 0 ? 50 : homeXPercent(youLane, order.length),
    zone: RISER_ZONE,
    onMove: onBandMove ?? noop,
  });

  const getScene = useStageScene({
    snapshot,
    frame,
    song,
    youId,
    travelMs: TRAVEL_MS,
    local,
    positions,
    localWalk: getWalk,
  });

  const bandTotal = snapshot.members.reduce((sum, m) => sum + (frame[m.id]?.points ?? 0), 0);
  const energy = bandQuality(playing.map((m) => frame[m.id]));
  const lanes = playing.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cabinet-bg font-pixel text-cabinet-text">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b-[3px] border-cabinet-frame bg-black/25 px-4 py-2">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.3em] text-cabinet-text/40">
            now playing · {roomId}
          </div>
          <div className="truncate text-sm uppercase tracking-widest text-cabinet-accent md:text-base">
            {song ? song.title : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-[0.3em] text-cabinet-text/40">band</div>
          <div className="text-lg tracking-widest text-white md:text-2xl">{bandTotal}</div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {lanes === 0 ? (
          <div className="grid h-full place-items-center text-xs uppercase tracking-widest text-cabinet-text/40">
            waiting for the band to pick up their instruments
          </div>
        ) : (
          <StageCanvas getScene={getScene} />
        )}

        {waiting && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="border-[3px] border-cabinet-accent bg-cabinet-bg/90 px-10 py-6 text-center shadow-[8px_8px_0_var(--cab-shadow)]">
              <div className="text-xs uppercase tracking-[0.4em] text-cabinet-text/50">
                count in
              </div>
              <div className="mt-2 text-5xl tracking-widest text-cabinet-accent md:text-7xl">
                {Math.ceil(remainingMs / 1000)}
              </div>
            </div>
          </div>
        )}

        {youLane >= 0 && !!onBandMove && (
          <div className="pointer-events-none absolute bottom-2 right-3 text-[9px] uppercase tracking-widest text-cabinet-text/30">
            ← → walk the stage · ↑ jump
          </div>
        )}
      </div>

      <div className="h-[21vh] min-h-[150px] shrink-0">
        <CrowdFloor
          crowd={crowd}
          youId={crowdYouId ?? null}
          youName={crowdYouName}
          controllable={controllableCrowd}
          onMove={onMove}
          energy={energy}
        />
      </div>

      {footer && <div className="shrink-0 border-t-2 border-cabinet-frame bg-black/30">{footer}</div>}
    </div>
  );
}

function noop() {}
