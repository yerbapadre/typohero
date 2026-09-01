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
import { useTypingRun } from "../../game/useTypingRun";
import { useStatBroadcast } from "../../game/useStatBroadcast";
import { useStemOutput } from "../../game/useStemOutput";
import { useCountIn } from "../../game/useCountIn";
import { TRAVEL_MS } from "../../render/stage/scene";
import { StageView } from "./StageView";
import { MultiResults } from "./MultiResults";

export function MultiPerformance({ roomId, room }: { roomId: string; room: Room }) {
  const snap = room.snapshot!;
  const me = snap.members.find((m) => m.id === room.playerId)!;
  const songs = useSongs();
  const song = songs?.find((s) => s.id === snap.songId) ?? null;
  const wpm = DIFFICULTY_WPM[me.difficulty];
  const cueMs = song && me.instrument ? laneFirstActiveMs(song, me.instrument) : 0;
  const startAtMs = snap.startedAtEpochMs === null ? null : snap.startedAtEpochMs + cueMs;
  const { waiting } = useCountIn(startAtMs);
  const live = startAtMs !== null && !waiting;
  const passage = (me.passageId && passageById(me.passageId)) || firstPassage();

  const text = useMemo(() => notesText(passage.content), [passage.content]);
  const notes = useMemo(
    () => buildNotes(passage.content, wpm, { travelMs: TRAVEL_MS }),
    [passage.content, wpm],
  );

  const { run } = useTypingRun({ text, notes, startAtMs, enabled: live });

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
    <StageView
      roomId={roomId}
      snapshot={snap}
      frame={room.frame}
      song={song}
      youId={room.playerId}
      local={{ run }}
      crowd={room.crowd}
      controllableCrowd={false}
    />
  );
}
