import { useEffect, useRef, type ReactNode } from "react";
import {
  bandQuality,
  centerOn,
  type RoomState,
  type LiveStat,
  type Song,
  type ChartFile,
  type RhythmRun,
} from "@typohero/engine";
import type { CrowdItem, EmoteKind, ReactionKind } from "@typohero/protocol";
import type { CrowdMember, Emote, Position, Reaction } from "../../net/useRoom";
import type { WornShirt } from "@typohero/protocol";
import { StageCanvas } from "../../render/StageCanvas";
import { TRAVEL_MS, type StageScene } from "../../render/stage/scene";
import { homeXPercent, RISER_ZONE } from "../../render/stage/performers";
import { useStageScene, type LocalLane } from "../../game/useStageScene";
import { useStageWalk } from "../../game/useStageWalk";
import { useCountIn } from "../../game/useCountIn";
import { CountIn } from "../../ui/cabinet";
import { CrowdFloor } from "./CrowdFloor";
import { ReactionBar, ReactionLayer } from "./Reactions";

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
  chart,
  local,
  rhythmRun,
  positions,
  onBandMove,
  crowd,
  wardrobe,
  crowdYouId,
  crowdYouName,
  onMove,
  onEquip,
  onEmote,
  emotes = [],
  reactions = [],
  onReact,
  controllableCrowd,
  footer,
}: {
  roomId: string;
  snapshot: RoomState;
  frame: Record<string, LiveStat>;
  song: Song | null;
  youId: string | null;
  chart?: ChartFile | null;
  local?: LocalLane | null;
  rhythmRun?: RhythmRun | null;
  positions: Record<string, Position>;
  // Only a band member gets this — it steers their frog on the riser.
  onBandMove?: (x: number, y: number, facing: -1 | 1) => void;
  crowd: CrowdMember[];
  wardrobe?: Record<string, WornShirt>;
  crowdYouId?: string | null;
  crowdYouName?: string;
  onMove?: (x: number, y: number, facing: -1 | 1) => void;
  onEquip?: (item: CrowdItem | null) => void;
  // Only a spectator with a frog in the pit can play one; everyone sees them.
  onEmote?: (kind: EmoteKind) => void;
  emotes?: Emote[];
  reactions?: Reaction[];
  // Only someone with a frog in the room gets the bar; the big screen watches.
  onReact?: (kind: ReactionKind) => void;
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
    chart,
    local,
    positions,
    localWalk: getWalk,
  });

  const bandTotal = snapshot.members.reduce((sum, m) => sum + (frame[m.id]?.points ?? 0), 0);
  const energy = bandQuality(playing.map((m) => frame[m.id]));
  const lanes = playing.length;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-cabinet-bg font-pixel text-cabinet-text">
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
            <CountIn label="count in" value={Math.ceil(remainingMs / 1000)} />
          </div>
        )}

        {rhythmRun && <JudgmentFlash run={rhythmRun} />}

        {youLane >= 0 && !!onBandMove && (
          <div className="pointer-events-none absolute bottom-2 right-3 text-[9px] uppercase tracking-widest text-cabinet-text/30">
            ← → walk the stage · ↑ jump · ↑↑ double jump
          </div>
        )}

        {onReact && <ReactionBar onReact={onReact} />}
      </div>

      {lanes > 0 && (
        <TypedTicker
          rows={order.map((m) => ({ id: m.id, name: m.name, you: m.id === youId }))}
          getScene={getScene}
        />
      )}

      <div className="h-[21vh] min-h-[150px] shrink-0">
        <CrowdFloor
          crowd={crowd}
          wardrobe={wardrobe}
          youId={crowdYouId ?? null}
          youName={crowdYouName}
          controllable={controllableCrowd}
          onMove={onMove}
          onEquip={onEquip}
          onEmote={onEmote}
          emotes={emotes}
          energy={energy}
        />
      </div>

      {footer && <div className="shrink-0 border-t-2 border-cabinet-frame bg-black/30">{footer}</div>}

      <ReactionLayer reactions={reactions} />
    </div>
  );
}

