import { useEffect, useRef, useState } from "react";
import type { Member } from "@typohero/engine";
import type { Position } from "../../net/useRoom";
import { FROGS, frogById } from "../../characters";

const RUN = 0.42; // % per frame (~25%/s)
const GRAVITY = 0.14;
const JUMP_V = 2.6;
const GROUND = 8; // % baseline above the floor
const SEND_MS = 55;

const RUN_KEYS = new Set(["arrowleft", "arrowright", "a", "d"]);
const JUMP_KEYS = new Set(["arrowup", "w", " "]);

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function FrogSprite({
  member,
  x,
  y,
  facing,
  you,
}: {
  member: Member;
  x: number;
  y: number;
  facing: number;
  you?: boolean;
}) {
  const frog = frogById(member.character?.faceId) ?? FROGS[0]!;
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
        {member.name}
      </span>
      <img
        src={frog.image}
        alt=""
        draggable={false}
        className="h-16 w-auto object-contain md:h-20"
        style={{ transform: `scaleX(${facing})` }}
      />
    </div>
  );
}

export function Playground({
  members,
  youId,
  positions,
  onMove,
}: {
  members: Member[];
  youId: string | null;
  positions: Record<string, Position>;
  onMove: (x: number, y: number, facing: -1 | 1) => void;
}) {
  const [pos, setPos] = useState({ x: 50, y: 0 });
  const [face, setFace] = useState<1 | -1>(1);

  const keys = useRef<Set<string>>(new Set());
  const jumpQueued = useRef(false);
  const vy = useRef(0);
  const grounded = useRef(true);
  const posRef = useRef({ x: 50, y: 0 });
  const faceRef = useRef<1 | -1>(1);
  const lastSend = useRef(0);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

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
    // announce our starting spot
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
        let x = clamp(posRef.current.x + dx * RUN, 4, 96);
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

  const me = members.find((m) => m.id === youId);
  const others = members.filter((m) => m.id !== youId && m.connected);

  return (
    <div className="w-full">
      <div className="relative h-[46vh] overflow-hidden border-[3px] border-cabinet-frame bg-gradient-to-b from-black/25 to-cabinet-frame/25 shadow-[6px_6px_0_var(--cab-shadow)]">
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 bg-cabinet-frame/40"
          style={{ height: `${GROUND}%` }}
        />

        {others.map((m, i) => {
          const p = positions[m.id] ?? { x: 20 + ((i * 23) % 60), y: 0, facing: 1 };
          return <FrogSprite key={m.id} member={m} x={p.x} y={p.y} facing={p.facing} />;
        })}

        {me && <FrogSprite member={me} x={pos.x} y={pos.y} facing={face} you />}
      </div>
      <div className="mt-2 text-center text-[10px] uppercase tracking-widest text-cabinet-text/40">
        ← → or A/D to run · space / ↑ / W to jump
      </div>
    </div>
  );
}
