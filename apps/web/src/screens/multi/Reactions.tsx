import { REACTION_KINDS, type ReactionKind } from "@typohero/protocol";
import type { Reaction } from "../../net/useRoom";

/**
 * Burst reactions: the buttons under the stage and the hearts they throw. A
 * press goes to the room and comes back as a broadcast, so you watch your own
 * burst arrive on the same path as everybody else's.
 */

// Off-palette red, the same licence the pizza slice at the bar takes: an amber
// heart would read as one more piece of cabinet chrome.
const HEART_RED = "#e0475f";

const GLYPHS: Record<ReactionKind, { rows: string[]; color: string; label: string }> = {
  heart: {
    color: HEART_RED,
    label: "heart",
    rows: [
      ".##.##.",
      "#######",
      "#######",
      "#######",
      ".#####.",
      "..###..",
      "...#...",
    ],
  },
  smile: {
    color: "#f5b53f",
    label: "smiley",
    rows: [
      ".#####.",
      "#######",
      "##.#.##",
      "#######",
      "#.###.#",
      "##...##",
      ".#####.",
    ],
  },
  star: {
    color: "#ecdcb4",
    label: "star",
    rows: [
      "...#...",
      "..###..",
      "#######",
      ".#####.",
      "..###..",
      ".##.##.",
      "##...##",
    ],
  },
};

/** Bakes a lit-pixel grid into one background image, so a burst costs one node. */
function glyphUrl(kind: ReactionKind): string {
  const { rows, color } = GLYPHS[kind];
  const cells = rows
    .flatMap((row, y) =>
      [...row].map((c, x) => (c === "#" ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : "")),
    )
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rows[0]!.length} ${rows.length}" ` +
    `fill="${color}" shape-rendering="crispEdges">${cells}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const GLYPH_URLS: Record<ReactionKind, string> = {
  heart: glyphUrl("heart"),
  smile: glyphUrl("smile"),
  star: glyphUrl("star"),
};

function Glyph({ kind, size }: { kind: ReactionKind; size: number }) {
  return (
    <span
      aria-hidden
      className="block bg-center bg-no-repeat"
      style={{
        width: size,
        height: size,
        backgroundImage: GLYPH_URLS[kind],
        backgroundSize: "contain",
        filter: "drop-shadow(2px 2px 0 rgba(0,0,0,.7))",
      }}
    />
  );
}

/**
 * A burst's arc, derived from its id so it survives a re-render. Rolling this
 * fresh each render would restart the animation every time a frame lands.
 */
function arcFromId(id: string): { drift: number; duration: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return { drift: (h % 49) - 24, duration: 2.1 + ((h >>> 5) % 5) * 0.1 };
}

/** The bursts in flight, floating up off the frog that threw them. */
export function ReactionLayer({ reactions }: { reactions: Reaction[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {reactions.map((r) => {
        const { drift, duration } = arcFromId(r.id);
        return (
          <span
            key={r.id}
            className="react-float absolute"
            style={{
              left: `${r.x}%`,
              bottom: "15%",
              animationDuration: `${duration}s`,
              ["--react-drift" as string]: `${drift}px`,
            }}
          >
            <Glyph kind={r.kind} size={26} />
          </span>
        );
      })}
    </div>
  );
}

/** The buttons themselves. Rendered only for someone with a frog to throw from. */
export function ReactionBar({ onReact }: { onReact: (kind: ReactionKind) => void }) {
  return (
    <div className="absolute bottom-2 left-3 flex items-center gap-2">
      {REACTION_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          aria-label={`react with a ${GLYPHS[kind].label}`}
          // A focused button would swallow the space bar, which the band types
          // with and the pit cheers with.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onReact(kind)}
          className="grid h-9 w-9 place-items-center border-2 border-cabinet-border bg-cabinet-btn transition-transform hover:border-cabinet-accent active:translate-y-px"
        >
          <Glyph kind={kind} size={18} />
        </button>
      ))}
    </div>
  );
}
