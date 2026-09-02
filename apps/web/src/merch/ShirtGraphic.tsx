import type { CSSProperties } from "react";

// A tee in its own 200x220 box. The print window is the rectangle below; art
// is stretched into it so a design always lands in the same place on the
// garment — which is also why it needs no clip, it can't spill. Hard black
// outline to sit next to the frog line art.
const PRINT = { x: 56, y: 58, w: 88, h: 100 };

const BODY =
  "M58 14 C78 36, 122 36, 142 14 L192 54 L166 92 L156 76 L156 206 L44 206 L44 76 L34 92 L8 54 Z";

export function ShirtGraphic({
  garment,
  art,
  /** Stretch the tee to fill its box (used when fitting it to a frog). */
  stretch = false,
  className = "",
  style,
}: {
  garment: string;
  art?: string | null;
  stretch?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 200 220"
      preserveAspectRatio={stretch ? "none" : "xMidYMid meet"}
      className={className}
      style={style}
      aria-hidden
    >
      <path d={BODY} fill={garment} stroke="#0c0a07" strokeWidth={5} strokeLinejoin="miter" />

      {art && (
        <image
          href={art}
          x={PRINT.x}
          y={PRINT.y}
          width={PRINT.w}
          height={PRINT.h}
          preserveAspectRatio="none"
        />
      )}

      {/* collar rib + sleeve seams — thin detail lines over the print */}
      <path
        d="M58 14 C78 36, 122 36, 142 14"
        fill="none"
        stroke="#0c0a07"
        strokeWidth={5}
        opacity={0.35}
        transform="translate(0 9)"
      />
      <path d="M44 76 L34 92" fill="none" stroke="#0c0a07" strokeWidth={4} opacity={0.5} />
      <path d="M156 76 L166 92" fill="none" stroke="#0c0a07" strokeWidth={4} opacity={0.5} />
    </svg>
  );
}
