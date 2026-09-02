import { useState } from "react";
import type { Frog } from "../characters";
import { fitFor } from "./shirts";
import { ShirtGraphic } from "./ShirtGraphic";

/**
 * A frog modelling a shirt. The overlay is positioned in percentages of the
 * art's own box, so the wrapper is locked to the image's aspect ratio the
 * moment it loads — `object-contain` letterboxing would throw the fit off.
 */
export function FrogWearing({
  frog,
  garment,
  art,
  className = "",
}: {
  frog: Frog;
  garment: string;
  art?: string | null;
  className?: string;
}) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [broken, setBroken] = useState(false);
  const fit = fitFor(frog.id);

  if (broken) {
    return (
      <div
        role="img"
        aria-label={frog.name}
        className={
          "flex items-center justify-center border-2 border-dashed border-cabinet-border bg-black/30 text-4xl " +
          className
        }
      >
        🐸
      </div>
    );
  }

  return (
    <div className={"flex items-center justify-center " + className}>
      <div
        className="relative h-full max-w-full overflow-hidden"
        style={{ aspectRatio: ratio ?? 1 }}
      >
        <img
          src={frog.image}
          alt={frog.name}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalHeight > 0) setRatio(img.naturalWidth / img.naturalHeight);
          }}
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full select-none object-contain"
        />
        {ratio !== null && (
          <ShirtGraphic
            garment={garment}
            art={art}
            stretch
            className="absolute"
            style={{
              left: `${fit.left}%`,
              top: `${fit.top}%`,
              width: `${fit.width}%`,
              height: `${fit.height}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
