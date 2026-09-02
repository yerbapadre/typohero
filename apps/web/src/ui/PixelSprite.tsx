import { useEffect, useRef } from "react";
import { PAL, SPRITE_W } from "./pixelSprites";

const CELL = 8; // internal px per sprite pixel; CSS scales the canvas to fit.

/** Renders a pixel-art grid to a crisp, nearest-neighbor canvas. */
export function PixelSprite({
  grid,
  label,
  className = "",
}: {
  grid: string[];
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y]!;
      for (let x = 0; x < SPRITE_W; x++) {
        const color = PAL[row[x] ?? "."];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }, [grid]);

  return (
    <canvas
      ref={ref}
      width={SPRITE_W * CELL}
      height={grid.length * CELL}
      role="img"
      aria-label={label}
      className={"[image-rendering:pixelated] " + className}
    />
  );
}
