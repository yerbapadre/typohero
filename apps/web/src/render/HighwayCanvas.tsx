import { useEffect, useRef } from "react";
import { drawHighway, type HighwayState } from "./Highway";
import { startRenderLoop } from "./renderLoop";

// getState is read live every frame via a ref, so the rAF loop never restarts
// on React re-renders.
export function HighwayCanvas({ getState }: { getState: () => HighwayState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(getState);
  stateRef.current = getState;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return startRenderLoop(canvas, (ctx, w, h) => drawHighway(ctx, w, h, stateRef.current()));
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
