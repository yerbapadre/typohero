export type FrogStat = { label: string; value: number };

export type Frog = {
  id: string;
  name: string;
  image: string;
  tagline: string;
  description: string;
  accent: string;
  stats: FrogStat[];
};

export const FROGS: Frog[] = [
  {
    id: "gunslinger",
    name: "The Gunslinger",
    image: "/frogs/gunslinger.png",
    tagline: "Fastest keys in the west.",
    description:
      "Quick on the draw and quicker on the keyboard. Rides in, types clean, and is gone before the note even lands.",
    accent: "text-amber-400",
    stats: [
      { label: "Speed", value: 5 },
      { label: "Focus", value: 3 },
      { label: "Power", value: 2 },
    ],
  },
  {
    id: "boxer",
    name: "The Bruiser",
    image: "/frogs/boxer.png",
    tagline: "Types with his whole bodyweight.",
    description:
      "Every keystroke lands like a hook. Slow to start, but once the combo is rolling nothing knocks him off rhythm.",
    accent: "text-red-400",
    stats: [
      { label: "Power", value: 5 },
      { label: "Focus", value: 3 },
      { label: "Speed", value: 2 },
    ],
  },
  {
    id: "wizard",
    name: "The Conjurer",
    image: "/frogs/wizard.png",
    tagline: "Turns typos into frogspells.",
    description:
      "Ancient, unbothered, precise. Misses bend to his will — the longer the passage, the stronger his hex.",
    accent: "text-emerald-400",
    stats: [
      { label: "Focus", value: 5 },
      { label: "Speed", value: 3 },
      { label: "Power", value: 2 },
    ],
  },
];

export function frogById(id: string | null | undefined): Frog | undefined {
  return FROGS.find((f) => f.id === id);
}
