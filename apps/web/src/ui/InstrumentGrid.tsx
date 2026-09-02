import { INSTRUMENT_LANES, type InstrumentLane } from "@typohero/engine";

const ICONS: Record<InstrumentLane, string> = {
  vocals: "🎤",
  drums: "🥁",
  bass: "🎸",
  guitar: "🎸",
  piano: "🎹",
  other: "🎶",
};

/**
 * Lane picker shared by the solo wizard and the band setup screen.
 * A lane outside `available` isn't in the song; a lane in `taken` is another
 * player's. Either way it stays visible but unpickable — except your own.
 */
export function InstrumentGrid({
  value,
  onPick,
  available,
  taken,
}: {
  value: InstrumentLane | null;
  onPick: (lane: InstrumentLane) => void;
  available: Set<InstrumentLane>;
  taken?: Set<InstrumentLane>;
}) {
  return (
    <div className="grid w-full max-w-md grid-cols-3 gap-3 border-[3px] border-cabinet-frame bg-black/15 p-4 shadow-[8px_8px_0_var(--cab-shadow)]">
      {INSTRUMENT_LANES.map((lane: InstrumentLane) => {
        const active = value === lane;
        const inSong = available.has(lane);
        const takenByOther = taken?.has(lane) ?? false;
        const disabled = (!inSong || takenByOther) && !active;
        return (
          <button
            key={lane}
            disabled={disabled}
            onClick={() => onPick(lane)}
            title={!inSong ? "not in this song" : takenByOther ? "taken" : undefined}
            className={
              "flex flex-col items-center gap-2 border-2 px-2 py-5 font-pixel transition-colors " +
              (active
                ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
                : disabled
                  ? "cursor-not-allowed border-cabinet-border bg-cabinet-btn text-cabinet-text/25"
                  : "border-cabinet-border bg-cabinet-btn text-cabinet-text hover:border-cabinet-accent")
            }
          >
            <span className={"text-3xl " + (disabled ? "opacity-30 grayscale" : "")}>{ICONS[lane]}</span>
            <span className={"text-[10px] uppercase tracking-widest " + (disabled ? "line-through" : "")}>
              {lane}
            </span>
          </button>
        );
      })}
    </div>
  );
}
