import { alpha, mix, type Palette } from "./palette";
import { performerX, TAG_ROOM, type StageGeom } from "./geometry";
import { loadSprite, tintedSprite } from "./sprites";
import { pixelFont } from "./fonts";
import type { Particles } from "./juice";

// The band on the riser: the frog each player picked, standing upstage behind
// their own lane, steerable with the arrow keys while they type. Everything
// here animates off state the highway already has — no extra art, no new wire
// traffic — so a mood is a transform, a wash of colour and a hard-edged badge
// rather than a second sprite.

export type PerformerMood = "idle" | "playing" | "hot" | "rattled" | "angry";

export const RISER_ZONE = { min: 4, max: 96 };

// Homes are pulled in from the edges so a frog stands roughly over its own
// lane's deck rather than out in the wings — the highway fans out toward the
// camera, so an even spread across the full width would break the pairing.
const HOME_PAD = 17;
const HOP_SCALE = 2.6;

// Where a lane's frog stands when nobody has walked it anywhere: evenly spread
// across the riser in lane order, so each frog reads as belonging to the lane
// beneath it.
export function homeXPercent(index: number, count: number): number {
  const n = Math.max(1, count);
  return HOME_PAD + ((index + 0.5) / n) * (100 - HOME_PAD * 2);
}

type MoodStyle = {
  bobMs: number;
  bobPx: number;
  lean: number;
  droop: number;
  shakePx: number;
  badge: string | null;
  tint: ((p: Palette) => string) | null;
  tintMax: number;
};

const STYLES: Record<PerformerMood, MoodStyle> = {
  // Waiting for the cue: a slow, bored sway.
  idle: { bobMs: 900, bobPx: 2, lean: 0, droop: 0, shakePx: 0, badge: null, tint: null, tintMax: 0 },
  // In the pocket: a steady on-beat bounce.
  playing: { bobMs: 300, bobPx: 4, lean: 0.02, droop: 0, shakePx: 0, badge: null, tint: null, tintMax: 0 },
  // Star power: bigger bounce, leaning into it, lit amber.
  hot: {
    bobMs: 170,
    bobPx: 9,
    lean: 0.07,
    droop: 0,
    shakePx: 0,
    badge: "YEAH",
    tint: (p) => p.accent,
    tintMax: 0.3,
  },
  // Losing the thread: slumped, dragging, half a beat behind.
  rattled: {
    bobMs: 620,
    bobPx: 2,
    lean: -0.05,
    droop: 0.07,
    shakePx: 1,
    badge: "UGH",
    tint: (p) => mix(p.bad, p.ink, 0.45),
    tintMax: 0.35,
  },
  // Fluffed it: recoil, red, and shaking.
  angry: {
    bobMs: 90,
    bobPx: 5,
    lean: -0.14,
    droop: 0.04,
    shakePx: 6,
    badge: "GRR!",
    tint: (p) => p.bad,
    tintMax: 0.6,
  },
};

export type PerformerView = {
  image: string | null;
  name: string;
  you: boolean;
  xPercent: number;
  yPercent: number;
  facing: 1 | -1;
  mood: PerformerMood;
  // How hard the mood is being felt, 0..1 — drives the wash and the shake so a
  // reaction decays instead of snapping off.
  intensity: number;
  quality: number;
};

export function drawPerformer(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  p: Palette,
  view: PerformerView,
  clock: number,
  seed: number,
): void {
  const style = STYLES[view.mood];
  const heat = Math.max(0, Math.min(1, view.intensity));
  const x = performerX(g, view.xPercent);
  const hop = (view.yPercent / 100) * g.performerH * HOP_SCALE;
  const feet = g.yTop - hop;
  const airborne = hop > 1;

  const height = g.performerH * (view.you ? 1 : 0.88);
  const bob = airborne ? 0 : Math.sin(clock / style.bobMs + seed * 1.7) * style.bobPx;
  const shake = style.shakePx * heat;
  const jitterX = shake === 0 ? 0 : (Math.random() - 0.5) * shake * 2;
  const jitterY = shake === 0 ? 0 : (Math.random() - 0.5) * shake;

  drawFootlight(ctx, g, p, x, height, hop, view.quality);

  drawBody(ctx, p, view, style, { x: x + jitterX, feet: feet + jitterY, height, bob, heat });

  const headY = feet - height * (1 + style.droop * heat) - Math.min(0, bob);
  drawTag(ctx, g, p, view, x, headY, style, heat);
}

