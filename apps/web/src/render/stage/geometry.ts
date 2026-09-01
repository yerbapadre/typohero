// Perspective for the note highway. Lanes are trapezoids converging on a
// vanishing point; a note's depth `z` runs 1 (horizon, just spawned) to 0
// (hard against the camera). Screen y is proportional to the depth scale, which
// is what makes notes accelerate as they approach the hit line.
export type StageGeom = {
  w: number;
  h: number;
  blockLeft: number;
  blockRight: number;
  yTop: number;
  yHit: number;
  yBot: number;
  vpX: number;
  laneHalfW: number;
  laneCx: number[];
  sFar: number;
  zHit: number;
  depth: number;
  yRig: number;
  performerH: number;
};

// The horizon sits low enough to leave a shelf between the lighting rig and
// the top of the highway — that band is the riser the band stands and walks
// on, so the rig hangs high and tight to the ceiling to keep it clear.
const TOP_FRAC = 0.27;
const RIG_FRAC = 0.18;
// Headroom kept above a performer for their name tag and mood shout, so the
// stack clears the lighting rig instead of being drawn through it.
export const TAG_ROOM = 56;
const HIT_FRAC = 0.72;
const BOT_FRAC = 1;
const DEPTH = 1.5;
const LANE_GAP = 10;
const EDGE_PAD = 24;
const MAX_LANE_W = 240;

export function stageGeom(w: number, h: number, laneCount: number): StageGeom {
  const lanes = Math.max(1, laneCount);
  const usable = w - EDGE_PAD * 2 - LANE_GAP * (lanes - 1);
  // Lanes are capped so a small band doesn't stretch into a highway wider than
  // the stage; the whole block is centred, leaving wings for the rig.
  const laneW = Math.min(MAX_LANE_W, usable / lanes);
  const blockW = laneW * lanes + LANE_GAP * (lanes - 1);
  const leftX = (w - blockW) / 2;
  const laneCx = Array.from({ length: lanes }, (_, i) => leftX + laneW / 2 + i * (laneW + LANE_GAP));

  const yTop = h * TOP_FRAC;
  const yHit = h * HIT_FRAC;
  const yBot = h * BOT_FRAC;
  const sFar = 1 / (1 + DEPTH);
  const sHit = sFar + (1 - sFar) * ((yHit - yTop) / (yBot - yTop));

  return {
    w,
    h,
    blockLeft: leftX,
    blockRight: leftX + blockW,
    yTop,
    yHit,
    yBot,
    vpX: w / 2,
    laneHalfW: laneW / 2,
    laneCx,
    sFar,
    zHit: (1 / sHit - 1) / DEPTH,
    depth: DEPTH,
    yRig: yTop * RIG_FRAC,
    performerH: Math.max(44, Math.min(150, yTop * (1 - RIG_FRAC) - TAG_ROOM)),
  };
}

// A performer's x is a percentage of the stage width — the same units the room
// relays over `move`, so a frog stands in the same spot on every machine.
export function performerX(g: StageGeom, xPercent: number): number {
  return (xPercent / 100) * g.w;
}

export function depthScale(g: StageGeom, z: number): number {
  return 1 / (1 + g.depth * Math.max(0, z));
}

export function yAtScale(g: StageGeom, s: number): number {
  return g.yTop + (g.yBot - g.yTop) * ((s - g.sFar) / (1 - g.sFar));
}

// A note's depth from its travel progress: 0 = spawn (horizon), 1 = hit line.
export function zAtProgress(g: StageGeom, progress: number): number {
  return 1 + progress * (g.zHit - 1);
}

export function laneEdgesAtScale(g: StageGeom, lane: number, s: number) {
  const cx = g.vpX + ((g.laneCx[lane] ?? g.vpX) - g.vpX) * s;
  const halfW = g.laneHalfW * s;
  return { cx, left: cx - halfW, right: cx + halfW, halfW };
}
