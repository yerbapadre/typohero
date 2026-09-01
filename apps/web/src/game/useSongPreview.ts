import { useEffect } from "react";
import type { Song } from "@typohero/engine";
import { getAudioContext } from "../audio/unlock";

const START_FRAC = 0.25;
const MAX_START_MS = 30000;
const DEBOUNCE_MS = 160;

export function useSongPreview(song: Song | null, volume = 0.35) {
  const id = song?.id ?? null;

  useEffect(() => {
    if (!song) return;
    const ctx = getAudioContext();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(ctx.destination);

    let els: HTMLAudioElement[] = [];
    const startSec = Math.min(MAX_START_MS, song.durationMs * START_FRAC) / 1000;

    const timer = setTimeout(() => {
      if (ctx.state === "suspended") void ctx.resume();
      els = song.lanes.map((lane) => {
        const el = new Audio(`/songs/${song.id}/${lane.stem}`);
        el.preload = "auto";
        ctx.createMediaElementSource(el).connect(gain);
        el.addEventListener(
          "loadedmetadata",
          () => {
            try {
              el.currentTime = Math.min(startSec, Math.max(0, el.duration - 1));
            } catch {
              /* seek not ready */
            }
            el.play().catch(() => {});
          },
          { once: true },
        );
        return el;
      });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      for (const el of els) {
        el.pause();
        el.src = "";
      }
      gain.disconnect();
    };
  }, [id, volume]);
}