// A pool of light on the riser under each performer, brighter the tighter
// they're playing — the lane's quality meter, read from across the room.
function drawFootlight(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  p: Palette,
  x: number,
  height: number,
  hop: number,
  quality: number,
): void {
  const q = Math.max(0, Math.min(1, quality));
  const poolW = height * 0.72;
  ctx.fillStyle = alpha(p.accent, 0.04 + q * 0.12);
  ctx.fillRect(Math.round(x - poolW / 2), Math.round(g.yTop) - 4, Math.round(poolW), 6);

  // Contact shadow: tightens as the frog leaves the deck, so a hop reads.
  const lift = Math.min(1, hop / (height * 0.7));
  const shadowW = poolW * 0.5 * (1 - lift * 0.55);
  ctx.fillStyle = alpha(p.ink, 0.55 - lift * 0.3);
  ctx.fillRect(Math.round(x - shadowW / 2), Math.round(g.yTop) - 3, Math.round(shadowW), 4);
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  view: PerformerView,
  style: MoodStyle,
  at: { x: number; feet: number; height: number; bob: number; heat: number },
): void {
  const img = view.image ? loadSprite(view.image) : null;

  ctx.save();
  ctx.translate(at.x, at.feet);
  if (style.lean !== 0) ctx.rotate(style.lean * at.heat * view.facing);
  ctx.scale(view.facing, 1);

  // Bob is a squash, not a hover: the feet stay planted on the riser.
  const squash = 1 + at.bob / at.height - style.droop * at.heat;
  const h = at.height * squash;

  if (img) {
    const w = h * (img.naturalWidth / img.naturalHeight);
    ctx.drawImage(img, -w / 2, -h, w, h);
    const tint = style.tint?.(p);
    if (tint && at.heat > 0.01) {
      const wash = tintedSprite(view.image!, tint);
      if (wash) {
        ctx.globalAlpha = style.tintMax * at.heat;
        ctx.drawImage(wash, -w / 2, -h, w, h);
        ctx.globalAlpha = 1;
      }
    }
  } else {
    // The frog hasn't decoded yet (or the player never picked one) — hold the
    // slot with a plate rather than popping the whole riser about.
    const w = h * 0.6;
    ctx.fillStyle = alpha(p.text, 0.12);
    ctx.fillRect(-w / 2, -h, w, h);
  }

  ctx.restore();
}

const BADGE_FONT = 11;
const TAG_FONT = 9;

function drawTag(
  ctx: CanvasRenderingContext2D,
  g: StageGeom,
  p: Palette,
  view: PerformerView,
  x: number,
  headY: number,
  style: MoodStyle,
  heat: number,
): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const badged = !!style.badge && heat > 0.15;
  // `TAG_ROOM` normally keeps this clear; a squat canvas floors the performer
  // height instead, and then the stack sits on the frog's head rather than
  // being drawn through the lighting rig.
  const clearance = g.yRig + 8 + (badged ? TAG_ROOM - 19 : TAG_ROOM - 42);
  let y = Math.max(headY - 8, clearance);

  // The mood shout sits closest to the head, so a miss is legible even when
  // the frog has wandered clear of its own lane.
  if (badged) {
    ctx.font = pixelFont(BADGE_FONT);
    const w = ctx.measureText(style.badge!).width + 10;
    const h = BADGE_FONT + 8;
    ctx.fillStyle = view.mood === "angry" ? p.bad : view.mood === "hot" ? p.accent : p.btn;
    ctx.fillRect(Math.round(x - w / 2), Math.round(y - h), Math.round(w), h);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x - w / 2), Math.round(y - h), Math.round(w), h);
    ctx.fillStyle = view.mood === "rattled" ? p.text : p.ink;
    ctx.fillText(style.badge!, x, y - h / 2);
    y -= h + 4;
  }

  const label = view.name.toUpperCase().slice(0, 10);
  ctx.font = pixelFont(TAG_FONT);
  ctx.fillStyle = view.you ? p.accent : alpha(p.text, 0.45);
  ctx.fillText(label, x, y - 5);
}

// Pixels thrown when a performer's mood flips — the moment of the miss, or the
// moment star power lands.
export function burstMood(
  particles: Particles,
  p: Palette,
  g: StageGeom,
  mood: PerformerMood,
  xPercent: number,
): void {
  const x = performerX(g, xPercent);
  const y = g.yTop - g.performerH * 0.85;
  if (mood === "angry") {
    particles.burst({ x, y, count: 12, color: p.bad, speed: 0.15, up: 0.22, ttl: 620, size: 3 });
  } else if (mood === "hot") {
    particles.burst({ x, y, count: 14, color: p.accent, speed: 0.18, up: 0.2, ttl: 760, size: 3 });
  }
}
