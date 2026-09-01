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
  chartFromFile,
  chartNotes,
  travelMsForChart,
  laneTimes,
  DIFFICULTY_WPM,
  type RoomState,
  type LiveStat,
  type Song,
  type CharState,
  type ChartFile,
} from "@typohero/engine";
import type { StageScene, StageLaneView } from "../render/stage/scene";
import type { Position } from "../net/useRoom";
import type { WalkState } from "../game/walk";
import { frogById } from "../characters";

/** Read every frame, so the canvas sees the local player's typing without a re-render. */
export type LocalLaneView = {
  cursor: number;
  displayChars: CharState[];
  streak: number;
  points: number;
};

export type LocalLane = { view: () => LocalLaneView };

// Builds the highway scene every machine draws: one lane per playing member,
// the local player's lane pulled to the centre. Remote lanes are rebuilt from
// the room snapshot (deterministic notes) plus the 20Hz LiveStat.
export function useStageScene(opts: {
  snapshot: RoomState;
  frame: Record<string, LiveStat>;
  song: Song | null;
  youId: string | null;
  travelMs: number;
  chart?: ChartFile | null;
  local?: LocalLane | null;
  positions: Record<string, Position>;
  // The local player's frog, read straight off the walker each frame so
  // running around the riser never re-renders React.
  localWalk?: () => WalkState | null;
}): () => StageScene {
  const { snapshot, frame, song, youId, travelMs, chart, local, positions, localWalk } = opts;

  const shape = snapshot.members
    .map((m) => `${m.id}:${m.connected ? 1 : 0}:${m.instrument ?? ""}:${m.passageId ?? ""}:${m.difficulty}`)
    .join("|");

  const sources = useMemo(() => {
    const playing = snapshot.members.filter((m) => m.connected && m.instrument);
    return centerOn(playing, (m) => m.id === youId).map((m) => {
      const passage = (m.passageId && passageById(m.passageId)) || firstPassage();
      const instrument = m.instrument!;
      const common = {
        id: m.id,
        name: m.name,
        instrument,
        image: frogById(m.character?.faceId)?.image ?? null,
      };

      const charted = chart && laneTimes(chart, instrument, m.difficulty).length > 0;
      if (charted) {
        const laneChart = chartFromFile(chart, instrument, m.difficulty, passage.content, {
          loop: true,
        });
        const laneTravelMs = travelMsForChart(laneChart);
        return {
          ...common,
          rhythm: true,
          travelMs: laneTravelMs,
          notes: chartNotes(laneChart, laneTravelMs),
          textLength: laneChart.notes.length,
          cueMs: 0,
        };
      }

      return {
        ...common,
        rhythm: false,
        travelMs,
        notes: buildNotes(passage.content, DIFFICULTY_WPM[m.difficulty], { travelMs }),
        textLength: notesText(passage.content).length,
        cueMs: song ? laneFirstActiveMs(song, instrument) : 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, song, travelMs, youId, chart]);

  return () => {
    const now = Date.now();
    const startedAt = snapshot.startedAtEpochMs;

    const lanes: StageLaneView[] = sources.map((src) => {
      const stat = frame[src.id];
      const you = src.id === youId;
      const laneStart = startedAt === null ? null : startedAt + src.cueMs;
      const waitingMs = laneStart === null ? 0 : laneStart > now ? laneStart - now : null;
      const view = you ? local?.view() : undefined;
      const at = (you ? localWalk?.() : null) ?? positions[src.id] ?? null;

      return {
        id: src.id,
        name: src.name,
        instrument: src.instrument,
        you,
        notes: src.notes,
        travelMs: src.travelMs,
        cursor: view ? view.cursor : cursorFromProgress(stat?.progress ?? 0, src.textLength),
        displayChars: view ? view.displayChars : null,
        elapsedMs: laneStart === null ? 0 : now - laneStart,
        waitingMs,
        quality: stat?.quality ?? 1,
        streak: view ? view.streak : (stat?.streak ?? 0),
        points: view ? view.points : (stat?.points ?? 0),
        progress: stat?.progress ?? 0,
        performer: {
          image: src.image,
          xPercent: at ? at.x : null,
          yPercent: at ? at.y : 0,
          facing: (at?.facing ?? 1) < 0 ? -1 : 1,
        },
      };
    });

    return {
      lanes,
      travelMs,
      bandQuality: bandQuality(sources.map((s) => frame[s.id])),
    };
  };
}
