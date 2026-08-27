import { useEffect, useState } from "react";
import { createRun, applyKeypress, applyNotePace, activeWordStart, type Note } from "@typohero/engine";

export function useTypingRun(opts: {
  text: string;
  notes: Note[];
  startAtMs: number | null;
  enabled?: boolean;
}) {
  const { text, notes, startAtMs, enabled = true } = opts;
  const [run, setRun] = useState(() => createRun(text));
  const [elapsedMs, setElapsedMs] = useState(0);

  function reset() {
    setElapsedMs(0);
    setRun(createRun(text));
  }

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        setRun((r) =>
          r.cursor > activeWordStart(notes, r.cursor)
            ? applyKeypress(r, { type: "backspace", atMs: performance.now() })
            : r,
        );
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        setRun((r) => applyKeypress(r, { type: "char", char: e.key, atMs: performance.now() }));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, notes]);

  useEffect(() => {
    if (startAtMs === null) return;
    let raf = 0;
    function tick() {
      const elapsed = Date.now() - startAtMs!;
      if (elapsed >= 0) {
        setElapsedMs(elapsed);
        setRun((r) => applyNotePace(r, notes, elapsed));
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startAtMs, notes]);

  return { run, elapsedMs, reset };
}
