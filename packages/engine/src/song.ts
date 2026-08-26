export type InstrumentLane = "vocals" | "drums" | "bass" | "guitar" | "piano" | "other";

export const INSTRUMENT_LANES: InstrumentLane[] = [
  "vocals",
  "drums",
  "bass",
  "guitar",
  "piano",
  "other",
];

export type SongLane = {
  instrument: InstrumentLane;
  stem: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  durationMs: number;
  lanes: SongLane[];
};
