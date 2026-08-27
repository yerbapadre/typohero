import { useState } from "react";
import {
  streakMultiplier,
  qualityFromRun,
  DIFFICULTY_WPM,
  INSTRUMENT_LANES,
  type Difficulty,
  type InstrumentLane,
} from "@typohero/engine";
import { PassageView } from "./PassageView";
import { useTypingRun } from "./useTypingRun";
import { useStemOutput } from "./useStemOutput";
import { useSongs } from "../net/useSongs";

const PASSAGE = "the quick brown fox jumps over the lazy dog";
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert", "god"];

export function PlayController() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [instrument, setInstrument] = useState<InstrumentLane>("vocals");
  const [songId, setSongId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const songs = useSongs();
  const activeSongId = songId ?? songs?.[0]?.id ?? null;
  const wpm = DIFFICULTY_WPM[difficulty];

  const { run, reset } = useTypingRun({
    passage: PASSAGE,
    wpm,
    startAtMs: started ? "auto" : null,
    enabled: started,
  });
  useStemOutput({
    enabled: started,
    songId: activeSongId,
    laneQuality: { [instrument]: qualityFromRun(run) },
  });

  function restart(next: Difficulty) {
    setDifficulty(next);
    setStarted(false);
    reset();
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-10 bg-neutral-900 px-8 text-white">
      <div className="flex gap-2 font-mono text-sm">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            onClick={() => restart(d)}
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
              setStarted(false);
              reset();
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
      <PassageView text={run.text} displayChars={run.displayChars} cursor={run.cursor} />
      <div className="font-mono text-sm text-neutral-400">
        {run.points} pts · streak {run.streak} (×{streakMultiplier(run.streak)}) · longest{" "}
        {run.longestStreak}
      </div>
      {!started && (
        <button
          onClick={() => setStarted(true)}
          disabled={!activeSongId}
          className="font-mono text-lg text-green-400 disabled:text-neutral-600"
        >
          ▶ start
        </button>
      )}
    </div>
  );
}
