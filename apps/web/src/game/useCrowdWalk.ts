import { useEffect, useRef, useState } from "react";
import { createWalker, type WalkZone, type WalkState } from "./walk";

// React binding for a DOM-rendered frog you steer (the lobby playground, the
// crowd pit). State lands in React so the sprite can be a positioned div; the
// canvas stage uses `useStageWalk` instead to stay off the render path.
export type { WalkZone, WalkState } from "./walk";

const SEND_MS = 55;

export function useCrowdWalk(opts: {
  enabled: boolean;
  startX: number;
  zone: WalkZone;
  onMove: (x: number, y: number, facing: -1 | 1) => void;
}): WalkState {
  const { enabled, startX, zone, onMove } = opts;

  const [pos, setPos] = useState({ x: startX, y: 0 });
  const [facing, setFacing] = useState<1 | -1>(1);

  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const zoneRef = useRef(zone);
  zoneRef.current = zone;
  const lastSend = useRef(0);

  const walkerRef = useRef<ReturnType<typeof createWalker> | null>(null);
  if (!walkerRef.current) {
    walkerRef.current = createWalker({
      startX,
      keymap: "all",
      zone: () => zoneRef.current,
    });
  }
  const walker = walkerRef.current;

  useEffect(() => {
    if (!enabled) return;
    function down(e: KeyboardEvent) {
      if (walker.down(e.key)) e.preventDefault();
    }
    function up(e: KeyboardEvent) {
      walker.up(e.key);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    onMoveRef.current(walker.state.x, walker.state.y, walker.state.facing);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      walker.clear();
    };
  }, [enabled, walker]);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    function loop(t: number) {
      if (walker.step()) {
        const { x, y, facing: f } = walker.state;
        setPos({ x, y });
        setFacing(f);
        if (t - lastSend.current >= SEND_MS) {
          lastSend.current = t;
          onMoveRef.current(x, y, f);
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, walker]);

  return { x: pos.x, y: pos.y, facing };
}
