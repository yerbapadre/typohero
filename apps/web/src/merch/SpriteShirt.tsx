import { CROWD_FIT, type WornShirt } from "./shirts";
import { ShirtGraphic } from "./ShirtGraphic";

/**
 * A shirt on a crowd frog sprite. Drop it inside a wrapper that is exactly the
 * sprite's box — the fit is in percentages of that box. Deliberately not
 * mirrored with the sprite's `scaleX`, so the print stays the right way round
 * whichever way the frog is facing.
 */
export function SpriteShirt({ shirt }: { shirt: WornShirt | null | undefined }) {
  if (!shirt) return null;
  return (
    <ShirtGraphic
      garment={shirt.garment}
      art={shirt.art}
      stretch
      className="pointer-events-none absolute"
      style={{
        left: `${CROWD_FIT.left}%`,
        top: `${CROWD_FIT.top}%`,
        width: `${CROWD_FIT.width}%`,
        height: `${CROWD_FIT.height}%`,
      }}
    />
  );
}
