import { useMemo } from "react";
import {
  buildNotes,
  notesText,
  passageById,
  firstPassage,
  laneFirstActiveMs,
  DIFFICULTY_WPM,
  type InstrumentLane,
} from "@typohero/engine";
import type { Room } from "../../net/useRoom";
import { useSongs } from "../../net/useSongs";
import { HighwayCanvas } from "../../render/HighwayCanvas";
import { useTypingRun } from "../../game/useTypingRun";
import { useStatBroadcast } from "../../game/useStatBroadcast";
import { useStemOutput } from "../../game/useStemOutput";
import { useCountIn } from "../../game/useCountIn";
import { Roster } from "./Roster";
import { MultiResults } from "./MultiResults";

const TRAVEL_MS = 3500;

export function MultiPerformance({ room }: { room: Room }) {
  const snap = room.snapshot!;
  const me = snap.members.find((m) => m.id === room.playerId)!;
  const songs = useSongs();
  const song = songs?.find((s) => s.id === snap.songId) ?? null;
  const wpm = DIFFICULTY_WPM[me.difficulty];
  const cueMs = song && me.instrument ? laneFirstActiveMs(song, me.instrument) : 0;
  const startAtMs = snap.startedAtEpochMs === null ? null : snap.startedAtEpochMs + cueMs;
  const { waiting, remainingMs } = useCountIn(startAtMs);
  const live = startAtMs !== null && !waiting;
  const passage = (me.passageId && passageById(me.passageId)) || firstPassage();

  const text = useMemo(() => notesText(passage.content), [passage.content]);
  const notes = useMemo(() => buildNotes(passage.content, wpm, { travelMs: TRAVEL_MS }), [passage.content, wpm]);

  const { run, elapsedMs } = useTypingRun({ text, notes, startAtMs, enabled: live });

  useStatBroadcast(run, room.send);

  const laneQuality: Partial<Record<InstrumentLane, number>> = {};
  for (const m of snap.members) {
    if (m.instrument) laneQuality[m.instrument] = room.frame[m.id]?.quality ?? 1;
  }
  useStemOutput({ enabled: me.audioOutput, songId: snap.songId, laneQuality });

  if (snap.phase === "results") {
    return <MultiResults members={snap.members} frame={room.frame} youId={room.playerId} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-900 px-8 py-8 text-white">
      <div className="text-sm text-neutral-500">
        {me.instrument} · {me.difficulty}
      </div>
      <div className="relative h-[70vh] w-80 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
        {live ? (
          <HighwayCanvas
            getState={() => ({
              notes,
              elapsedMs,
              travelMs: TRAVEL_MS,
              cursor: run.cursor,
              displayChars: run.displayChars,
            })}
          />
        ) : startAtMs !== null ? (
          <div className="absolute inset-0 grid place-items-center text-center font-mono">
            <div>
              <div className="text-sm text-neutral-500">listen for your cue</div>
              <div className="mt-1 text-2xl text-sky-400">
                {me.instrument} in {(remainingMs / 1000).toFixed(1)}s
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <Roster members={snap.members} frame={room.frame} youId={room.playerId} />
    </div>
  );
}
