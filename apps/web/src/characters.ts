export type FrogStat = { label: string; value: number };

export type Frog = {
  id: string;
  name: string;
  image: string;
  tagline: string;
  description: string;
  accent: string;
  stats: FrogStat[];
  /** Premium frogs are dimmed behind a padlock until an unlock code is redeemed. */
  premium?: true;
};

export const FROGS: Frog[] = [
  {
    id: 'win-the-day',
    name: 'Claudius Coder',
    image: '/frogs/boxer.png',
    tagline: 'An unstoppable force — just keeps swinging.',
    description:
      'Not the brightest of the bunch, but a real bruiser. A jumper with thick skin (impervious to verbal abuse), he can riff at unbelievable speeds. Overwhelming force at max effort — until you run out of usage.',
    accent: 'text-amber-400',
    stats: [
      { label: 'Speed', value: 5 },
      { label: 'Focus', value: 1 },
      { label: 'Power', value: 4 },
    ],
  },
  {
    id: 'demand-excellence',
    name: 'Leonard The Poet',
    image: '/frogs/gunslinger.png',
    tagline: "A cracked hand — hasn't missed a shot yet.",
    description:
      "Don't let his looks fool you, this frog is as friendly as they come. Still a deadly killer though, with sharp eyes, steady hands, and unfailing aim. Let him cook.",
    accent: 'text-red-400',
    stats: [
      { label: 'Focus', value: 5 },
      { label: 'Speed', value: 3 },
      { label: 'Power', value: 3 },
    ],
  },
  {
    id: 'systems-thinking',
    name: 'Walling Jacobs',
    image: '/frogs/wizard.png',
    tagline: 'Mighty wizard, sees the bigger picture',
    description:
      "This hopper's greatest asset is his mind. He's played a lot of shows. He dreams of playing even bigger ones. Every time he plays, he makes magic — I mean, music — intentionally, with an ear for the wider mix.",
    accent: 'text-emerald-400',
    stats: [
      { label: 'Speed', value: 3 },
      { label: 'Focus', value: 4 },
      { label: 'Power', value: 5 },
    ],
  },
  // ── Premium ──────────────────────────────────────────────────────────────
  // Art drops into apps/web/public/frogs/premium/. Until the file exists the
  // card falls back to a silhouette, so these entries are safe to ship early.
  // Each id needs a matching entry in the Worker's UNLOCK_CODES secret.
  {
    id: 'encore',
    name: 'John',
    image: '/frogs/premium/john.jpeg',
    tagline: 'Dad Bod Guitarist',
    description:
      'Signed to no label, banned from three venues. He plays fast, he plays sloppy, and somehow the crowd never stops moving. Bring earplugs.',
    accent: 'text-fuchsia-400',
    premium: true,
    stats: [
      { label: 'Speed', value: 5 },
      { label: 'Focus', value: 2 },
      { label: 'Power', value: 5 },
    ],
  },
  {
    id: 'headliner',
    name: 'Erika',
    image: '/frogs/premium/erika.jpeg',
    tagline: 'Born to be a rockstar',
    description:
      'A frog who has never once played to an empty room. Golden pipes, bottomless lungs, and a stage presence that makes the par cans look dim.',
    accent: 'text-sky-400',
    premium: true,
    stats: [
      { label: 'Speed', value: 4 },
      { label: 'Focus', value: 5 },
      { label: 'Power', value: 4 },
    ],
  },
];

export function frogById(id: string | null | undefined): Frog | undefined {
  return FROGS.find((f) => f.id === id);
}

export function isPremium(id: string | null | undefined): boolean {
  return frogById(id)?.premium === true;
}

/** Frog ids that need no unlock code. */
export const FREE_FROG_IDS = FROGS.filter((f) => !f.premium).map((f) => f.id);

// Shared sprite for every crowd member — a spectator frog filming on a phone.
export const CROWD_FROG_IMAGE = '/frogs/crowd.png';
