import { useEffect, useState } from "react";
import { createRun, applyKeypress, applyPace, paceIndexFor, type Keypress } from "@typohero/engine";

export function useTypingRun(opts: {
  passage: string;
  wpm: number;
  startAtMs: number | "auto" | null;
  enabled?: boolean;
}) {
  const { passage, wpm, startAtMs, enabled = true } = opts;
  const [run, setRun] = useState(() => createRun(passage));
  const [autoStart, setAutoStart] = useState<number | null>(null);

  function reset() {
    setAutoStart(null);
    setRun(createRun(passage));
  }

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      let press: Keypress | null = null;
      if (e.key === "Backspace") press = { type: "backspace", atMs: performance.now() };
      else if (e.key.length === 1) press = { type: "char", char: e.key, atMs: performance.now() };
      if (!press) return;
      e.preventDefault();
      if (press.type === "char" && startAtMs === "auto") {
        setAutoStart((prev) => prev ?? Date.now());
      }
      setRun((r) => applyKeypress(r, press));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, startAtMs]);

  const clock = startAtMs === "auto" ? autoStart : startAtMs;
  useEffect(() => {
    if (clock === null) return;
    let raf = 0;
    function tick() {
      const elapsed = Date.now() - clock!;
      if (elapsed > 0) setRun((r) => applyPace(r, paceIndexFor(wpm, elapsed)));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wpm, clock]);

  return { run, reset };
}
