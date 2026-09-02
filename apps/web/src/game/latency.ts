const KEY = "typohero:latency";
const LIMIT_MS = 400;

/**
 * How far ahead of the game clock this machine's player actually hears the song:
 * audio output latency, keyboard latency and the walk from the PA all collapse
 * into one number. Positive means they hear it late, so their keystrokes arrive
 * late and the judge should shift with them.
 *
 * Measured by a calibration pass; 0 until then.
 */
export function latencyOffsetMs(): number {
  try {
    const stored = Number(localStorage.getItem(KEY));
    if (!Number.isFinite(stored)) return 0;
    return Math.max(-LIMIT_MS, Math.min(LIMIT_MS, stored));
  } catch {
    return 0;
  }
}

export function setLatencyOffsetMs(ms: number): void {
  try {
    localStorage.setItem(KEY, String(Math.round(ms)));
  } catch {
    return;
  }
}
