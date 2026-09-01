import { useEffect, useRef } from "react";
import { createStageRenderer } from "./stage/drawStage";
import type { StageScene } from "./stage/scene";
import { startRenderLoop } from "./renderLoop";

// getScene is read live every frame through a ref, so the rAF loop and the
// renderer's particle state survive React re-renders.
export function StageCanvas({ getScene }: { getScene: () => StageScene }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef(getScene);
  sceneRef.current = getScene;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createStageRenderer();
    return startRenderLoop(canvas, (ctx, w, h) => renderer.draw(ctx, w, h, sceneRef.current()));
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
