import { useEffect, useRef } from "react";
import type { InstrumentLane } from "@typohero/engine";
import { MultiStemPlayer } from "../audio/StemPlayer";

type LaneQuality = Partial<Record<InstrumentLane, number>>;

export function useStemOutput(opts: {
  enabled: boolean;
  songId: string | null;
  laneQuality: LaneQuality;
}) {
  const { enabled, songId, laneQuality } = opts;
  const playerRef = useRef<MultiStemPlayer | null>(null);

  useEffect(() => {
    if (!enabled || !songId) return;
    let cancelled = false;
    const player = new MultiStemPlayer();
    playerRef.current = player;
    const url = `/songs/${songId}`;
    (async () => {
      const song = await fetch(`${url}/song.json`).then((r) => r.json());
      if (cancelled) return;
      await player.load(song, url);
      if (cancelled) return;
      await player.start();
    })().catch(() => {});
    return () => {
      cancelled = true;
      playerRef.current = null;
      player.stop();
    };
  }, [enabled, songId]);

  const key = JSON.stringify(laneQuality);
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.setAll(1);
    for (const [lane, q] of Object.entries(laneQuality)) {
      player.setQuality(lane as InstrumentLane, q as number);
    }
  }, [key]);
}
