import type { Passage } from "./passage";

const raw: Omit<Passage, "lengthChars">[] = [
  {
    id: "quick-fox",
    title: "The Quick Fox",
    source: "Pangram",
    content: "the quick brown fox jumps over the lazy dog",
    tags: ["warmup", "short"],
  },
  {
    id: "band-plays-on",
    title: "The Band Plays On",
    source: "TypoHero",
    content: "the quick brown fox jumps over the lazy dog and the band plays on",
    tags: ["warmup", "medium"],
  },
  {
    id: "neon-city",
    title: "Neon City",
    source: "TypoHero",
    content:
      "under a sky of neon rain the city hums a restless tune while every window glows a different shade of blue",
    tags: ["medium"],
  },
  {
    id: "keyboard-anthem",
    title: "Keyboard Anthem",
    source: "TypoHero",
    content:
      "hammer the keys and hold the line let the rhythm carry you through the chorus never break the streak keep the tempo tight and let the whole room feel the beat you built",
    tags: ["long"],
  },
];

export const PASSAGES: Passage[] = raw.map((p) => ({ ...p, lengthChars: p.content.length }));

export function passageById(id: string): Passage | undefined {
  return PASSAGES.find((p) => p.id === id);
}

export function firstPassage(): Passage {
  return PASSAGES[0]!;
}
