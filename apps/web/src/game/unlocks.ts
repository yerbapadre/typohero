import { useEffect, useState } from "react";
import { FREE_FROG_IDS, FROGS, frogById, type Frog } from "../characters";

const STORAGE_KEY = "typohero:unlocked";

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(ids)) return [];
    // Drop ids for frogs that no longer exist (or stopped being premium).
    return ids.filter((id): id is string => typeof id === "string" && frogById(id)?.premium === true);
  } catch {
    return [];
  }
}

let unlocked = new Set(read());

const listeners = new Set<(ids: Set<string>) => void>();

function commit(next: Set<string>) {
  unlocked = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Private-mode / quota — the unlock still holds for this page load.
  }
  listeners.forEach((l) => l(next));
}

export function isUnlocked(id: string | null | undefined): boolean {
  if (!id) return false;
  return FREE_FROG_IDS.includes(id) || unlocked.has(id);
}

/** Every frog the player may actually pick right now. */
export function playableFrogs(): Frog[] {
  return FROGS.filter((f) => isUnlocked(f.id));
}

export function grantUnlock(id: string) {
  if (unlocked.has(id)) return;
  commit(new Set(unlocked).add(id));
}

export type RedeemResult = { ok: true; frog: Frog } | { ok: false; error: string };

/**
 * Trade a code for a premium frog. The Worker holds the codes; a wrong code
 * looks identical to an unknown one so codes can't be enumerated by response.
 */
export async function redeemCode(code: string): Promise<RedeemResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "enter a code" };

  const res = await fetch("/api/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code: trimmed }),
  }).catch(() => null);

  if (!res) return { ok: false, error: "no signal — try again" };
  if (!res.ok) return { ok: false, error: "that code doesn't work" };

  const { frogId } = (await res.json().catch(() => ({}))) as { frogId?: string };
  const frog = frogById(frogId);
  if (!frog) return { ok: false, error: "that code doesn't work" };

  grantUnlock(frog.id);
  return { ok: true, frog };
}

/** Re-renders on unlock so carousels grow the moment a code lands. */
export function useUnlocks(): Set<string> {
  const [ids, setIds] = useState(unlocked);
  useEffect(() => {
    setIds(unlocked);
    listeners.add(setIds);
    return () => void listeners.delete(setIds);
  }, []);
  return ids;
}
