import { useEffect, useRef, useState } from "react";
import type { Member } from "@typohero/engine";
import type { CrowdMember, Position } from "../../net/useRoom";
import { FROGS, frogById, CROWD_FROG_IMAGE } from "../../characters";

const RUN = 0.42; // % per frame (~25%/s)
const GRAVITY = 0.14;
const JUMP_V = 2.6;
const GROUND = 8; // % baseline above the floor
const SEND_MS = 55;

const FENCE_X = 64; // barrier sits ~2/3 across
const BAND_MIN = FENCE_X + 4; // bandmates roam right of the barrier
const BAND_MAX = 95;
const CROWD_MIN = 4; // crowd funnels into the left
const CROWD_MAX = FENCE_X - 6;

const RUN_KEYS = new Set(["arrowleft", "arrowright", "a", "d"]);
const JUMP_KEYS = new Set(["arrowup", "w", " "]);

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function Bulbs() {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={"h-1.5 w-1.5 rounded-full " + (i % 2 === 0 ? "bg-cabinet-accent" : "bg-cabinet-text/30")}
        />
      ))}
    </div>
  );
}

function Venue({ name }: { name: string }) {
  return (
    <div className="pointer-events-none absolute right-2 flex flex-col items-center" style={{ bottom: `${GROUND}%` }}>
      <div className="border-[3px] border-cabinet-accent bg-cabinet-btn px-4 py-2 text-center shadow-[3px_3px_0_var(--cab-shadow)]">
        <Bulbs />
        <div className="my-1 text-[8px] uppercase tracking-[0.35em] text-cabinet-text/60">Live Tonight</div>
        <div className="text-sm font-bold uppercase tracking-[0.25em] text-cabinet-accent md:text-lg">{name}</div>
        <div className="mt-1">
          <Bulbs />
        </div>
      </div>
      <div className="h-4 w-1 bg-cabinet-frame" />
      <div className="flex h-28 w-52 flex-col items-center justify-end border-x-[3px] border-t-[3px] border-cabinet-frame bg-black/30 md:h-36 md:w-64">
        <div className="mb-4 flex gap-4">
          <span className="h-6 w-6 border-2 border-cabinet-frame bg-cabinet-accent/30" />
          <span className="h-6 w-6 border-2 border-cabinet-frame bg-cabinet-accent/30" />
        </div>
        <div className="h-12 w-10 border-x-2 border-t-2 border-cabinet-frame bg-black/50 md:h-16 md:w-12" />
      </div>
    </div>
  );
}

function Stanchion() {
  return (
    <div className="flex flex-col items-center">
      <span className="h-3 w-3 rounded-full border-2 border-black bg-neutral-200" />
      <span className="-mt-0.5 h-14 w-1.5 border-x border-black bg-neutral-300" />
      <span className="h-1.5 w-5 border border-black bg-neutral-400" />
    </div>
  );
}

function Barrier() {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2"
      style={{ bottom: `${GROUND}%`, left: `${FENCE_X}%` }}
    >
      <div className="relative flex items-end gap-14">
        <Stanchion />
        <Stanchion />
        {/* retractable belt strung between the two posts */}
        <div className="absolute left-2 right-2 top-1.5 h-2 border-y-2 border-black bg-cabinet-accent" />
      </div>
    </div>
  );
}

function CopCar() {
  return (
    <div className="pointer-events-none absolute -translate-x-1/2" style={{ bottom: `${GROUND}%`, left: `${FENCE_X - 19}%` }}>
      <div className="flex flex-col items-center">
        <div className="flex gap-0.5">
          <span className="h-2 w-3 border border-black bg-red-500" />
          <span className="h-2 w-3 border border-black bg-blue-500" />
        </div>
        <div className="h-4 w-12 border-2 border-black bg-cabinet-text/70" />
        <div className="flex items-center justify-center border-2 border-black bg-white px-2 py-1 text-[7px] font-bold tracking-widest text-black">
          POLICE
        </div>
        <div className="-mt-1 flex w-full justify-between px-1">
          <span className="h-4 w-4 rounded-full border-2 border-black bg-neutral-900" />
          <span className="h-4 w-4 rounded-full border-2 border-black bg-neutral-900" />
        </div>
      </div>
    </div>
  );
}

