import { useEffect, useRef, useState } from "react";
import {
  createRhythmRun,
  applyRhythmKeypress,
  expireRhythmNotes,
  charStatesFromRhythm,
  type Chart,
  type RhythmRun,
} from "@typohero/engine";
import type { LocalLaneView } from "./useStageScene";

/**
 * Drives a rhythm run off song time rather than wall time.
 *
 * `run` is state for React to render; `getRun` reads the live value every frame
 * without a re-render, which is what the canvas uses — expiring a note usually
 * changes nothing, so the run cannot be relied on to tick the render loop.
 */
export function useRhythmRun(opts: {
  chart: Chart;
  songTimeMs: () => number | null;
  enabled: boolean;
}): { run: RhythmRun; getRun: () => RhythmRun } {
  const { chart, songTimeMs, enabled } = opts;

  const [run, setRun] = useState(() => createRhythmRun(chart));
  const runRef = useRef(run);
  const clockRef = useRef(songTimeMs);
  clockRef.current = songTimeMs;

  useEffect(() => {
    const fresh = createRhythmRun(chart);
    runRef.current = fresh;
    setRun(fresh);
  }, [chart]);

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.length !== 1) return;
      const atMs = clockRef.current();
      if (atMs === null) return;
      event.preventDefault();
      const next = applyRhythmKeypress(runRef.current, { char: event.key, atMs });
      if (next === runRef.current) return;
      runRef.current = next;
      setRun(next);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    function tick() {
      const atMs = clockRef.current();
      if (atMs !== null) {
        const next = expireRhythmNotes(runRef.current, atMs);
        if (next !== runRef.current) {
          runRef.current = next;
          setRun(next);
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  return { run, getRun: () => runRef.current };
}

/**
 * The highway's per-frame view of a rhythm run. Character states are rebuilt
 * only when the run itself changes, not on every frame the canvas draws.
 */
export function useRhythmLaneView(getRun: () => RhythmRun): () => LocalLaneView {
  const cache = useRef<{ run: RhythmRun; displayChars: LocalLaneView["displayChars"] } | null>(null);

  return () => {
    const run = getRun();
    if (!cache.current || cache.current.run !== run) {
      cache.current = { run, displayChars: charStatesFromRhythm(run) };
    }
    return {
      cursor: run.resolved,
      displayChars: cache.current.displayChars,
      streak: run.streak,
      points: run.points,
    };
  };
}
