import { DIFFICULTY_WPM, type InstrumentLane } from "@typohero/engine";
import type { Room } from "../../net/useRoom";
import { PassageView } from "../../game/PassageView";
import { useTypingRun } from "../../game/useTypingRun";
import { useStatBroadcast } from "../../game/useStatBroadcast";
import { useStemOutput } from "../../game/useStemOutput";
import { Roster } from "./Roster";

const PASSAGE = "the quick brown fox jumps over the lazy dog and the band plays on";

export function MultiPerformance({ room }: { room: Room }) {
  const snap = room.snapshot!;
  const me = snap.members.find((m) => m.id === room.playerId)!;

  const { run } = useTypingRun({
    passage: PASSAGE,
    wpm: DIFFICULTY_WPM[me.difficulty],
    startAtMs: snap.startedAtEpochMs,
  });

  useStatBroadcast(run, room.send);

  const laneQuality: Partial<Record<InstrumentLane, number>> = {};
  for (const m of snap.members) {
    if (m.instrument) laneQuality[m.instrument] = room.frame[m.id]?.quality ?? 1;
  }
  useStemOutput({ enabled: me.audioOutput, songId: snap.songId, laneQuality });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-900 px-8 text-white">
      <div className="text-sm text-neutral-500">
        {snap.phase === "results" ? "results" : `${me.instrument} · ${me.difficulty}`}
      </div>
      <PassageView text={run.text} displayChars={run.displayChars} cursor={run.cursor} />
      <Roster members={snap.members} frame={room.frame} youId={room.playerId} />
    </div>
  );
}
