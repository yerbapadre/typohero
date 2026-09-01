import { streakMultiplier, type CharState } from "@typohero/engine";
import { readPalette, alpha, mix, type Palette } from "./palette";
import {
  stageGeom,
  depthScale,
  yAtScale,
  zAtProgress,
  laneEdgesAtScale,
  type StageGeom,
} from "./geometry";
import { createParticles, type Particles } from "./juice";
import type { StageScene, StageLaneView } from "./scene";

const PALETTE_REFRESH_MS = 500;
const FLASH_MS = 180;
const MISS_MS = 420;
const RUNG_COUNT = 9;
const RUNG_SPEED = 0.00022;
const CULL_BEFORE = -0.03;
const CULL_AFTER = 1.03;
const STAR_MULTIPLIER = 2;

type LaneMemory = {
  cursor: number;
  streak: number;
  hitFlash: number;
  missFlash: number;
  shake: number;
};

function pixelFont(px: number): string {
  return `700 ${px}px Silkscreen, monospace`;
}

function noteFont(px: number): string {
  return `600 ${px}px ui-monospace, SFMono-Regular, Menlo, monospace`;
}

function charColor(state: CharState, p: Palette): string {
  switch (state) {
    case "correct":
      return p.accent;
    case "fixed":
      return mix(p.accent, p.text, 0.6);
    case "incorrect":
      return p.bad;
    case "missed":
      return alpha(p.text, 0.25);
    default:
      return alpha(p.text, 0.65);
  }
}

export function createStageRenderer() {
  const particles: Particles = createParticles();
  const memory = new Map<string, LaneMemory>();
  let palette = readPalette();
  let sincePalette = 0;
  let lastFrameMs = 0;
  let clock = 0;

  function laneMemory(lane: StageLaneView): LaneMemory {
    let m = memory.get(lane.id);
    if (!m) {
      m = { cursor: lane.cursor, streak: lane.streak, hitFlash: 0, missFlash: 0, shake: 0 };
      memory.set(lane.id, m);
    }
    return m;
  }

  function draw(ctx: CanvasRenderingContext2D, w: number, h: number, scene: StageScene): void {
    const now = performance.now();
    const dt = lastFrameMs === 0 ? 16 : Math.min(64, now - lastFrameMs);
    lastFrameMs = now;
    clock += dt;

    sincePalette += dt;
    if (sincePalette >= PALETTE_REFRESH_MS) {
      palette = readPalette();
      sincePalette = 0;
    }

    const g = stageGeom(w, h, scene.lanes.length);

    ctx.clearRect(0, 0, w, h);
    drawBackdrop(ctx, g, palette, scene.bandQuality, clock);

    for (const [i, lane] of scene.lanes.entries()) {
      const mem = laneMemory(lane);
      trackLane(lane, mem, g, i, particles, palette, dt);

      ctx.save();
      if (mem.shake > 0) {
        const k = mem.shake;
        ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
      }
      drawLaneBody(ctx, g, i, lane, palette, clock, mem);
      drawNotes(ctx, g, i, lane, scene, palette);
      drawHitBar(ctx, g, i, lane, palette, mem);
      drawDeck(ctx, g, i, lane, palette, clock);
      ctx.restore();
    }

    particles.update(dt);
    particles.draw(ctx);
    drawScanlines(ctx, w, h);
  }

  return { draw };
}

export type StageRenderer = ReturnType<typeof createStageRenderer>;

// Watches a lane for notes crossing the hit line and turns them into pixels.
// The local lane knows per-character truth; a remote lane only reveals a miss
// by dropping its streak.
function trackLane(
  lane: StageLaneView,
  mem: LaneMemory,
  g: StageGeom,
  index: number,
  particles: Particles,
  p: Palette,
  dt: number,
): void {
  mem.hitFlash = Math.max(0, mem.hitFlash - dt);
  mem.missFlash = Math.max(0, mem.missFlash - dt);
  mem.shake = Math.max(0, mem.shake - dt * 0.03);

  if (lane.waitingMs !== null) {
    mem.cursor = lane.cursor;
    mem.streak = lane.streak;
    return;
  }

  const streakBroke = lane.streak === 0 && mem.streak > 0;

  if (lane.cursor > mem.cursor) {
    const { cx } = laneEdgesAtScale(g, index, depthScale(g, g.zHit));
    for (const n of lane.notes) {
      if (n.charEnd <= mem.cursor || n.charEnd > lane.cursor) continue;
      const clean = lane.displayChars
        ? !hasFault(lane.displayChars, n.charStart, n.charEnd)
        : !streakBroke;
      if (clean) {
        mem.hitFlash = FLASH_MS;
        particles.burst({
          x: cx,
          y: g.yHit,
          count: lane.you ? 14 : 9,
          color: p.accent,
          speed: 0.24,
          size: lane.you ? 4 : 3,
        });
      } else {
        mem.missFlash = MISS_MS;
        mem.shake = lane.you ? 9 : 5;
        particles.burst({
          x: cx,
          y: g.yHit,
          count: 10,
          color: p.bad,
          speed: 0.16,
          up: 0.04,
          ttl: 700,
        });
      }
    }
    mem.cursor = lane.cursor;
  } else if (lane.cursor < mem.cursor) {
    mem.cursor = lane.cursor;
  }

  if (streakBroke && mem.missFlash === 0) mem.missFlash = MISS_MS;
  mem.streak = lane.streak;
}

