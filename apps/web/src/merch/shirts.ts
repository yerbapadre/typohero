import { useEffect, useState } from "react";

/**
 * Logical size of a shirt print. Art is stored as a PNG data URL at exactly
 * this size, so every design composites onto the garment the same way no
 * matter what the press was displayed at.
 */
export const PRINT_W = 600;
export const PRINT_H = 680;

export type ShirtDesign = {
  id: string;
  name: string;
  /** Garment colour, hex. */
  garment: string;
  /** PNG data URL of the print, PRINT_W x PRINT_H over a transparent ground. */
  art: string;
  createdAt: number;
};

export const GARMENTS: { name: string; hex: string }[] = [
  { name: "Midnight", hex: "#161310" },
  { name: "Bone", hex: "#e8e2d2" },
  { name: "Amber", hex: "#f5b53f" },
  { name: "Pond", hex: "#2f7d63" },
  { name: "Punch", hex: "#c8452f" },
  { name: "Denim", hex: "#33507a" },
  { name: "Lily", hex: "#d98aa8" },
  { name: "Ash", hex: "#7c7466" },
];

/** Paint pots on the bench. Two rows of nine in the picker. */
export const PAINTS: string[] = [
  "#0c0a07", "#4a4438", "#8d8577", "#e8e2d2", "#ffffff",
  "#f5b53f", "#f07f2a", "#c8452f", "#8f1d1d",
  "#7cf07f", "#3f9b52", "#1d6b4a", "#45d6d0", "#2f7fbf",
  "#33507a", "#7a4bd0", "#d94fa0", "#f2c9d8",
];

export const STAMPS = ["🐸", "⭐", "🎸", "🎤", "🎵", "🔥", "💀", "💚"];

export const BRUSH_SIZES = [6, 14, 30, 56];

/**
 * Where a shirt sits on a frog, in percentages of the frog art's own box.
 * Frogs are limbless blobs of very different proportions, so the tee is
 * stretched to each one rather than kept at a realistic aspect.
 */
export type ShirtFit = { left: number; top: number; width: number; height: number };

// Premium frogs are headshots, so the tee lands across the shoulders and the
// wrapper crops whatever hangs below the frame.
const DEFAULT_FIT: ShirtFit = { left: 4, top: 71, width: 92, height: 48 };

const FITS: Record<string, ShirtFit> = {
  // boxer — big square torso, gloves at the sides
  "win-the-day": { left: 0, top: 24, width: 100, height: 63 },
  // gunslinger — narrow body under a hat brim
  "demand-excellence": { left: 8, top: 42, width: 87, height: 37 },
  // wizard — tee pulled on over the robe
  "systems-thinking": { left: 6, top: 54, width: 95, height: 38 },
};

export function fitFor(frogId: string): ShirtFit {
  return FITS[frogId] ?? DEFAULT_FIT;
}

// ── Rack (saved designs) ───────────────────────────────────────────────────

const STORAGE_KEY = "typohero:shirts";

function isDesign(v: unknown): v is ShirtDesign {
  const d = v as ShirtDesign;
  return (
    !!d &&
    typeof d.id === "string" &&
    typeof d.name === "string" &&
    typeof d.garment === "string" &&
    typeof d.art === "string" &&
    typeof d.createdAt === "number"
  );
}

function read(): ShirtDesign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter(isDesign) : [];
  } catch {
    return [];
  }
}

let rack = read();
const listeners = new Set<(designs: ShirtDesign[]) => void>();

function commit(next: ShirtDesign[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota — a print is a fat data URL and the rack is the likely culprit.
    return false;
  }
  rack = next;
  listeners.forEach((l) => l(next));
  return true;
}

export function newDesignId(): string {
  return crypto.randomUUID?.() ?? `shirt-${Date.now()}-${rack.length}`;
}

/** Newest first. */
export function listDesigns(): ShirtDesign[] {
  return [...rack].sort((a, b) => b.createdAt - a.createdAt);
}

/** Insert or replace by id. Returns false if storage is full. */
export function saveDesign(design: ShirtDesign): boolean {
  const next = rack.filter((d) => d.id !== design.id);
  next.push(design);
  return commit(next);
}

export function deleteDesign(id: string) {
  commit(rack.filter((d) => d.id !== id));
}

export function useDesigns(): ShirtDesign[] {
  const [designs, setDesigns] = useState(rack);
  useEffect(() => {
    setDesigns(rack);
    listeners.add(setDesigns);
    return () => void listeners.delete(setDesigns);
  }, []);
  return [...designs].sort((a, b) => b.createdAt - a.createdAt);
}

// ── Wearing ────────────────────────────────────────────────────────────────

/**
 * Size of the copy that goes over the wire. A frog in the pit is ~74px tall,
 * so the print lands around 30px wide — shipping the full PRINT_W print to
 * every spectator would be ~50x more bytes than the screen can use.
 */
export const WIRE_W = 160;
export const WIRE_H = 180;

/** What a frog has on: the garment colour plus a wire-sized print. */
export type WornShirt = { garment: string; art: string };

/** Where a shirt sits on the spectator frog every crowd member is drawn with. */
export const CROWD_FIT: ShirtFit = { left: 8, top: 44, width: 87, height: 36 };

/** Shrink a print down to what the crowd actually needs to see. */
export function toWireArt(art: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = WIRE_W;
      c.height = WIRE_H;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no 2d context"));
      ctx.drawImage(img, 0, 0, WIRE_W, WIRE_H);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("bad art"));
    img.src = art;
  });
}

const WEAR_KEY = "typohero:wearing";

type WearState = { designId: string | null; shirt: WornShirt | null };

function readWorn(): WearState {
  try {
    const raw = localStorage.getItem(WEAR_KEY);
    const v = raw ? (JSON.parse(raw) as WearState) : null;
    if (v && typeof v.shirt?.garment === "string" && typeof v.shirt?.art === "string") {
      return { designId: typeof v.designId === "string" ? v.designId : null, shirt: v.shirt };
    }
  } catch {
    // fall through to bare-frog
  }
  return { designId: null, shirt: null };
}

let worn = readWorn();
const wearListeners = new Set<(state: WearState) => void>();

export function wornShirt(): WornShirt | null {
  return worn.shirt;
}

export function wornDesignId(): string | null {
  return worn.designId;
}

/** Put a shirt on (or take it off with `null`). */
export async function wear(design: ShirtDesign | null): Promise<void> {
  const next: WearState = design
    ? { designId: design.id, shirt: { garment: design.garment, art: await toWireArt(design.art) } }
    : { designId: null, shirt: null };
  worn = next;
  try {
    localStorage.setItem(WEAR_KEY, JSON.stringify(next));
  } catch {
    // Not persisted, but it still holds for this page load.
  }
  wearListeners.forEach((l) => l(next));
}

/** Re-renders when the player changes shirts, so the pit updates live. */
export function useWorn(): WearState {
  const [state, setState] = useState(worn);
  useEffect(() => {
    setState(worn);
    wearListeners.add(setState);
    return () => void wearListeners.delete(setState);
  }, []);
  return state;
}
