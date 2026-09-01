import { useEffect, useRef, useState } from "react";

// Shared side-scroller movement for a frog you control — the lobby playground
// and the crowd pit in front of the stage run the same physics. Units are
// percentages of the containing scene, matching what the room relays.
const RUN = 0.42;
const GRAVITY = 0.14;
const JUMP_V = 2.6;
const SEND_MS = 55;

const RUN_KEYS = new Set(["arrowleft", "arrowright", "a", "d"]);
const JUMP_KEYS = new Set(["arrowup", "w", " "]);

export type WalkZone = { min: number; max: number };
export type WalkState = { x: number; y: number; facing: 1 | -1 };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function useCrowdWalk(opts: {
  enabled: boolean;
  startX: number;
  zone: WalkZone;
  onMove: (x: number, y: number, facing: -1 | 1) => void;
}): WalkState {
  const { enabled, startX, zone, onMove } = opts;

  const [pos, setPos] = useState({ x: startX, y: 0 });
  const [facing, setFacing] = useState<1 | -1>(1);

  const keys = useRef<Set<string>>(new Set());
  const jumpQueued = useRef(false);
  const vy = useRef(0);
  const grounded = useRef(true);
  const posRef = useRef({ x: startX, y: 0 });
  const faceRef = useRef<1 | -1>(1);
  const lastSend = useRef(0);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const zoneRef = useRef(zone);
  zoneRef.current = zone;

  useEffect(() => {
    if (!enabled) return;
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
    onMoveRef.current(posRef.current.x, posRef.current.y, faceRef.current);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.current.clear();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
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

      if (dx !== 0 || !grounded.current || vy.current !== 0) {
        if (dx !== 0) faceRef.current = dx < 0 ? -1 : 1;
        const x = clamp(posRef.current.x + dx * RUN, zoneRef.current.min, zoneRef.current.max);
        let y = posRef.current.y + vy.current;
        vy.current -= GRAVITY;
        if (y <= 0) {
          y = 0;
          vy.current = 0;
          grounded.current = true;
        }
        posRef.current = { x, y };
        setPos({ x, y });
        setFacing(faceRef.current);

        if (t - lastSend.current >= SEND_MS) {
          lastSend.current = t;
          onMoveRef.current(x, y, faceRef.current);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  return { x: pos.x, y: pos.y, facing };
}
