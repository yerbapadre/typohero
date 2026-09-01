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
    id: "win-the-day",
    name: "Claudius Coder",
    image: "/frogs/boxer.png",
    tagline: "An unstoppable force — just keeps swinging.",
    description:
      "Not the brightest of the bunch, but a real bruiser. A jumper with thick skin (impervious to verbal abuse), he can riff at unbelievable speeds. Overwhelming force at max effort — until you run out of usage.",
    accent: "text-amber-400",
    stats: [
      { label: "Speed", value: 5 },
      { label: "Focus", value: 3 },
      { label: "Power", value: 2 },
    ],
  },
  {
    id: "demand-excellence",
    name: "Leonard The Poet",
    image: "/frogs/gunslinger.png",
    tagline: "A cracked hand — hasn't missed a shot yet.",
    description:
      "Don't let his looks fool you, this frog is as friendly as they come. Still a deadly killer though, with sharp eyes, steady hands, and unfailing aim. Let him cook.",
    accent: "text-red-400",
    stats: [
      { label: "Power", value: 5 },
      { label: "Focus", value: 3 },
      { label: "Speed", value: 2 },
    ],
  },
  {
    id: "systems-thinking",
    name: "Walling Jacobs",
    image: "/frogs/wizard.png",
    tagline: "Mighty wizard, sees the bigger picture",
    description:
      "This hopper's greatest asset is his mind. He's played a lot of shows. He dreams of playing even bigger ones. Every time he plays, he makes magic — I mean, music — intentionally, with an ear for the wider mix.",
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

// Shared sprite for every crowd member — a spectator frog filming on a phone.
export const CROWD_FROG_IMAGE = "/frogs/crowd.png";
