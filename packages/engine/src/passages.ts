import type { Passage } from './passage';

const raw: Omit<Passage, 'lengthChars'>[] = [
  {
    id: 'house-values',
    title: 'House Values',
    source: 'TypoHero',
    content:
      'make customers win prioritize the customer and everything else follows ' +
      'shark dna we are default aggressive and run through walls to win ' +
      "everyone a builder top to bottom we're relentless doers and never above anything " +
      'why not now we plan well but when something is a priority it happens now ' +
      'demand excellence we hold ourselves and each other to a high standard ' +
      'celebrate ambition we set big goals and hero people shooting for the moon ' +
      'systems thinking we solve one problem at a time quickly but know how it fits in to the whole ' +
      'win the day we apply overwhelming force towards our goals daily ' +
      'learn from greatness we accelerate learning by talking to and observing the best ' +
      'care we care about our people our platform and our vision' +
      `We're no strangers to love
You know the rules and so do I
A full commitment's what I'm thinking of
You wouldn't get this from any other guy
I just wanna tell you how I'm feeling
Gotta make you understand
Never gonna give you up
Never gonna let you down
Never gonna run around and desert you
Never gonna make you cry
Never gonna say goodbye
Never gonna tell a lie and hurt you
We've known each other for so long
Your heart's been aching, but you're too shy to say it
Inside, we both know what's been going on
We know the game, and we're gonna play it
And if you ask me how I'm feeling
Don't tell me you're too blind to see
Never gonna give you up
Never gonna let you down
Never gonna run around and desert you
Never gonna make you cry
Never gonna say goodbye
Never gonna tell a lie and hurt you
Never gonna give you up
Never gonna let you down
Never gonna run around and desert you
Never gonna make you cry
Never gonna say goodbye
Never gonna tell a lie and hurt you
Ooh (Give you up)
Ooh-ooh (Give you up)
Ooh (Never gonna give, never gonna give)
Give you up
Ooh-ooh (Never gonna give, never gonna give)
Give you up
We've known each other for so long
Your heart's been aching, but you're too shy to say it
Inside, we both know what's been going on
We know the game, and we're gonna play it
I just wanna tell you how I'm feeling
Gotta make you understand
Never gonna give you up
Never gonna let you down
Never gonna run around and desert you
Never gonna make you cry
Never gonna say goodbye
Never gonna tell a lie and hurt you
Never gonna give you up
Never gonna let you down
Never gonna run around and desert you
Never gonna make you cry
Never gonna say goodbye
Never gonna tell a lie and hurt you
Never gonna give you up
Never gonna let you down
Never gonna run around and desert you
Never gonna make you cry
Never gonna say goodbye
Never gonna tell a lie and hurt you
Never gonna give you up
Never gonna let you down
Never gonna run around and desert you
Never gonna make you cry
Never gonna say goodbye
Never gonna tell a lie and hurt you`,
    tags: ['long', 'values'],
  },
  {
    id: 'quick-fox',
    title: 'The Quick Fox',
    source: 'Pangram',
    content: 'the quick brown fox jumps over the lazy dog',
    tags: ['warmup', 'short'],
  },
  {
    id: 'band-plays-on',
    title: 'The Band Plays On',
    source: 'TypoHero',
    content:
      'the quick brown fox jumps over the lazy dog and the band plays on',
    tags: ['warmup', 'medium'],
  },
  {
    id: 'neon-city',
    title: 'Neon City',
    source: 'TypoHero',
    content:
      'under a sky of neon rain the city hums a restless tune while every window glows a different shade of blue',
    tags: ['medium'],
  },
  {
    id: 'keyboard-anthem',
    title: 'Keyboard Anthem',
    source: 'TypoHero',
    content:
      'hammer the keys and hold the line let the rhythm carry you through the chorus never break the streak keep the tempo tight and let the whole room feel the beat you built',
    tags: ['long'],
  },
];

export const PASSAGES: Passage[] = raw.map((p) => ({
  ...p,
  lengthChars: p.content.length,
}));

export function passageById(id: string): Passage | undefined {
  return PASSAGES.find((p) => p.id === id);
}

export function firstPassage(): Passage {
  return PASSAGES[0]!;
}
