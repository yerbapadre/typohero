import { useEffect, useRef } from "react";
import { createWalker, RISER_TUNING, type WalkState, type WalkZone } from "./walk";

// The band member's own frog on the stage riser. Arrow keys only — every other
// key is a note being typed — and the position never touches React state: the
// canvas reads it through the returned getter on its own rAF loop, so running
// around costs nothing on the typing render path.
const SEND_MS = 55;

export function useStageWalk(opts: {
  enabled: boolean;
  startX: number;
  zone: WalkZone;
  onMove: (x: number, y: number, facing: -1 | 1) => void;
}): () => WalkState | null {
  const { enabled, startX, zone, onMove } = opts;

  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const zoneRef = useRef(zone);
  zoneRef.current = zone;
  const startXRef = useRef(startX);
  startXRef.current = startX;
  const lastSend = useRef(0);

  const walkerRef = useRef<ReturnType<typeof createWalker> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Built on first enable so it picks up the home slot the lane order landed
    // on, then kept for the whole show.
    const walker =
      walkerRef.current ??
      createWalker({
        startX: startXRef.current,
        keymap: "arrows",
        zone: () => zoneRef.current,
        tuning: RISER_TUNING,
      });
    walkerRef.current = walker;

    function down(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (walker.down(e.key)) e.preventDefault();
    }
    function up(e: KeyboardEvent) {
      walker.up(e.key);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    // Claim the stage home immediately, so the other machines stop drawing us
    // wherever we were left standing in the lobby playground.
    onMoveRef.current(walker.state.x, walker.state.y, walker.state.facing);

    let raf = 0;
    function loop(t: number) {
      if (walker.step() && t - lastSend.current >= SEND_MS) {
        lastSend.current = t;
        onMoveRef.current(walker.state.x, walker.state.y, walker.state.facing);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      walker.clear();
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  return () => (enabled ? walkerRef.current?.state ?? null : null);
}
