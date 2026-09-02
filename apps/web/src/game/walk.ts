// Side-scroller physics for every frog you steer: the lobby playground, the
// crowd pit, and the band riser at the back of the stage. Units are
// percentages of the containing scene, matching what the room relays as `move`.

export type WalkZone = { min: number; max: number };
export type WalkState = { x: number; y: number; facing: 1 | -1 };
// `jumps` counts every hop in one trip off the floor: 2 is a ground jump plus
// one mid-air kick.
export type WalkTuning = { run: number; gravity: number; jump: number; jumps: number };

export const GROUND_TUNING: WalkTuning = { run: 0.42, gravity: 0.14, jump: 2.6, jumps: 2 };

// The riser is a shallow shelf upstage, so a performer takes shorter steps and
// a tighter hop than someone with the whole pit to run around in.
export const RISER_TUNING: WalkTuning = { run: 0.34, gravity: 0.2, jump: 2.3, jumps: 2 };

// A performing frog only answers to the arrow keys: every letter, space and
// backspace belongs to the typing run while the band is playing.
export type WalkKeymap = "all" | "arrows";

const ARROW_RUN = ["arrowleft", "arrowright"];
const ARROW_JUMP = ["arrowup"];
const ALL_RUN = [...ARROW_RUN, "a", "d"];
const ALL_JUMP = [...ARROW_JUMP, "w", " "];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function createWalker(opts: {
  startX: number;
  keymap: WalkKeymap;
  zone: () => WalkZone;
  tuning?: WalkTuning;
}) {
  const tuning = opts.tuning ?? GROUND_TUNING;
  const runKeys = new Set(opts.keymap === "arrows" ? ARROW_RUN : ALL_RUN);
  const jumpKeys = new Set(opts.keymap === "arrows" ? ARROW_JUMP : ALL_JUMP);

  const state: WalkState = { x: opts.startX, y: 0, facing: 1 };
  const held = new Set<string>();
  const jumpHeld = new Set<string>();
  let jumpQueued = false;
  let jumpsUsed = 0;
  let vy = 0;
  let grounded = true;

  // Returns whether the key belonged to us, so the caller knows to swallow it.
  function down(key: string): boolean {
    const k = key.toLowerCase();
    if (jumpKeys.has(k)) {
      // The OS repeats keydown while a key is leaned on; only a fresh press
      // spends a hop, so holding jump can't burn the mid-air one on the way up.
      if (!jumpHeld.has(k)) {
        jumpHeld.add(k);
        jumpQueued = true;
      }
      return true;
    }
    if (runKeys.has(k)) {
      held.add(k);
      return true;
    }
    return false;
  }

  function up(key: string): void {
    const k = key.toLowerCase();
    held.delete(k);
    jumpHeld.delete(k);
  }

  function clear(): void {
    held.clear();
    jumpHeld.clear();
    jumpQueued = false;
  }

  // One fixed step of the sim. Reports whether anything actually moved, so a
  // frog standing still costs no re-render and no `move` on the wire.
  function step(): boolean {
    let dx = 0;
    if (held.has("arrowleft") || held.has("a")) dx -= 1;
    if (held.has("arrowright") || held.has("d")) dx += 1;

    if (jumpQueued) {
      if (jumpsUsed < tuning.jumps) {
        // A mid-air kick replaces whatever fall was underway rather than adding
        // to it, so the second hop reads the same however late it is pressed.
        vy = tuning.jump;
        grounded = false;
        jumpsUsed += 1;
      }
      jumpQueued = false;
    }

    if (dx === 0 && grounded && vy === 0) return false;

    if (dx !== 0) state.facing = dx < 0 ? -1 : 1;
    const zone = opts.zone();
    state.x = clamp(state.x + dx * tuning.run, zone.min, zone.max);

    let y = state.y + vy;
    vy -= tuning.gravity;
    if (y <= 0) {
      y = 0;
      vy = 0;
      grounded = true;
      jumpsUsed = 0;
    }
    state.y = y;
    return true;
  }

  return { state, down, up, clear, step };
}

export type Walker = ReturnType<typeof createWalker>;