function hasFault(chars: CharState[], from: number, to: number): boolean {
  for (let i = from; i < to; i++) {
    const s = chars[i];
    if (s === "missed" || s === "incorrect") return true;
  }
  return false;
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  p: Palette,
  bandQuality: number,
  clock: number,
): void {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, g.w, g.h);

  // Back wall, then the stage floor in front of it.
  ctx.fillStyle = mix(p.bg, p.frame, 1);
  ctx.fillRect(0, 0, g.w, g.yTop);
  ctx.fillStyle = mix(p.bg, p.btn, 0.55);
  ctx.fillRect(0, g.yTop, g.w, g.h - g.yTop);

  drawCurtain(ctx, g, p);
  drawBackline(ctx, g, p);
  drawLightBeams(ctx, g, p, bandQuality, clock);
  drawTruss(ctx, g, p, bandQuality, clock);

  ctx.fillStyle = alpha(p.accent, 0.35);
  ctx.fillRect(0, Math.round(g.yTop) - 2, g.w, 2);
}

// Hard-edged pleats across the back wall — a curtain, without a gradient.
function drawCurtain(ctx: CanvasRenderingContext2D, g: StageGeom, p: Palette): void {
  const top = g.yTop * 0.42;
  for (let x = 0; x < g.w; x += 46) {
    ctx.fillStyle = alpha(p.ink, 0.55);
    ctx.fillRect(Math.round(x), top, 24, g.yTop - top);
    ctx.fillStyle = alpha(p.text, 0.03);
    ctx.fillRect(Math.round(x) + 24, top, 4, g.yTop - top);
  }
}

// Amp stacks in the wings, so the lanes read as standing on a stage rather
// than floating in a void. Skipped when the wings are too narrow to hold them.
function drawBackline(ctx: CanvasRenderingContext2D, g: StageGeom, p: Palette): void {
  const base = g.yTop + 34;
  const wingL = g.blockLeft;
  const wingR = g.w - g.blockRight;

  const stacks: { cx: number; w: number; h: number }[] = [];
  if (wingL > 120) {
    stacks.push({ cx: wingL * 0.3, w: 84, h: 60 });
    stacks.push({ cx: wingL * 0.68, w: 66, h: 92 });
  }
  if (wingR > 120) {
    stacks.push({ cx: g.blockRight + wingR * 0.32, w: 66, h: 92 });
    stacks.push({ cx: g.blockRight + wingR * 0.7, w: 84, h: 60 });
  }

  for (const stack of stacks) {
    const x = Math.round(stack.cx - stack.w / 2);
    const y = Math.round(base - stack.h);
    ctx.fillStyle = alpha(p.shadow, 0.35);
    ctx.fillRect(x + 5, y + 5, stack.w, stack.h);
    ctx.fillStyle = mix(p.bg, p.btn, 0.85);
    ctx.fillRect(x, y, stack.w, stack.h);
    ctx.strokeStyle = p.frame;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, stack.w, stack.h);

    ctx.fillStyle = alpha(p.text, 0.07);
    for (let gy = y + 10; gy < y + stack.h - 10; gy += 6) {
      ctx.fillRect(x + 8, gy, stack.w - 16, 2);
    }
    ctx.fillStyle = alpha(p.accent, 0.5);
    ctx.fillRect(x + stack.w - 14, y + stack.h - 12, 5, 5);
  }
}

