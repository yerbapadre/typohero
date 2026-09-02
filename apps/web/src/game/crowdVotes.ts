import type { CrowdMember } from "@typohero/protocol";

/** How many spectators are rooting for each song, keyed by song id. */
export function tallyCrowdVotes(crowd: CrowdMember[]): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const c of crowd) {
    if (c.vote) tally[c.vote] = (tally[c.vote] ?? 0) + 1;
  }
  return tally;
}

/**
 * The song the pit wants most. Ties break toward nobody in particular — the
 * first id the tally happens to hold — since the host picks the song anyway.
 */
export function leadingCrowdPick(crowd: CrowdMember[]): { songId: string; votes: number } | null {
  let best: { songId: string; votes: number } | null = null;
  for (const [songId, votes] of Object.entries(tallyCrowdVotes(crowd))) {
    if (!best || votes > best.votes) best = { songId, votes };
  }
  return best;
}
