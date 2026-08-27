import { useMemo } from "react";
import { buildNotes, notesText, DIFFICULTY_WPM, type InstrumentLane } from "@typohero/engine";
import type { Room } from "../../net/useRoom";
import { HighwayCanvas } from "../../render/HighwayCanvas";
import { useTypingRun } from "../../game/useTypingRun";
import { useStatBroadcast } from "../../game/useStatBroadcast";
import { useStemOutput } from "../../game/useStemOutput";
import { Roster } from "./Roster";

const PASSAGE = "the quick brown fox jumps over the lazy dog and the band plays on";
const TRAVEL_MS = 3500;

export function MultiPerformance({ room }: { room: Room }) {
  const snap = room.snapshot!;
  const me = snap.members.find((m) => m.id === room.playerId)!;
  const wpm = DIFFICULTY_WPM[me.difficulty];
  const startAtMs = snap.startedAtEpochMs ?? null;
  const started = startAtMs !== null;

  const text = useMemo(() => notesText(PASSAGE), []);
  const notes = useMemo(() => buildNotes(PASSAGE, wpm, { travelMs: TRAVEL_MS }), [wpm]);

  const { run, elapsedMs } = useTypingRun({ text, notes, startAtMs, enabled: started });

  useStatBroadcast(run, room.send);

  const laneQuality: Partial<Record<InstrumentLane, number>> = {};
  for (const m of snap.members) {
    if (m.instrument) laneQuality[m.instrument] = room.frame[m.id]?.quality ?? 1;
  }
  useStemOutput({ enabled: me.audioOutput, songId: snap.songId, laneQuality });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-900 px-8 py-8 text-white">
      <div className="text-sm text-neutral-500">
        {snap.phase === "results" ? "results" : `${me.instrument} · ${me.difficulty}`}
      </div>
      <div className="relative h-[70vh] w-80 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
        {started && (
          <HighwayCanvas
            getState={() => ({
              notes,
              elapsedMs,
              travelMs: TRAVEL_MS,
              cursor: run.cursor,
              displayChars: run.displayChars,
            })}
          />
        )}
      </div>
      <Roster members={snap.members} frame={room.frame} youId={room.playerId} />
    </div>
  );
}
