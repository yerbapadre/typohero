import { useCallback, useMemo } from "react";
import {
  buildNotes,
  notesText,
  passageById,
  firstPassage,
  laneFirstActiveMs,
  chartFromFile,
  laneTimes,
  liveStatFromRun,
  liveStatFromRhythmRun,
  DIFFICULTY_WPM,
  type InstrumentLane,
} from "@typohero/engine";
import type { Room } from "../../net/useRoom";
import { useSongs } from "../../net/useSongs";
import { useChart } from "../../net/useChart";
import { useTypingRun } from "../../game/useTypingRun";
import { useRhythmRun, useRhythmLaneView } from "../../game/useRhythmRun";
import { useStatBroadcast } from "../../game/useStatBroadcast";
import { useStemOutput } from "../../game/useStemOutput";
import { useCountIn } from "../../game/useCountIn";
import { latencyOffsetMs } from "../../game/latency";
import { TRAVEL_MS } from "../../render/stage/scene";
import { StageView } from "./StageView";
import { MultiResults } from "./MultiResults";

const EMPTY_CHART = { notes: [] };

export function MultiPerformance({ roomId, room }: { roomId: string; room: Room }) {
  const snap = room.snapshot!;
  const me = snap.members.find((m) => m.id === room.playerId)!;
  const songs = useSongs();
  const song = songs?.find((s) => s.id === snap.songId) ?? null;
  const chartFile = useChart(snap.songId);
  const passage = (me.passageId && passageById(me.passageId)) || firstPassage();

  // A charted lane plays to the song's rhythm; anything else falls back to the
  // WPM-paced word highway.
  const chart = useMemo(() => {
    if (!chartFile || !me.instrument) return null;
    if (laneTimes(chartFile, me.instrument, me.difficulty).length === 0) return null;
    return chartFromFile(chartFile, me.instrument, me.difficulty, passage.content, { loop: true });
  }, [chartFile, me.instrument, me.difficulty, passage.content]);

  const songStartMs = snap.startedAtEpochMs;
  const cueMs = song && me.instrument ? laneFirstActiveMs(song, me.instrument) : 0;
  const wordStartMs = songStartMs === null ? null : songStartMs + cueMs;

  const { waiting: waitingForSong } = useCountIn(songStartMs);
  const { waiting: waitingForCue } = useCountIn(wordStartMs);
  const rhythmLive = chart !== null && songStartMs !== null && !waitingForSong;
  const wordLive = chart === null && wordStartMs !== null && !waitingForCue;

  const songTimeMs = useCallback(
    () => (songStartMs === null ? null : Date.now() - songStartMs - latencyOffsetMs()),
    [songStartMs],
  );

  const { run: rhythmRun, getRun } = useRhythmRun({
    chart: chart ?? EMPTY_CHART,
    songTimeMs,
    enabled: rhythmLive,
  });
  const rhythmView = useRhythmLaneView(getRun);

  const wordText = useMemo(() => notesText(passage.content), [passage.content]);
  const wordNotes = useMemo(
    () => buildNotes(passage.content, DIFFICULTY_WPM[me.difficulty], { travelMs: TRAVEL_MS }),
    [passage.content, me.difficulty],
  );
  const { run: wordRun } = useTypingRun({
    text: wordText,
    notes: wordNotes,
    startAtMs: wordStartMs,
    enabled: wordLive,
  });

  const liveStat = useCallback(
    () => (chart ? liveStatFromRhythmRun(getRun()) : liveStatFromRun(wordRun)),
    [chart, getRun, wordRun],
  );
  useStatBroadcast(liveStat, room.send);

  const laneQuality: Partial<Record<InstrumentLane, number>> = {};
  for (const m of snap.members) {
    if (m.instrument) laneQuality[m.instrument] = room.frame[m.id]?.quality ?? 1;
  }
  useStemOutput({
    enabled: me.audioOutput,
    songId: snap.songId,
    laneQuality,
    anchorEpochMs: songStartMs,
  });

  // Your frog on the riser rides the same `move` channel the lobby playground
  // uses, so every other machine sees you walk the stage as you type.
  const onBandMove = useCallback(
    (x: number, y: number, facing: -1 | 1) => room.send({ type: "move", x, y, facing }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const local = useMemo(
    () => ({ view: () => (chart ? rhythmView() : wordRun) }),
    [chart, rhythmView, wordRun],
  );

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
      chart={chartFile}
      local={local}
      positions={room.positions}
      onBandMove={onBandMove}
      crowd={room.crowd}
      controllableCrowd={false}
      rhythmRun={chart ? rhythmRun : null}
    />
  );
}
