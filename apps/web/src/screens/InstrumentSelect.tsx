import { INSTRUMENT_LANES, presentLanes, type InstrumentLane } from "@typohero/engine";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { useSongs } from "../net/useSongs";
import { CabinetPage } from "../ui/CabinetPage";

const ICONS: Record<string, string> = {
  vocals: "🎤",
  drums: "🥁",
  bass: "🎸",
  guitar: "🎸",
  piano: "🎹",
  other: "🎶",
};

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
    <CabinetPage
      subtitle="single player"
      title={
        <>
          PICK YOUR <span className="text-cabinet-accent">INSTRUMENT</span>
        </>
      }
    >
      <div className="grid w-full max-w-md grid-cols-3 gap-3 border-[3px] border-cabinet-frame bg-black/15 p-4 shadow-[8px_8px_0_var(--cab-shadow)]">
        {INSTRUMENT_LANES.map((lane: InstrumentLane) => {
          const on = available.has(lane);
          const active = config.instrument === lane;
          return (
            <button
              key={lane}
              disabled={!on}
              onClick={() => pick(lane)}
              title={on ? undefined : "not in this song"}
              className={
                "flex flex-col items-center gap-2 border-2 px-2 py-5 font-pixel transition-colors " +
                (active
                  ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
                  : on
                    ? "border-cabinet-border bg-cabinet-btn text-cabinet-text hover:border-cabinet-accent"
                    : "cursor-not-allowed border-cabinet-border bg-cabinet-btn text-cabinet-text/25")
              }
            >
              <span className={"text-3xl " + (on ? "" : "opacity-30 grayscale")}>{ICONS[lane] ?? "🎵"}</span>
              <span className={"text-[10px] uppercase tracking-widest " + (on ? "" : "line-through")}>{lane}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex w-full max-w-md gap-3">
        <button
          className="border-2 border-cabinet-border bg-cabinet-btn px-5 py-4 text-sm uppercase tracking-widest text-cabinet-text transition-colors hover:border-cabinet-accent"
          onClick={() => navigate("/solo/song")}
        >
          ← Back
        </button>
        <button
          disabled={!config.instrument}
          onClick={() => navigate("/solo/difficulty")}
          className="flex-1 border-2 border-cabinet-accent bg-cabinet-accent px-5 py-4 text-sm uppercase tracking-widest text-cabinet-ink transition-colors disabled:cursor-not-allowed disabled:border-cabinet-border disabled:bg-cabinet-btn disabled:text-cabinet-text/30 md:text-base"
        >
          Next: Difficulty →
        </button>
      </div>
    </CabinetPage>
  );
}