// Swinging beams, drawn as hard-edged parallelograms in three quantized alpha
// bands — no gradients, per the cabinet language.
function drawLightBeams(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  p: Palette,
  bandQuality: number,
  clock: number,
): void {
  const rigY = g.yTop * 0.3;
  const energy = 0.4 + Math.max(0, Math.min(1, bandQuality)) * 0.6;

  for (const [i, at] of FIXTURES.entries()) {
    const x = g.w * at;
    const swing = Math.sin(clock / (1500 + i * 240) + i) * g.w * 0.13;
    const tint = i % 2 === 0 ? p.accent : mix(p.accent, p.text, 0.45);

    for (const [band, spread] of [
      [0.06, 1],
      [0.09, 0.6],
      [0.14, 0.28],
    ] as const) {
      const halfBottom = g.w * 0.075 * spread;
      ctx.fillStyle = alpha(tint, band * energy);
      ctx.beginPath();
      ctx.moveTo(x - 5, rigY);
      ctx.lineTo(x + 5, rigY);
      ctx.lineTo(x + swing + halfBottom, g.h);
      ctx.lineTo(x + swing - halfBottom, g.h);
      ctx.closePath();
      ctx.fill();
    }
  }
}

const FIXTURES = [0.08, 0.24, 0.4, 0.6, 0.76, 0.92];

function drawTruss(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  p: Palette,
  bandQuality: number,
  clock: number,
): void {
  const y = Math.round(g.yTop * 0.3);
  const half = 11;

  ctx.fillStyle = mix(p.bg, p.frame, 0.9);
  ctx.fillRect(0, y - half, g.w, half * 2);

  ctx.strokeStyle = alpha(p.text, 0.28);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y - half);
  ctx.lineTo(g.w, y - half);
  ctx.moveTo(0, y + half);
  ctx.lineTo(g.w, y + half);
  for (let x = 0; x < g.w; x += 30) {
    ctx.moveTo(x, y - half);
    ctx.lineTo(x + 15, y + half);
    ctx.moveTo(x + 15, y - half);
    ctx.lineTo(x + 30, y + half);
  }
  ctx.stroke();

  // Par cans on the truss; they pulse with how tight the band is playing.
  const energy = Math.max(0, Math.min(1, bandQuality));
  for (const [i, at] of FIXTURES.entries()) {
    const x = Math.round(g.w * at);
    const lit = 0.35 + energy * (0.4 + 0.25 * Math.sin(clock / 260 + i));
    ctx.fillStyle = p.frame;
    ctx.fillRect(x - 9, y + half, 18, 6);
    ctx.fillStyle = alpha(p.accent, lit);
    ctx.fillRect(x - 7, y + half + 6, 14, 7);
  }
}

function lanePath(ctx: CanvasRenderingContext2D, g: StageGeom, index: number): void {
  const far = laneEdgesAtScale(g, index, g.sFar);
  const near = laneEdgesAtScale(g, index, 1);
  ctx.beginPath();
  ctx.moveTo(far.left, g.yTop);
  ctx.lineTo(far.right, g.yTop);
  ctx.lineTo(near.right, g.yBot);
  ctx.lineTo(near.left, g.yBot);
  ctx.closePath();
}

function drawLaneBody(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  index: number,
  lane: StageLaneView,
  p: Palette,
  clock: number,
  mem: LaneMemory,
): void {
  const rot = 1 - Math.max(0, Math.min(1, lane.quality));
  const base = lane.you ? mix(p.btn, p.accent, 0.07) : mix(p.bg, p.btn, 0.55);

  lanePath(ctx, g, index);
  ctx.fillStyle = mix(base, p.bad, rot * 0.35);
  ctx.fill();

  ctx.save();
  lanePath(ctx, g, index);
  ctx.clip();
  drawRungs(ctx, g, index, p, clock, lane);
  if (streakMultiplier(lane.streak) >= STAR_MULTIPLIER) drawChevrons(ctx, g, index, p, clock);
  if (rot > 0.25) drawTears(ctx, g, index, p, rot, clock);
  if (mem.hitFlash > 0) {
    ctx.fillStyle = alpha(p.accent, 0.1 * (mem.hitFlash / FLASH_MS));
    ctx.fillRect(0, g.yTop, g.w, g.yBot - g.yTop);
  }
  ctx.restore();

  const railColor =
    mem.missFlash > 0 ? p.bad : lane.you ? p.accent : alpha(p.text, rot > 0.4 ? 0.2 : 0.32);
  ctx.strokeStyle = railColor;
  ctx.lineWidth = lane.you ? 3 : 2;
  lanePath(ctx, g, index);
  ctx.stroke();
}

