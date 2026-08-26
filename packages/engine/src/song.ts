export type InstrumentLane = "vocals" | "guitar" | "bass" | "drums" | "keys";

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