type TickerRow = { id: string; name: string; you: boolean };

/**
 * What the room is typing, piling up. The canvas owns the notes in flight; this
 * strip is the accumulation, so the pit and the big screen can read the words
 * as they land. Both note modes feed it the same string — a rhythm lane just
 * spells the passage out a letter at a time instead of a word at a time.
 *
 * Text is written straight to the DOM off the scene's own animation frame, the
 * way the canvas consumes it: keystrokes must not re-render React.
 */
function TypedTicker({ rows, getScene }: { rows: TickerRow[]; getScene: () => StageScene }) {
  const spans = useRef(new Map<string, { done: HTMLSpanElement | null; live: HTMLSpanElement | null }>());
  const sceneRef = useRef(getScene);
  sceneRef.current = getScene;

  const bind = (id: string, key: "done" | "live") => (el: HTMLSpanElement | null) => {
    const row = spans.current.get(id) ?? { done: null, live: null };
    row[key] = el;
    spans.current.set(id, row);
  };

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      for (const lane of sceneRef.current().lanes) {
        const row = spans.current.get(lane.id);
        if (!row) continue;
        // The word still being played leads in amber; everything already
        // landed sits behind it, dimmed.
        const cut = lane.typed.lastIndexOf(" ");
        const done = cut < 0 ? "" : lane.typed.slice(0, cut + 1);
        const live = cut < 0 ? lane.typed : lane.typed.slice(cut + 1);
        if (row.done && row.done.textContent !== done) row.done.textContent = done;
        if (row.live && row.live.textContent !== live) row.live.textContent = live;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="shrink-0 border-t-2 border-cabinet-frame bg-black/30 px-3 py-1.5">
      {rows.map((row) => (
        <div key={row.id} className="flex items-baseline gap-2 overflow-hidden">
          <span
            className={
              "w-20 shrink-0 truncate text-[9px] uppercase tracking-widest md:w-24 " +
              (row.you ? "text-cabinet-accent" : "text-cabinet-text/40")
            }
          >
            {row.name}
          </span>
          {/* Pinned right and clipped left, so the newest letters are always
              the ones on screen however long the passage runs. */}
          <div className="flex min-w-0 flex-1 justify-end overflow-hidden font-mono text-[11px] leading-5 md:text-xs">
            <span ref={bind(row.id, "done")} className="whitespace-pre text-cabinet-text/45" />
            <span ref={bind(row.id, "live")} className="whitespace-pre text-cabinet-accent" />
          </div>
        </div>
      ))}
    </div>
  );
}

function noop() {}

const JUDGMENT_LABEL: Record<string, string> = {
  perfect: "PERFECT",
  great: "GREAT",
  good: "GOOD",
};

// The last note you hit, and whether you were ahead of or behind the beat. Keyed
// on the note index so React replays the animation for every new hit.
function JudgmentFlash({ run }: { run: RhythmRun }) {
  const hit = run.lastHit;
  if (!hit) return null;

  const wrong = hit.typed !== hit.expected;
  const label = wrong ? "WRONG" : JUDGMENT_LABEL[hit.judgment];
  const drift = Math.round(hit.deltaMs);
  const timing = hit.judgment === "perfect" ? "" : drift < 0 ? "early" : "late";

  return (
    <div
      key={hit.index}
      className="frog-in-right pointer-events-none absolute inset-x-0 top-6 grid place-items-center"
    >
      <div
        className={
          "border-2 px-4 py-1 text-center text-sm uppercase tracking-[0.3em] " +
          (wrong
            ? "border-red-500 bg-black/70 text-red-400"
            : "border-cabinet-accent bg-black/70 text-cabinet-accent")
        }
      >
        {label}
        {timing && (
          <span className="ml-2 text-[10px] tracking-widest text-cabinet-text/50">
            {Math.abs(drift)}ms {timing}
          </span>
        )}
      </div>
    </div>
  );
}
