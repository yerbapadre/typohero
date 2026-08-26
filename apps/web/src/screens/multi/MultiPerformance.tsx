import { useEffect, useRef, useState } from "react";
import {
  createRun,
  applyKeypress,
  applyPace,
  paceIndexFor,
  DIFFICULTY_WPM,
  type Keypress,
  type TypingRun,
  type LiveStat,
} from "@typohero/engine";
import type { Room } from "../../net/useRoom";
import { PassageView } from "../../game/PassageView";
import { MultiStemPlayer } from "../../audio/StemPlayer";
import { qualityFromRun } from "../../audio/reactions";

const PASSAGE = "the quick brown fox jumps over the lazy dog and the band plays on";

function liveStat(run: TypingRun): LiveStat {
  const resolved = run.cursor || 1;
  let good = 0;
  for (let i = 0; i < run.cursor; i++) {
    const s = run.displayChars[i];
    if (s === "correct" || s === "fixed") good++;
  }
  return {
    quality: qualityFromRun(run),
    streak: run.streak,
    points: run.points,
    progress: run.cursor / run.text.length,
    accuracy: good / resolved,
  };
}

export function MultiPerformance({ room }: { room: Room }) {
  const snap = room.snapshot!;
  const me = snap.members.find((m) => m.id === room.playerId)!;
  const wpm = DIFFICULTY_WPM[me.difficulty];
  const [run, setRun] = useState(() => createRun(PASSAGE));
  const runRef = useRef(run);
  runRef.current = run;
  const stemRef = useRef<MultiStemPlayer | null>(null);

  useEffect(() => {
    if (!me.audioOutput || !snap.songId) return;
    let cancelled = false;
    const player = new MultiStemPlayer();
    stemRef.current = player;
    const url = `/songs/${snap.songId}`;
    (async () => {
      const song = await fetch(`${url}/song.json`).then((r) => r.json());
      if (cancelled) return;
      await player.load(song, url);
      if (cancelled) return;
      await player.start();
    })().catch(() => {});
    return () => {
      cancelled = true;
      player.stop();
    };
  }, [me.audioOutput, snap.songId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      let press: Keypress | null = null;
      if (e.key === "Backspace") press = { type: "backspace", atMs: performance.now() };
      else if (e.key.length === 1) press = { type: "char", char: e.key, atMs: performance.now() };
      if (!press) return;
      e.preventDefault();
      setRun((r) => applyKeypress(r, press));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let raf = 0;
    function tick() {
      const startAt = room.snapshot?.startedAtEpochMs;
      if (startAt) {
        const elapsed = Date.now() - startAt;
        if (elapsed > 0) setRun((r) => applyPace(r, paceIndexFor(wpm, elapsed)));
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wpm, room.snapshot]);

  useEffect(() => {
    const id = setInterval(() => {
      room.send({ type: "stats", stat: liveStat(runRef.current) });
    }, 50);
    return () => clearInterval(id);
  }, [room]);

  useEffect(() => {
    const player = stemRef.current;
    if (!player) return;
    for (const m of snap.members) {
      if (!m.instrument) continue;
      const q = room.frame[m.id]?.quality ?? 1;
      player.setQuality(m.instrument, q);
    }
  }, [room.frame, snap.members]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-900 px-8 text-white">
      <div className="text-sm text-neutral-500">
        {snap.phase === "results" ? "results" : `${me.instrument} · ${me.difficulty}`}
      </div>
      <PassageView text={run.text} displayChars={run.displayChars} cursor={run.cursor} />
      <div className="flex flex-col gap-1 font-mono text-sm">
        {snap.members.map((m) => {
          const s = room.frame[m.id];
          return (
            <div key={m.id} className={m.id === room.playerId ? "text-white" : "text-neutral-400"}>
              {m.name} · {m.instrument} · {s ? `${s.points} pts · ${Math.round(s.quality * 100)}%` : "—"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