// Receding cross-ties. They scroll toward the camera so the lane reads as
// moving even before the first note arrives.
function drawRungs(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  index: number,
  p: Palette,
  clock: number,
  lane: StageLaneView,
): void {
  const offset = (clock * RUNG_SPEED) % 1;
  for (let i = 0; i < RUNG_COUNT; i++) {
    const t = (i / RUNG_COUNT + offset) % 1;
    const z = 1 - t;
    const s = depthScale(g, z);
    const y = yAtScale(g, s);
    if (y > g.yBot) continue;
    const { left, right } = laneEdgesAtScale(g, index, s);
    ctx.fillStyle = alpha(p.text, 0.05 + s * (lane.you ? 0.09 : 0.05));
    ctx.fillRect(left, Math.round(y), right - left, Math.max(1, Math.round(2 * s)));
  }
}

function drawChevrons(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  index: number,
  p: Palette,
  clock: number,
): void {
  const offset = (clock * 0.0006) % 1;
  for (let i = 0; i < 5; i++) {
    const t = (i / 5 + offset) % 1;
    const s = depthScale(g, 1 - t);
    const y = yAtScale(g, s);
    const { cx, halfW } = laneEdgesAtScale(g, index, s);
    ctx.strokeStyle = alpha(p.accent, 0.16 + s * 0.2);
    ctx.lineWidth = Math.max(1, 3 * s);
    ctx.beginPath();
    ctx.moveTo(cx - halfW * 0.5, y + 12 * s);
    ctx.lineTo(cx, y - 8 * s);
    ctx.lineTo(cx + halfW * 0.5, y + 12 * s);
    ctx.stroke();
  }
}

// Degradation made visible: the lane tears in hard horizontal bands as the
// stem's audio quality drops.
function drawTears(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  index: number,
  p: Palette,
  rot: number,
  clock: number,
): void {
  const bands = Math.round(rot * 7);
  const seed = Math.floor(clock / 90);
  for (let i = 0; i < bands; i++) {
    const t = (((seed * 31 + i * 97) % 100) / 100) * 0.95;
    const s = depthScale(g, 1 - t);
    const y = yAtScale(g, s);
    const { left, right } = laneEdgesAtScale(g, index, s);
    ctx.fillStyle = alpha(p.bad, 0.1 + rot * 0.18);
    ctx.fillRect(left, Math.round(y), right - left, Math.max(1, Math.round(3 * s)));
  }
}

function drawHitBar(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  index: number,
  lane: StageLaneView,
  p: Palette,
  mem: LaneMemory,
): void {
  const s = depthScale(g, g.zHit);
  const { left, right } = laneEdgesAtScale(g, index, s);
  const y = Math.round(g.yHit);
  const barH = 7;

  ctx.fillStyle = alpha(p.shadow, 0.9);
  ctx.fillRect(left + 5, y + barH, right - left, 5);

  const hot = mem.hitFlash > 0;
  const cold = mem.missFlash > 0;
  ctx.fillStyle = cold ? p.bad : hot ? p.text : lane.you ? p.accent : mix(p.accent, p.frame, 0.35);
  ctx.fillRect(left, y, right - left, barH);

  // End caps, so the bar reads as a fret rather than a rule.
  ctx.fillStyle = lane.you ? p.accent : mix(p.accent, p.frame, 0.5);
  ctx.fillRect(left - 5, y - 6, 10, barH + 12);
  ctx.fillRect(right - 5, y - 6, 10, barH + 12);
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(left - 5, y - 6, 10, barH + 12);
  ctx.strokeRect(right - 5, y - 6, 10, barH + 12);
}

function drawNotes(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  index: number,
  lane: StageLaneView,
  scene: StageScene,
  p: Palette,
): void {
  if (lane.waitingMs !== null) return;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const note of lane.notes) {
    if (note.charEnd <= lane.cursor) continue;
    const progress = (lane.elapsedMs - note.spawnMs) / scene.travelMs;
    if (progress < CULL_BEFORE || progress > CULL_AFTER) continue;

    const s = depthScale(g, zAtProgress(g, progress));
    const y = yAtScale(g, s);
    const { cx, halfW } = laneEdgesAtScale(g, index, s);
    const active = lane.cursor >= note.charStart && lane.cursor < note.charEnd;

    const fontPx = Math.max(12, 30 * s);
    ctx.font = noteFont(fontPx);
    const textW = ctx.measureText(note.word).width;
    const boxW = Math.min(textW + 24 * s, halfW * 2 - 6);
    const boxH = Math.max(20, 46 * s);
    const x = cx - boxW / 2;
    const top = y - boxH / 2;

    ctx.fillStyle = alpha(p.shadow, 0.55);
    ctx.fillRect(x + 4 * s, top + 4 * s, boxW, boxH);

    ctx.fillStyle = active ? mix(p.btn, p.accent, 0.16) : mix(p.bg, p.btn, 0.6);
    ctx.fillRect(x, top, boxW, boxH);

    ctx.strokeStyle = active ? p.accent : alpha(p.text, 0.28);
    ctx.lineWidth = Math.max(1, (active ? 3 : 2) * s);
    ctx.strokeRect(x, top, boxW, boxH);

    drawNoteWord(ctx, note.word, cx, y, textW, lane, note.charStart, active, p);
  }
}

function drawNoteWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  cx: number,
  y: number,
  textW: number,
  lane: StageLaneView,
  charStart: number,
  active: boolean,
  p: Palette,
): void {
  const chars = lane.displayChars;
  if (!chars || !active) {
    ctx.fillStyle = active ? p.text : alpha(p.text, lane.you ? 0.7 : 0.5);
    ctx.textAlign = "center";
    ctx.fillText(word, cx, y);
    return;
  }

  ctx.textAlign = "left";
  let x = cx - textW / 2;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]!;
    ctx.fillStyle = charColor(chars[charStart + i] ?? "pending", p);
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width;
  }
  ctx.textAlign = "center";
}

// The near strip below the hit line: who owns the lane and how they're doing.
function drawDeck(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  index: number,
  lane: StageLaneView,
  p: Palette,
  clock: number,
): void {
  // Laid out against the lane's width at the hit line — the near plane is
  // wider than the lane actually is where the plates sit.
  const deck = laneEdgesAtScale(g, index, depthScale(g, g.zHit));
  const top = g.yHit + 30;
  const width = deck.right - deck.left;
  const cx = deck.cx;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  if (lane.waitingMs !== null) {
    ctx.font = pixelFont(Math.min(12, width * 0.085));
    ctx.fillStyle = alpha(p.text, 0.45);
    ctx.fillText("CUE IN", cx, top);
    ctx.font = pixelFont(Math.min(26, width * 0.17));
    ctx.fillStyle = p.accent;
    ctx.fillText(`${(lane.waitingMs / 1000).toFixed(1)}s`, cx, top + 18);
    return;
  }

  const plateFont = Math.min(15, width * 0.1);
  ctx.font = pixelFont(plateFont);
  const label = lane.name.toUpperCase().slice(0, 14);
  const plateW = Math.min(width - 10, ctx.measureText(label).width + 22);
  const plateH = plateFont + 12;
  const px = cx - plateW / 2;

  ctx.fillStyle = alpha(p.shadow, 0.9);
  ctx.fillRect(px + 4, top + 4, plateW, plateH);
  ctx.fillStyle = lane.you ? p.accent : mix(p.bg, p.btn, 0.9);
  ctx.fillRect(px, top, plateW, plateH);
  ctx.strokeStyle = lane.you ? p.accent : p.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(px, top, plateW, plateH);

  ctx.textBaseline = "middle";
  ctx.fillStyle = lane.you ? p.ink : p.text;
  ctx.fillText(label, cx, top + plateH / 2);
  ctx.textBaseline = "top";

  ctx.font = pixelFont(Math.min(11, width * 0.075));
  ctx.fillStyle = alpha(p.text, 0.45);
  ctx.fillText(lane.instrument.toUpperCase(), cx, top + plateH + 8);

  const mult = streakMultiplier(lane.streak);
  ctx.font = pixelFont(Math.min(19, width * 0.13));
  ctx.fillStyle = p.text;
  ctx.fillText(String(lane.points), cx, top + 52);

  if (mult > 1) {
    const label = `x${mult}`;
    ctx.font = pixelFont(Math.min(13, width * 0.09));
    const pulse = mult >= 3 ? 0.75 + 0.25 * Math.sin(clock / 120) : 1;
    const w = ctx.measureText(label).width + 14;
    const bx = cx - w / 2;
    const by = top + 76;
    ctx.fillStyle = alpha(p.accent, pulse);
    ctx.fillRect(bx, by, w, 20);
    ctx.fillStyle = p.ink;
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, by + 11);
    ctx.textBaseline = "top";
  }

  drawQualityMeter(ctx, cx - width * 0.32, top + 104, width * 0.64, lane.quality, p);
}

function drawQualityMeter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  quality: number,
  p: Palette,
): void {
  const cells = 10;
  const gap = 2;
  const cellW = (w - gap * (cells - 1)) / cells;
  const lit = Math.round(Math.max(0, Math.min(1, quality)) * cells);
  for (let i = 0; i < cells; i++) {
    const on = i < lit;
    ctx.fillStyle = on ? (lit <= 4 ? p.bad : p.accent) : alpha(p.text, 0.12);
    ctx.fillRect(x + i * (cellW + gap), y, cellW, 6);
  }
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
}
