import type { CharState, Note } from "@typohero/engine";

export type HighwayState = {
  notes: Note[];
  elapsedMs: number;
  travelMs: number;
  cursor: number;
  displayChars: CharState[];
};

const HIT_LINE_FRAC = 0.82;
const CHAR_COLOR: Record<CharState, string> = {
  pending: "#71717a",
  correct: "#4ade80",
  incorrect: "#f87171",
  fixed: "#fbbf24",
  missed: "#52525b",
};

export function drawHighway(ctx: CanvasRenderingContext2D, w: number, h: number, s: HighwayState) {
  ctx.clearRect(0, 0, w, h);

  const hitY = h * HIT_LINE_FRAC;

  // hit line
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, hitY);
  ctx.lineTo(w, hitY);
  ctx.stroke();

  ctx.font = "600 30px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const n of s.notes) {
    if (n.charEnd <= s.cursor) continue; // resolved (hit or already burned)

    const prog = (s.elapsedMs - n.spawnMs) / s.travelMs;
    if (prog < -0.05 || prog > 1.15) continue;

    const y = prog * hitY;
    const active = s.cursor >= n.charStart && s.cursor < n.charEnd;
    drawNote(ctx, w / 2, y, n, s, active);
  }
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  n: Note,
  s: HighwayState,
  active: boolean,
) {
  const padX = 16;
  const boxH = 46;
  const textW = ctx.measureText(n.word).width;
  const boxW = textW + padX * 2;
  const x = cx - boxW / 2;

  ctx.fillStyle = active ? "rgba(56,189,248,0.14)" : "rgba(255,255,255,0.05)";
  roundRect(ctx, x, y - boxH / 2, boxW, boxH, 10);
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(56,189,248,0.7)" : "rgba(255,255,255,0.12)";
  ctx.lineWidth = active ? 2 : 1;
  roundRect(ctx, x, y - boxH / 2, boxW, boxH, 10);
  ctx.stroke();

  // per-char coloring so the active word shows typed progress
  let chX = cx - textW / 2;
  for (let i = 0; i < n.word.length; i++) {
    const ch = n.word[i]!;
    const state = s.displayChars[n.charStart + i]!;
    ctx.fillStyle = active ? CHAR_COLOR[state] : "#a1a1aa";
    ctx.textAlign = "left";
    ctx.fillText(ch, chX, y);
    chX += ctx.measureText(ch).width;
  }
  ctx.textAlign = "center";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
