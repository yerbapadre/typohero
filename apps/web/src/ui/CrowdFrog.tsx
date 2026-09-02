import type { CSSProperties } from "react";
import { CROWD_FROG_IMAGE, cameoFrogFor } from "../characters";
import { FrogArt } from "./FrogArt";

/**
 * A crowd member's body. Normally the shared spectator frog — but a name that
 * mentions a premium character swaps in that character's art instead. That's
 * the easter egg, and it needs no per-name wiring: the alias table comes off
 * the premium entries in FROGS.
 *
 * Same box either way (sizing/flipping ride on className/style), so callers
 * don't have to know which one they got.
 */
export function CrowdFrog({
  name,
  src = CROWD_FROG_IMAGE,
  className = "",
  style,
}: {
  /** The spectator's display name. Undefined for a nameless NPC — no cameo. */
  name?: string;
  /** Body to fall back on when the name matches nothing. */
  src?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const cameo = cameoFrogFor(name);
  if (cameo) return <FrogArt frog={cameo} className={className} style={style} />;

  return (
    <img src={src} alt="" draggable={false} className={"object-contain " + className} style={style} />
  );
}
