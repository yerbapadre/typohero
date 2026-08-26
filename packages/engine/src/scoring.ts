export type PerformanceStats = {
  progress: number;
  accuracy: number;
  streak: number;
  longestStreak: number;
  points: number;
};

export type BandScore = {
  total: number;
  hype: number;
};

export type LiveStat = {
  quality: number;
  streak: number;
  points: number;
  progress: number;
  accuracy: number;
};

export const BASE_POINTS = 100;

const MULTIPLIER_TIERS: [number, number][] = [
  [300, 5],
  [250, 4],
  [200, 3],
  [150, 2.5],
  [100, 2],
  [75, 1.75],
  [50, 1.5],
  [20, 1.3],
  [10, 1.15],
];

export function streakMultiplier(streak: number): number {
  for (const [threshold, mult] of MULTIPLIER_TIERS) {
    if (streak >= threshold) return mult;
  }
  return 1;
}

export function strokePoints(streak: number): number {
  return Math.round(BASE_POINTS * streakMultiplier(streak));
}
