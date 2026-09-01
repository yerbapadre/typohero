import { INSTRUMENT_LANES, presentLanes, type InstrumentLane } from "@typohero/engine";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { useSongs } from "../net/useSongs";

export function InstrumentSelect() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();
  const songs = useSongs();
  const song = songs?.find((s) => s.id === config.songId) ?? null;
  const available = song ? new Set(presentLanes(song)) : new Set(INSTRUMENT_LANES);

  function pick(lane: InstrumentLane) {
    if (available.has(lane)) setConfig({ instrument: lane });
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-neutral-900 py-16 text-white">
      <h1 className="text-2xl">Pick your instrument</h1>
      <div className="text-sm text-neutral-500">
        {song ? `${song.title} — only the instruments actually in the mix` : "loading…"}
      </div>

      <div className="flex flex-wrap justify-center gap-3 font-mono text-lg">
        {INSTRUMENT_LANES.map((lane: InstrumentLane) => {
          const on = available.has(lane);
          return (
            <button
              key={lane}
              disabled={!on}
              onClick={() => pick(lane)}
              title={on ? undefined : "not in this song"}
              className={
                config.instrument === lane
                  ? "text-sky-400"
                  : on
                    ? "text-neutral-400"
                    : "text-neutral-700 line-through"
              }
            >
              {lane}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-4">
        <button className="text-neutral-500" onClick={() => navigate("/solo/song")}>
          Back
        </button>
        <button
          disabled={!config.instrument}
          onClick={() => navigate("/solo/difficulty")}
          className="text-lg text-green-400 disabled:text-neutral-700"
        >
          Next: Difficulty →
        </button>
      </div>
    </div>
  );
}
