import { useMemo, useState } from "react";
import {
  streakMultiplier,
  qualityFromRun,
  buildNotes,
  notesText,
  DIFFICULTY_WPM,
  INSTRUMENT_LANES,
  type Difficulty,
  type InstrumentLane,
} from "@typohero/engine";
import { HighwayCanvas } from "../render/HighwayCanvas";
import { useTypingRun } from "./useTypingRun";
import { useStemOutput } from "./useStemOutput";
import { useSongs } from "../net/useSongs";

const PASSAGE = "the quick brown fox jumps over the lazy dog";
const TRAVEL_MS = 3500;
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert", "god"];

export function PlayController() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [instrument, setInstrument] = useState<InstrumentLane>("vocals");
  const [songId, setSongId] = useState<string | null>(null);
  const [startAtMs, setStartAtMs] = useState<number | null>(null);
  const started = startAtMs !== null;
  const songs = useSongs();
  const activeSongId = songId ?? songs?.[0]?.id ?? null;
  const wpm = DIFFICULTY_WPM[difficulty];

  const text = useMemo(() => notesText(PASSAGE), []);
  const notes = useMemo(() => buildNotes(PASSAGE, wpm, { travelMs: TRAVEL_MS }), [wpm]);

  const { run, elapsedMs, reset } = useTypingRun({
    text,
    notes,
    startAtMs,
    enabled: started,
  });
  useStemOutput({
    enabled: started,
    songId: activeSongId,
    laneQuality: { [instrument]: qualityFromRun(run) },
  });

  function stop() {
    setStartAtMs(null);
    reset();
  }

  return (
    <div className="flex h-screen flex-col items-center gap-6 bg-neutral-900 px-8 py-8 text-white">
      <div className="flex gap-2 font-mono text-sm">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => {
              setDifficulty(d);
              stop();
            }}
            className={d === difficulty ? "text-green-400" : "text-neutral-500"}
          >
            {d}
          </button>
        ))}
        <span className="text-neutral-600">· {wpm} wpm</span>
      </div>
      <div className="flex gap-2 font-mono text-sm">
        {songs?.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSongId(s.id);
              stop();
            }}
            className={s.id === activeSongId ? "text-amber-400" : "text-neutral-500"}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="flex gap-2 font-mono text-sm">
        {INSTRUMENT_LANES.map((lane) => (
          <button
            key={lane}
            onClick={() => setInstrument(lane)}
            className={lane === instrument ? "text-sky-400" : "text-neutral-500"}
          >
            {lane}
          </button>
        ))}
      </div>

      <div className="relative w-80 flex-1 overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
        {started ? (
          <HighwayCanvas
            getState={() => ({
              notes,
              elapsedMs,
              travelMs: TRAVEL_MS,
              cursor: run.cursor,
              displayChars: run.displayChars,
            })}
          />
        ) : (
          <button
            onClick={() => activeSongId && setStartAtMs(Date.now())}
            disabled={!activeSongId}
            className="absolute inset-0 grid place-items-center font-mono text-lg text-green-400 disabled:text-neutral-600"
          >
            ▶ start show
          </button>
        )}
      </div>

      <div className="font-mono text-sm text-neutral-400">
        {run.points} pts · streak {run.streak} (×{streakMultiplier(run.streak)}) · longest{" "}
        {run.longestStreak}
      </div>
    </div>
  );
}
