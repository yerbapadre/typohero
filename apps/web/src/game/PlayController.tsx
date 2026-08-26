import { useEffect, useState } from "react";
import { createRun, applyKeypress, type Keypress } from "@typohero/engine";
import { PassageView } from "./PassageView";

const PASSAGE = "the quick brown fox jumps over the lazy dog";

export function PlayController() {
  const [run, setRun] = useState(() => createRun(PASSAGE));

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      let press: Keypress | null = null;
      if (e.key === "Backspace") {
        press = { type: "backspace", atMs: performance.now() };
      } else if (e.key.length === 1) {
        press = { type: "char", char: e.key, atMs: performance.now() };
      }
      if (!press) return;

      e.preventDefault();
      setRun((r) => applyKeypress(r, press));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-10 bg-neutral-900 px-8 text-white">
      <PassageView text={run.text} displayChars={run.displayChars} cursor={run.cursor} />
      <div className="font-mono text-sm text-neutral-400">
        streak {run.streak} · longest {run.longestStreak}
      </div>
    </div>
  );
}