function BgBuilding({ left, w, h, tone }: { left: number; w: number; h: number; tone: string }) {
  const rows = Math.max(4, Math.floor((h - 20) / 24));
  const count = rows * 3;
  return (
    <div
      className="pointer-events-none absolute border-2 border-black/40"
      style={{ bottom: `${GROUND}%`, left: `${left}%`, width: w, height: h, background: tone }}
    >
      <div className="grid h-full grid-cols-3 content-start gap-2 p-2">
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className={"h-2.5 w-full " + ((i * 7) % 3 === 0 ? "bg-cabinet-accent/40" : "bg-black/40")} />
        ))}
      </div>
    </div>
  );
}

function Backdrop() {
  return (
    <>
      <BgBuilding left={0} w={92} h={340} tone="#201a0e" />
      <BgBuilding left={16} w={80} h={470} tone="#181410" />
      <BgBuilding left={33} w={104} h={390} tone="#241d10" />
      <BgBuilding left={50} w={78} h={440} tone="#1b160d" />
    </>
  );
}

function Tree({ left }: { left: number }) {
  return (
    <div
      className="pointer-events-none absolute flex flex-col items-center -space-y-3"
      style={{ bottom: `${GROUND}%`, left: `${left}%`, transform: "translateX(-50%)" }}
    >
      <div className="flex flex-col items-center -space-y-4">
        <span className="h-10 w-10 border-2 border-black bg-[#3f7d3a]" />
        <span className="h-12 w-16 border-2 border-black bg-[#357033]" />
      </div>
      <span className="h-12 w-3 border-x-2 border-black bg-[#5b3f1e]" />
    </div>
  );
}

function FireHydrant({ left }: { left: number }) {
  return (
    <div
      className="pointer-events-none absolute flex flex-col items-center"
      style={{ bottom: `${GROUND}%`, left: `${left}%`, transform: "translateX(-50%)" }}
    >
      <span className="h-2 w-3 border border-black bg-red-600" />
      <div className="relative h-8 w-4 border-2 border-black bg-red-600">
        <span className="absolute -left-1.5 top-2 h-2 w-2 border border-black bg-red-600" />
        <span className="absolute -right-1.5 top-2 h-2 w-2 border border-black bg-red-600" />
      </div>
      <span className="h-1.5 w-6 bg-red-900" />
    </div>
  );
}

function FrogSprite({
  name,
  image,
  x,
  y,
  facing,
  flip,
  you,
}: {
  name: string;
  image: string;
  x: number;
  y: number;
  facing: number;
  flip?: boolean;
  you?: boolean;
}) {
  return (
    <div
      className="absolute flex -translate-x-1/2 flex-col items-center"
      style={{
        left: `${x}%`,
        bottom: `calc(${GROUND}% + ${y}%)`,
        transition: you ? "none" : "left .08s linear, bottom .08s linear",
      }}
    >
      <span
        className={
          "mb-1 max-w-[90px] truncate border px-1.5 py-0.5 text-[9px] uppercase tracking-widest " +
          (you
            ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
            : "border-cabinet-border bg-cabinet-btn text-cabinet-text/70")
        }
      >
        {name}
      </span>
      <img
        src={image}
        alt=""
        draggable={false}
        className="h-16 w-auto object-contain md:h-20"
        style={{ transform: `scaleX(${flip ? -facing : facing})` }}
      />
    </div>
  );
}

