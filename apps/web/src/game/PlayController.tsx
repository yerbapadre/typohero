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
import { CountIn } from "../ui/cabinet";

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
    <div className="flex h-screen flex-col items-center gap-5 bg-cabinet-bg px-6 py-8 font-pixel text-cabinet-text">
      <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase tracking-widest">
        <span className="border-2 border-cabinet-accent px-2 py-1 text-cabinet-accent">{instrument}</span>
        <span className="text-cabinet-text/60">{song?.title ?? "—"}</span>
        <span className="text-cabinet-text/25">·</span>
        <span className="text-cabinet-text/60">{difficulty}</span>
        <span className="text-cabinet-text/25">·</span>
        <span className="text-cabinet-text/60">{wpm} wpm</span>
      </div>

      <div className="relative w-80 flex-1 overflow-hidden border-[3px] border-cabinet-frame bg-black/40 shadow-[8px_8px_0_var(--cab-shadow)]">
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
          <div className="absolute inset-0 grid place-items-center px-4">
            <CountIn
              size="panel"
              label="listen for your cue"
              value={`${(remainingMs / 1000).toFixed(1)}s`}
            />
          </div>
        ) : (
          <button onClick={() => setPressMs(Date.now())} className="absolute inset-0 grid place-items-center">
            <span className="border-2 border-cabinet-accent bg-cabinet-accent px-6 py-4 text-sm uppercase tracking-widest text-cabinet-ink transition-colors hover:bg-[#ffcf5a]">
              ▶ Start Show
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-widest">
        <span className="text-white">{run.points} pts</span>
        <span className="text-cabinet-text/25">·</span>
        <span>
          streak {run.streak} <span className="text-cabinet-accent">×{streakMultiplier(run.streak)}</span>
        </span>
        <span className="text-cabinet-text/25">·</span>
        <span className="text-cabinet-text/50">longest {run.longestStreak}</span>
      </div>
    </div>
  );
}
