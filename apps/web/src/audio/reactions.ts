function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function cutoffForQuality(q: number): number {
  return 300 * Math.pow(60, clamp01(q));
}

export function gainForQuality(q: number): number {
  return 0.6 + 0.4 * clamp01(q);
}

export function dryWetForQuality(q: number): { dry: number; wet: number } {
  const c = clamp01(q);
  return { dry: c, wet: 1 - c };
}

export function makeDistortionCurve(amount: number): Float32Array {
  const n = 44100;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}
