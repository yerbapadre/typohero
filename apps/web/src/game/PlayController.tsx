import { useEffect, useMemo, useRef, useState } from "react";
import {
  streakMultiplier,
  qualityFromRun,
  summarizeRun,
  buildNotes,
  notesText,
  passageById,
  firstPassage,
  laneFirstActiveMs,
  DIFFICULTY_WPM,
  type InstrumentLane,
} from "@typohero/engine";
import { HighwayCanvas } from "../render/HighwayCanvas";
import { useTypingRun } from "./useTypingRun";
import { useStemOutput } from "./useStemOutput";
import { useCountIn } from "./useCountIn";
import { useSongs } from "../net/useSongs";
import { useNav } from "../nav/NavContext";

const TRAVEL_MS = 3500;

export function PlayController() {
  const { config, finish } = useNav();
  const [pressMs, setPressMs] = useState<number | null>(null);
  const songs = useSongs();

  const difficulty = config.difficulty;
  const instrument: InstrumentLane = config.instrument ?? "vocals";
  const song = songs?.find((s) => s.id === config.songId) ?? songs?.[0] ?? null;
  const passage = (config.passageId && passageById(config.passageId)) || firstPassage();
  const wpm = DIFFICULTY_WPM[difficulty];
  const cueMs = song ? laneFirstActiveMs(song, instrument) : 0;

  const startAtMs = pressMs === null ? null : pressMs + cueMs;
  const { waiting, remainingMs } = useCountIn(startAtMs);
  const live = startAtMs !== null && !waiting;

  const text = useMemo(() => notesText(passage.content), [passage.content]);
  const notes = useMemo(() => buildNotes(passage.content, wpm, { travelMs: TRAVEL_MS }), [passage.content, wpm]);

  const { run, elapsedMs } = useTypingRun({ text, notes, startAtMs, enabled: live });
  useStemOutput({
    enabled: pressMs !== null,
    songId: song?.id ?? null,
    laneQuality: { [instrument]: qualityFromRun(run) },
  });

  const done = live && run.cursor >= text.length;
  const finished = useRef(false);
  useEffect(() => {
    if (done && !finished.current) {
      finished.current = true;
      finish(summarizeRun(run));
    }
  }, [done, run, finish]);

  return (
    <div className="flex h-screen flex-col items-center gap-6 bg-neutral-900 px-8 py-8 text-white">
      <div className="flex gap-3 font-mono text-sm text-neutral-500">
        <span className="text-sky-400">{instrument}</span>
        <span>· {song?.title ?? "—"}</span>
        <span>· {difficulty}</span>
        <span>· {wpm} wpm</span>
      </div>

      <div className="relative w-80 flex-1 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
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
        ) : pressMs !== null ? (
          <div className="absolute inset-0 grid place-items-center gap-2 text-center font-mono">
            <div>
              <div className="text-sm text-neutral-500">listen for your cue</div>
              <div className="mt-1 text-2xl text-sky-400">{instrument} in {(remainingMs / 1000).toFixed(1)}s</div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setPressMs(Date.now())}
            className="absolute inset-0 grid place-items-center font-mono text-lg text-green-400"
          >
            ▶ start show
          </button>
        )}
      </div>

      <div className="font-mono text-sm text-neutral-400">
        {run.points} pts · streak {run.streak} (×{streakMultiplier(run.streak)}) · longest {run.longestStreak}
      </div>
    </div>
  );
}
