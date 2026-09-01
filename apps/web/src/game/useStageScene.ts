import { useMemo } from "react";
import {
  buildNotes,
  notesText,
  passageById,
  firstPassage,
  laneFirstActiveMs,
  centerOn,
  cursorFromProgress,
  bandQuality,
  DIFFICULTY_WPM,
  type RoomState,
  type LiveStat,
  type Song,
  type TypingRun,
} from "@typohero/engine";
import type { StageScene, StageLaneView } from "../render/stage/scene";

export type LocalLane = { run: TypingRun };

// Builds the highway scene every machine draws: one lane per playing member,
// the local player's lane pulled to the centre. Remote lanes are rebuilt from
// the room snapshot (deterministic notes) plus the 20Hz LiveStat.
export function useStageScene(opts: {
  snapshot: RoomState;
  frame: Record<string, LiveStat>;
  song: Song | null;
  youId: string | null;
  travelMs: number;
  local?: LocalLane | null;
}): () => StageScene {
  const { snapshot, frame, song, youId, travelMs, local } = opts;

  const shape = snapshot.members
    .map((m) => `${m.id}:${m.connected ? 1 : 0}:${m.instrument ?? ""}:${m.passageId ?? ""}:${m.difficulty}`)
    .join("|");

  const sources = useMemo(() => {
    const playing = snapshot.members.filter((m) => m.connected && m.instrument);
    return centerOn(playing, (m) => m.id === youId).map((m) => {
      const passage = (m.passageId && passageById(m.passageId)) || firstPassage();
      const notes = buildNotes(passage.content, DIFFICULTY_WPM[m.difficulty], { travelMs });
      return {
        id: m.id,
        name: m.name,
        instrument: m.instrument!,
        notes,
        textLength: notesText(passage.content).length,
        cueMs: song ? laneFirstActiveMs(song, m.instrument!) : 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, song, travelMs, youId]);

  return () => {
    const now = Date.now();
    const startedAt = snapshot.startedAtEpochMs;

    const lanes: StageLaneView[] = sources.map((src) => {
      const stat = frame[src.id];
      const you = src.id === youId;
      const laneStart = startedAt === null ? null : startedAt + src.cueMs;
      const waitingMs = laneStart === null ? 0 : laneStart > now ? laneStart - now : null;
      const run = you ? local?.run : undefined;

      return {
        id: src.id,
        name: src.name,
        instrument: src.instrument,
        you,
        notes: src.notes,
        cursor: run ? run.cursor : cursorFromProgress(stat?.progress ?? 0, src.textLength),
        displayChars: run ? run.displayChars : null,
        elapsedMs: laneStart === null ? 0 : now - laneStart,
        waitingMs,
        quality: stat?.quality ?? 1,
        streak: run ? run.streak : (stat?.streak ?? 0),
        points: run ? run.points : (stat?.points ?? 0),
        progress: stat?.progress ?? 0,
      };
    });

    return {
      lanes,
      travelMs,
      bandQuality: bandQuality(sources.map((s) => frame[s.id])),
    };
  };
}
