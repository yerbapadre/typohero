import { useEffect, useRef, useState } from "react";
import {
  createRun,
  applyKeypress,
  applyPace,
  paceIndexFor,
  streakMultiplier,
  DIFFICULTY_WPM,
  type Keypress,
  type Difficulty,
} from "@typohero/engine";
import { PassageView } from "./PassageView";
import { StemPlayer } from "../audio/StemPlayer";
import { qualityFromRun } from "../audio/reactions";

const PASSAGE = "the quick brown fox jumps over the lazy dog";
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert", "god"];

export function PlayController() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [run, setRun] = useState(() => createRun(PASSAGE));
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  const startRef = useRef<number | null>(null);
  const stemRef = useRef<StemPlayer | null>(null);
  const wpm = DIFFICULTY_WPM[difficulty];

  async function start() {
    const stem = new StemPlayer();
    stemRef.current = stem;
    await stem.load("/loop.wav");
    await stem.start();
    startedRef.current = true;
    setStarted(true);
  }

  function restart(next: Difficulty) {
    setDifficulty(next);
    setRun(createRun(PASSAGE));
    startRef.current = null;
  }

  useEffect(() => {
    return () => stemRef.current?.stop();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!startedRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      let press: Keypress | null = null;
      if (e.key === "Backspace") {
        press = { type: "backspace", atMs: performance.now() };
      } else if (e.key.length === 1) {
        press = { type: "char", char: e.key, atMs: performance.now() };
      }
      if (!press) return;

      e.preventDefault();
      if (press.type === "char" && startRef.current === null) {
        startRef.current = press.atMs;
      }
      setRun((r) => applyKeypress(r, press));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let raf = 0;
    function tick() {
      if (startRef.current !== null) {
        const elapsed = performance.now() - startRef.current;
        setRun((r) => applyPace(r, paceIndexFor(wpm, elapsed)));
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wpm]);

  useEffect(() => {
    if (started) stemRef.current?.setQuality(qualityFromRun(run));
  }, [run, started]);

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
      <PassageView text={run.text} displayChars={run.displayChars} cursor={run.cursor} />
      <div className="font-mono text-sm text-neutral-400">
        {run.points} pts · streak {run.streak} (×{streakMultiplier(run.streak)}) · longest{" "}
        {run.longestStreak}
      </div>
      {!started && (
        <button onClick={start} className="font-mono text-lg text-green-400">
          ▶ start
        </button>
      )}
    </div>
  );
}
