import type { CrowdMember } from "../../net/useRoom";
import { CROWD_FROG_IMAGE } from "../../characters";
import { useCrowdWalk } from "../../game/useCrowdWalk";

// The pit along the front of the stage. Spectators walk their own frog here
// while the band plays; NPCs keep it full even when nobody has joined yet.
const GROUND = 9;
const ZONE = { min: 3, max: 97 };
const NPC_COUNT = 18;

// Two rows: the back row sits higher and smaller so the pit reads as a crowd
// with depth rather than a single line of frogs.
const NPCS = Array.from({ length: NPC_COUNT }, (_, i) => {
  const back = i % 2 === 0;
  return {
    x: 3 + ((i * 137) % 95),
    scale: back ? 0.5 + ((i * 41) % 12) / 100 : 0.72 + ((i * 29) % 16) / 100,
    lift: back ? 7 : 0,
    delay: ((i * 313) % 200) / 100,
    flip: i % 3 === 0,
  };
});

function bobDuration(energy: number, offset = 0): string {
  return `${(1.55 - Math.max(0, Math.min(1, energy)) * 0.85 + offset).toFixed(2)}s`;
}

function Footlights() {
  return (
    <div className="absolute -top-1 left-0 right-0 flex justify-between px-2">
      {Array.from({ length: 44 }, (_, i) => (
        <span
          key={i}
          className={
            "h-2 w-2 border border-black " + (i % 2 === 0 ? "bg-cabinet-accent" : "bg-cabinet-shadow")
          }
        />
      ))}
    </div>
  );
}

function PitFrog({
  name,
  x,
  y,
  facing,
  energy,
  you,
  scale = 1,
  flip,
  bobOffset = 0,
  smooth = true,
  lift = 0,
}: {
  name?: string;
  x: number;
  y: number;
  facing: number;
  energy: number;
  you?: boolean;
  scale?: number;
  flip?: boolean;
  bobOffset?: number;
  smooth?: boolean;
  lift?: number;
}) {
  const airborne = y > 0.4;
  return (
    <div
      className="absolute flex -translate-x-1/2 flex-col items-center"
      style={{
        left: `${x}%`,
        bottom: `calc(${GROUND}% + ${y + lift}%)`,
        transition: smooth ? "left .08s linear, bottom .08s linear" : "none",
      }}
    >
      {airborne && (
        <span className="mb-0.5 border border-black bg-cabinet-accent px-1 text-[7px] uppercase tracking-widest text-cabinet-ink">
          woo
        </span>
      )}
      {name && (
        <span
          className={
            "mb-1 max-w-[80px] truncate border px-1 py-0.5 text-[8px] uppercase tracking-widest " +
            (you
              ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
              : "border-cabinet-border bg-cabinet-btn text-cabinet-text/70")
          }
        >
          {name}
        </span>
      )}
      <div className="frog-bob" style={{ animationDuration: bobDuration(energy, bobOffset) }}>
        <img
          src={CROWD_FROG_IMAGE}
          alt=""
          draggable={false}
          className="w-auto object-contain"
          style={{
            height: `${Math.round(74 * scale)}px`,
            transform: `scaleX(${flip ? -facing : facing})`,
            opacity: name ? 1 : 0.5,
          }}
        />
      </div>
    </div>
  );
}

export function CrowdFloor({
  crowd,
  youId,
  youName,
  controllable,
  onMove,
  energy,
}: {
  crowd: CrowdMember[];
  youId: string | null;
  youName?: string;
  controllable: boolean;
  onMove?: (x: number, y: number, facing: -1 | 1) => void;
  energy: number;
}) {
  const you = useCrowdWalk({
    enabled: controllable,
    startX: 30,
    zone: ZONE,
    onMove: onMove ?? (() => {}),
  });

  const others = crowd.filter((c) => c.id !== youId);

  return (
    <div className="relative h-full overflow-hidden border-t-[3px] border-cabinet-accent bg-black/40">
      <Footlights />

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 border-t-2 border-cabinet-frame bg-cabinet-frame/30"
        style={{ height: `${GROUND}%` }}
      />

      {NPCS.map((npc, i) => (
        <PitFrog
          key={`npc-${i}`}
          x={npc.x}
          y={0}
          facing={1}
          scale={npc.scale}
          flip={npc.flip}
          energy={energy}
          bobOffset={npc.delay}
          lift={npc.lift}
          smooth={false}
        />
      ))}

      {others.map((c) => (
        <PitFrog key={c.id} name={c.name} x={c.x} y={c.y} facing={c.facing} energy={energy} flip />
      ))}

      {controllable && (
        <PitFrog
          name={youName}
          x={you.x}
          y={you.y}
          facing={you.facing}
          energy={energy}
          you
          flip
          smooth={false}
        />
      )}

      <div className="pointer-events-none absolute bottom-1 right-2 text-[9px] uppercase tracking-widest text-cabinet-text/35">
        👥 {crowd.length}
        {controllable && " · ← → run · space cheer"}
      </div>
    </div>
  );
}
