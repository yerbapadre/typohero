import { useState } from "react";
import type { Frog } from "../characters";

/**
 * Frog portrait that degrades to a silhouette when the art file isn't there
 * yet — premium entries can ship before their PNGs land.
 */
export function FrogArt({
  frog,
  className = "",
  dimmed = false,
}: {
  frog: Frog;
  className?: string;
  dimmed?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const dim = dimmed ? " opacity-40 saturate-0" : "";

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
    />
  );
}
