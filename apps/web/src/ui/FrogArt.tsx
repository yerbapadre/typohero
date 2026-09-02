import { useState, type CSSProperties } from "react";
import type { Frog } from "../characters";
import { PixelSprite } from "./PixelSprite";
import { SPRITES } from "./pixelSprites";

/**
 * Frog portrait that degrades to a silhouette when the art file isn't there
 * yet — premium entries can ship before their PNGs land.
 */
export function FrogArt({
  frog,
  className = "",
  dimmed = false,
  style,
}: {
  frog: Frog;
  className?: string;
  dimmed?: boolean;
  style?: CSSProperties;
}) {
  const [broken, setBroken] = useState(false);
  const dim = dimmed ? " opacity-40 saturate-0" : "";

  const sprite = SPRITES[frog.id];
  if (sprite) {
    // Pixel sprites stay in full color even when locked — the padlock badge
    // already signals the locked state, so no dimming here.
    return <PixelSprite grid={sprite} label={frog.name} className={className} style={style} />;
  }

  if (broken) {
    return (
      <div
        role="img"
        aria-label={frog.name}
        className={
          "flex items-center justify-center border-2 border-dashed border-cabinet-border bg-black/30 text-3xl" +
          dim +
          " " +
          className
        }
        style={style}
      >
        🐸
      </div>
    );
  }

  return (
    <img
      src={frog.image}
      alt={frog.name}
      draggable={false}
      onError={() => setBroken(true)}
      className={"object-contain" + dim + " " + className}
      style={style}
    />
  );
}
