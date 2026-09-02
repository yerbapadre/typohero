// Hand-drawn 8-bit sprites for premium characters, keyed by frog id. Each grid is
// 24 columns wide; every char maps to a color in PAL ('.' = transparent). Rows may
// be short — they're right-padded, so left-edge features stay aligned.
// Prototyped in apps/web/public/frogs-8bit-preview.html.

export const PAL: Record<string, string | null> = {
  ".": null,
  R: "#c8622d", r: "#9c4a1f", // john ginger hair / brows
  H: "#6b4a2b", h: "#8a6238", // erika brown hair
  S: "#f2c9a0", s: "#d8a980", // skin / shade
  W: "#ffffff", B: "#3a6ea5", // eye white / blue iris
  M: "#a24a44", K: "#141414", // mouth / black (tee, shoes, pupils)
  D: "#23252e", // erika dark top
  J: "#2f4a7a", // denim jeans
};

export const SPRITE_W = 24;

// JOHN — ginger curls, blue eyes, big smile, black tee, jeans, sneakers.
const JOHN = [
  ".........RRRRRR.........",
  ".......RRRRRRRRRR.......",
  "......RRRRRRRRRRRR......",
  "......RRSSSSSSSSRR......",
  "......RRSSSSSSSSRR......",
  "......RRSrrSSrrSRR......",
  "......RRSWBSSWBSRR......",
  "......RRSSSssSSSRR......",
  "......RRSSMMMMSSRR......",
  "......RRSSWWWWSSRR......",
  "......RRSSSSSSSSRR......",
  ".......RSSSSSSSSR.......",
  "........SSSSSSSS........",
  "..........SSSS.........",
  "......KKKKKKKKKKKK......",
  "......KKKKKKKKKKKK......",
  "......KKKKKKKKKKKK......",
  "......SSKKKKKKKKSS......",
  "......SSKKKKKKKKSS......",
  "......SSKKKKKKKKSS......",
  "........KKKKKKKK........",
  "........JJJJJJJJ........",
  "........JJJJJJJJ........",
  "........JJJJJJJJ........",
  "........JJJ..JJJ........",
  "........JJJ..JJJ........",
  "........JJJ..JJJ........",
  "........JJJ..JJJ........",
  ".......KKKK..KKKK.......",
  ".......KKKK..KKKK.......",
];

// ERIKA — long center-part brown hair, blue eyes, smile, dark top, jeans.
const ERIKA = [
  "........HHHHHHHH........",
  "......HHHHHHHHHHHH......",
  ".....HHHHHHHHHHHHHH.....",
  ".....HHHHHHhhHHHHHH.....",
  ".....HHHSSSSSSSSHHH.....",
  ".....HHHSSSSSSSSHHH.....",
  ".....HHHSrrSSrrSHHH.....",
  ".....HHHSWBSSWBSHHH.....",
  ".....HHHSSSssSSSHHH.....",
  ".....HHHSSMMMMSSHHH.....",
  ".....HHHSSWWWWSSHHH.....",
  ".....HHHSSSSSSSSHHH.....",
  ".....HHHHSSSSSSHHHH.....",
  ".....HHHH.SSSS.HHHH.....",
  ".....HHHHDDDDDDHHHH.....",
  ".....HHHDDDDDDDDHHH.....",
  ".....HHDDDDDDDDDDHH.....",
  ".....HHDDDDDDDDDDHH.....",
  ".....HHDDDDDDDDDDHH.....",
  "......DDDDDDDDDDDD......",
  "......SSDDDDDDDDSS......",
  "......SSDDDDDDDDSS......",
  "........DDDDDDDD........",
  "........JJJJJJJJ........",
  "........JJJJJJJJ........",
  "........JJJ..JJJ........",
  "........JJJ..JJJ........",
  "........JJJ..JJJ........",
  "........JJJ..JJJ........",
  ".......KKKK..KKKK.......",
  ".......KKKK..KKKK.......",
];

/** Sprite grids by frog id. A frog without an entry falls back to its image. */
export const SPRITES: Record<string, string[]> = {
  encore: JOHN,
  headliner: ERIKA,
};