export function Playground({
  mode,
  youId,
  youName,
  youImage,
  members,
  positions,
  onMove,
  bandName,
  crowd,
}: {
  mode: "band" | "crowd";
  youId: string | null;
  youName: string;
  youImage: string;
  members: Member[];
  positions: Record<string, Position>;
  onMove: (x: number, y: number, facing: -1 | 1) => void;
  bandName: string;
  crowd: CrowdMember[];
}) {
  const [zLo, zHi] = mode === "band" ? [BAND_MIN, BAND_MAX] : [CROWD_MIN, CROWD_MAX];
  const startX = mode === "band" ? 80 : 30;

  const [pos, setPos] = useState({ x: startX, y: 0 });
  const [face, setFace] = useState<1 | -1>(1);

  const keys = useRef<Set<string>>(new Set());
  const jumpQueued = useRef(false);
  const vy = useRef(0);
  const grounded = useRef(true);
  const posRef = useRef({ x: startX, y: 0 });
  const faceRef = useRef<1 | -1>(1);
  const lastSend = useRef(0);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const zoneRef = useRef({ lo: zLo, hi: zHi });
  zoneRef.current = { lo: zLo, hi: zHi };

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (RUN_KEYS.has(k) || JUMP_KEYS.has(k)) e.preventDefault();
      if (JUMP_KEYS.has(k)) jumpQueued.current = true;
      if (RUN_KEYS.has(k)) keys.current.add(k);
    }
    function up(e: KeyboardEvent) {
      keys.current.delete(e.key.toLowerCase());
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    onMoveRef.current(posRef.current.x, 0, 1);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    function loop(t: number) {
      const k = keys.current;
      let dx = 0;
      if (k.has("arrowleft") || k.has("a")) dx -= 1;
      if (k.has("arrowright") || k.has("d")) dx += 1;

      if (jumpQueued.current) {
        if (grounded.current) {
          vy.current = JUMP_V;
          grounded.current = false;
        }
        jumpQueued.current = false;
      }

      const active = dx !== 0 || !grounded.current || vy.current !== 0;
      if (active) {
        if (dx !== 0) faceRef.current = dx < 0 ? -1 : 1;
        const x = clamp(posRef.current.x + dx * RUN, zoneRef.current.lo, zoneRef.current.hi);
        let y = posRef.current.y + vy.current;
        vy.current -= GRAVITY;
        if (y <= 0) {
          y = 0;
          vy.current = 0;
          grounded.current = true;
        }
        posRef.current = { x, y };
        setPos({ x, y });
        setFace(faceRef.current);

        if (t - lastSend.current >= SEND_MS) {
          lastSend.current = t;
          onMoveRef.current(x, y, faceRef.current);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const bandActors = members.filter((m) => m.connected && !(mode === "band" && m.id === youId));
  const crowdActors = crowd.filter((c) => !(mode === "crowd" && c.id === youId));

  return (
    <div className="w-full">
      <div className="relative h-[54vh] overflow-hidden border-[3px] border-cabinet-frame bg-gradient-to-b from-black/25 to-cabinet-frame/25 shadow-[6px_6px_0_var(--cab-shadow)]">
        <Backdrop />

        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 bg-cabinet-frame/40"
          style={{ height: `${GROUND}%` }}
        />

        <Venue name={bandName} />
        <Tree left={9} />
        <FireHydrant left={30} />

        {/* crowd funnels into the left, outside the barrier */}
        {crowdActors.map((c) => (
          <FrogSprite key={c.id} name={c.name} image={CROWD_FROG_IMAGE} x={c.x} y={c.y} facing={c.facing} flip />
        ))}

        <CopCar />
        <Barrier />

        {/* bandmates roam right of the barrier */}
        {bandActors.map((m, i) => {
          const frog = frogById(m.character?.faceId) ?? FROGS[0]!;
          const p = positions[m.id] ?? { x: BAND_MIN + ((i * 7) % (BAND_MAX - BAND_MIN)), y: 0, facing: 1 };
          return <FrogSprite key={m.id} name={m.name} image={frog.image} x={p.x} y={p.y} facing={p.facing} />;
        })}

        <FrogSprite name={youName} image={youImage} x={pos.x} y={pos.y} facing={face} flip={mode === "crowd"} you />
      </div>
      <div className="mt-2 text-center text-[10px] uppercase tracking-widest text-cabinet-text/40">
        ← → or A/D to run · space / ↑ / W to jump
      </div>
    </div>
  );
}
