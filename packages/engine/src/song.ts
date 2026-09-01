export type InstrumentLane = "vocals" | "drums" | "bass" | "guitar" | "piano" | "other";

export const INSTRUMENT_LANES: InstrumentLane[] = [
  "vocals",
  "drums",
  "bass",
  "guitar",
  "piano",
  "other",
];

export type ActiveSegment = [startMs: number, endMs: number];

export type SongLane = {
  instrument: InstrumentLane;
  stem: string;
  present?: boolean;
  active?: ActiveSegment[];
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  durationMs: number;
  lanes: SongLane[];
};

export function laneOf(song: Song, lane: InstrumentLane): SongLane | undefined {
  return song.lanes.find((l) => l.instrument === lane);
}

export function laneIsPresent(song: Song, lane: InstrumentLane): boolean {
  const l = laneOf(song, lane);
  if (!l) return false;
  return l.present ?? true;
}

export function presentLanes(song: Song): InstrumentLane[] {
  return song.lanes.filter((l) => l.present ?? true).map((l) => l.instrument);
}

export function laneActiveAt(song: Song, lane: InstrumentLane, ms: number): boolean {
  const l = laneOf(song, lane);
  if (!l) return false;
  if (!l.active) return true;
  return l.active.some(([start, end]) => ms >= start && ms < end);
}

export function laneFirstActiveMs(song: Song, lane: InstrumentLane): number {
  const l = laneOf(song, lane);
  if (!l || !l.active || l.active.length === 0) return 0;
  return l.active[0]![0];
}
