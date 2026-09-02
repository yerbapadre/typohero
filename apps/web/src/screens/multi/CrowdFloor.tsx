import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CrowdItem, EmoteKind, WornShirt } from "@typohero/protocol";
import type { Booth, Product } from "@typohero/engine";
import type { CrowdMember, Emote } from "../../net/useRoom";
import { CROWD_FROG_IMAGE } from "../../characters";
import { CrowdFrog } from "../../ui/CrowdFrog";
import { useCrowdWalk } from "../../game/useCrowdWalk";
import { MerchShop } from "../../merch/MerchShop";
import { SpriteShirt } from "../../merch/SpriteShirt";
import { useWorn } from "../../merch/shirts";
import { useStore } from "../../net/useStore";
import { Gamepad } from "./Gamepad";
import { LeCoin, StoreMenu } from "./StoreMenu";

// The pit along the front of the stage. Spectators walk their own frog here
// while the band plays; NPCs keep it full even when nobody has joined yet.
const GROUND = 9;
const ZONE = { min: 3, max: 97 };
const NPC_COUNT = 18;

// Hangout spots that line the pit. Each is a pixel-cabinet prop a spectator can
// walk up to and press Enter on, or click from anywhere. Merch opens the
// shirt press; a spot id doubles as the booth a product belongs to, so a
// store menu is just the catalog filtered by it.
export type SpotId = Booth;
type Spot = { id: SpotId; label: string; x: number; render: () => ReactNode };

// How close (in pit-percent) your frog has to stand to trigger a spot.
const REACH = 8;

const SPOTS: Spot[] = [
  { id: "merch", label: "Merch", x: 16, render: () => <MerchBooth /> },
  { id: "bar", label: "Bar", x: 42, render: () => <BarCounter /> },
  { id: "recs", label: "Recs", x: 86, render: () => <RecsTable /> },
];

// Two rows: the back row sits higher and smaller so the pit reads as a crowd
// with depth rather than a single line of frogs.
const NPCS = Array.from({ length: NPC_COUNT }, (_, i) => {
  const back = i % 2 === 0;
  return {
    x: 3 + ((i * 137) % 95),
    scale: back ? 0.5 + ((i * 41) % 12) / 100 : 0.72 + ((i * 29) % 16) / 100,
    lift: back ? 7 : 0,
    delay: ((i * 313) % 200) / 100,
    flip: i % 3 === 0,
  };
});

function bobDuration(energy: number, offset = 0): string {
  return `${(1.55 - Math.max(0, Math.min(1, energy)) * 0.85 + offset).toFixed(2)}s`;
}


function HeldItem({ item, product }: { item: CrowdItem; product?: Product | null }) {
  // A bought item carries its own art; "drink" and "pizza" are drawn by hand.
  if (product) {
    return product.icon.startsWith("/") ? (
      <img
        src={product.icon}
        alt=""
        title={product.name}
        draggable={false}
        className="h-9 w-auto object-contain"
      />
    ) : (
      <span title={product.name} className="text-lg leading-none">
        {product.icon}
      </span>
    );
  }
  if (item === "drink") {
    return (
      <span className="relative block h-6 w-4 border border-black bg-white/10">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-white/60" />
        <span className="absolute inset-x-0 bottom-0 h-4 bg-cabinet-accent" />
        <span className="absolute left-0.5 top-1 h-3 w-0.5 bg-white/40" />
      </span>
    );
  }
  if (item !== "pizza") return null;
  return (
    <span className="relative block h-6 w-6" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}>
      <span className="absolute inset-0 bg-cabinet-accent" />
      <span className="absolute inset-x-0 top-0 h-1.5 bg-[#a5551f]" />
      <span className="absolute left-1.5 top-2 h-1.5 w-1.5 bg-red-700" />
      <span className="absolute right-1.5 top-2 h-1.5 w-1.5 bg-red-700" />
      <span className="absolute left-1/2 top-3.5 h-1 w-1 -translate-x-1/2 bg-red-700" />
    </span>
  );
}

// --- Emotes -------------------------------------------------------------
// A spectator presses 1/2/3 and their own frog flourishes: a confetti burst, a
// cartwheel, or a pink glow. cartwheel/glow are CSS classes on the sprite
// wrapper; confetti is its own particle overlay.
const EMOTE_KEY: Record<string, EmoteKind> = { "1": "confetti", "2": "cartwheel", "3": "glow" };

const EMOTE_CLASS: Record<EmoteKind, string> = {
  confetti: "",
  cartwheel: "frog-cartwheel",
  glow: "frog-glow",
};

const CONFETTI_COLORS = ["#f5b53f", "#ff5fbf", "#5fd0ff", "#7ee06a", "#e0475f", "#ecdcb4"];

// Deterministic pieces from the emote id, so a re-render mid-burst doesn't
// reshuffle the confetti — same trick the reaction arc uses.
function confettiPieces(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const next = () => (h = (h * 1103515245 + 12345) >>> 0);
  return Array.from({ length: 14 }, (_, i) => ({
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
    cx: (next() % 110) - 55, // -55..54px sideways
    cy: -38 - (next() % 48), // -38..-85px up
    cr: (next() % 720) - 360,
    delay: (i * 23) % 120,
  }));
}

function Confetti({ id }: { id: string }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2">
      {confettiPieces(id).map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute block h-1.5 w-1.5 border border-black/40"
          style={{
            background: p.color,
            ["--cx" as string]: `${p.cx}px`,
            ["--cy" as string]: `${p.cy}px`,
            ["--cr" as string]: `${p.cr}deg`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

// --- Hangout props ------------------------------------------------------
// Small hard-edged pixel builds that sit on the pit floor. Frogs walk in
// front of them. Kept compact so they read at the pit's short height.

// A string of bulbs that fade in and out on staggered timers — the marquee
// "twinkle". Square bulbs to keep the pixel look (no rounded corners).
function TwinkleLights({ count = 9 }: { count?: number }) {
  return (
    <div className="flex justify-center gap-1">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={
            "h-1.5 w-1.5 border border-black animate-pulse " +
            (i % 2 === 0 ? "bg-cabinet-accent" : "bg-cabinet-text/30")
          }
          style={{ animationDelay: `${(i * 170) % 900}ms`, animationDuration: "1.5s" }}
        />
      ))}
    </div>
  );
}

// The marquee banner over each booth: amber-framed sign on a short pole, lit
// top and bottom, styled after the lobby Venue (not the old amber pill label).
function Marquee({ title, w }: { title: string; w: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={
          "border-[3px] border-cabinet-accent bg-cabinet-btn px-3 py-1 text-center shadow-[3px_3px_0_#6b4e18] " +
          w
        }
      >
        <TwinkleLights />
        <div className="my-1 text-sm font-bold uppercase tracking-[0.25em] text-cabinet-accent md:text-base">
          {title}
        </div>
        <TwinkleLights />
      </div>
      <div className="h-2 w-1.5 bg-cabinet-frame" />
    </div>
  );
}

// Open-bottomed booth shell that sits on the pit floor.
function Booth({ w, children }: { w: string; children: ReactNode }) {
  return (
    <div
      className={
        "flex flex-col items-center gap-1 border-x-[3px] border-t-[3px] border-cabinet-frame bg-black/40 px-2 pt-1.5 " +
        w
      }
    >
      {children}
    </div>
  );
}

// A CD in its case: outer sleeve, disc, center hole.
function CD() {
  return (
    <span className="relative block h-5 w-5 border border-black bg-cabinet-text/20">
      <span className="absolute inset-1 border border-black bg-cabinet-accent/40" />
      <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 bg-black" />
    </span>
  );
}

// A hanging t-shirt: torso with two sleeve nubs and a collar notch.
function Shirt({ tone }: { tone: string }) {
  return (
    <div className="relative mt-1 h-6 w-5">
      <span className={"absolute -left-1 top-0 h-2 w-2 border border-black " + tone} />
      <span className={"absolute -right-1 top-0 h-2 w-2 border border-black " + tone} />
      <span className={"absolute inset-x-0 top-0 h-full border border-black " + tone} />
      <span className="absolute left-1/2 top-0 h-1 w-1.5 -translate-x-1/2 border border-black bg-black/40" />
    </div>
  );
}

function MerchBooth() {
  return (
    <div className="flex flex-col items-center">
      <Marquee title="Merch" w="w-44" />
      <Booth w="w-44">
        {/* CDs on the wall */}
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <CD key={i} />
          ))}
        </div>
        {/* t-shirts on a rod */}
        <div className="w-full">
          <div className="h-0.5 w-full bg-cabinet-frame" />
          <div className="flex justify-around">
            <Shirt tone="bg-cabinet-accent/50" />
            <Shirt tone="bg-cabinet-text/40" />
            <Shirt tone="bg-cabinet-accent/30" />
          </div>
        </div>
        {/* counter with a stuffed frog on it */}
        <div className="mt-0.5 flex w-full items-end justify-center border-t-2 border-cabinet-frame pt-1">
          <img
            src={CROWD_FROG_IMAGE}
            alt=""
            draggable={false}
            className="h-9 w-auto object-contain"
          />
        </div>
      </Booth>
    </div>
  );
}

// Chunky voxel-style props for the bar. Each gets a lighter top strip so it
// reads as a lit block face — the Minecraft look.

function BlockBottle({ tone, h }: { tone: string; h: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={"h-1.5 w-1 border border-black " + tone} />
      <div className={"relative w-2.5 border border-black " + tone + " " + h}>
        <span className="absolute inset-x-0 top-0 h-1 bg-white/15" />
      </div>
    </div>
  );
}

function BeerMug() {
  return (
    <div className="flex flex-col items-center">
      <span className="h-1.5 w-6 border border-black bg-cabinet-text/80" />
      <div className="relative h-6 w-6 border border-black bg-cabinet-accent/80">
        <span className="absolute inset-x-0 top-0 h-1 bg-white/25" />
        <span className="absolute -right-1.5 top-1.5 h-3 w-1.5 border border-black bg-cabinet-accent/80" />
      </div>
    </div>
  );
}

function Highball() {
  return (
    <div className="relative flex flex-col items-center">
      <span className="absolute -top-2 left-1/2 h-3 w-0.5 -translate-x-1/2 bg-cabinet-text/70" />
      <div className="relative h-7 w-4 border border-black bg-white/10">
        <span className="absolute inset-x-0 bottom-0 h-4 bg-cabinet-accent/60" />
        <span className="absolute left-0 top-0 h-full w-0.5 bg-white/30" />
      </div>
    </div>
  );
}

// Diet Coke: silver can, red label band, dark pull-tab. Off-palette on purpose
// so the product actually reads.
function DietCoke() {
  return (
    <div className="flex flex-col items-center">
      <span className="h-0.5 w-2 border border-black bg-neutral-500" />
      <div className="relative h-7 w-3.5 border border-black bg-neutral-300">
        <span className="absolute inset-x-0 top-2.5 h-2 bg-red-600" />
        <span className="absolute left-0 top-0 h-full w-0.5 bg-white/50" />
      </div>
    </div>
  );
}

function BarCounter() {
  return (
    <div className="flex flex-col items-center">
      <Marquee title="Bar" w="w-52" />
      <Booth w="w-52">
        {/* back shelf of blocky bottles */}
        <div className="flex items-end gap-1">
          <BlockBottle tone="bg-cabinet-accent/70" h="h-7" />
          <BlockBottle tone="bg-[#3f7d3a]" h="h-9" />
          <BlockBottle tone="bg-cabinet-text/40" h="h-6" />
          <BlockBottle tone="bg-red-700/70" h="h-8" />
          <BlockBottle tone="bg-cabinet-accent/50" h="h-9" />
          <BlockBottle tone="bg-[#3f7d3a]" h="h-6" />
        </div>
        {/* drinks on the bar — beer, a soda, and a Diet Coke */}
        <div className="mt-1 flex w-full items-end justify-center gap-2.5">
          <BeerMug />
          <Highball />
          <DietCoke />
        </div>
        {/* bar top with tap handles */}
        <div className="w-full border-t-2 border-cabinet-frame pt-1">
          <div className="relative mx-auto h-6 w-44 border-2 border-cabinet-frame bg-cabinet-btn">
            <span className="absolute -top-3 left-3 h-3 w-1.5 border border-black bg-cabinet-accent" />
            <span className="absolute -top-3 left-6 h-3 w-1.5 border border-black bg-cabinet-text/50" />
          </div>
        </div>
      </Booth>
    </div>
  );
}

function RecsTable() {
  return (
    <div className="flex flex-col items-center">
      <Marquee title="Recs" w="w-36" />
      <Booth w="w-36">
        {/* pinned recommendation cards on a board */}
        <div className="flex w-full justify-around">
          {["bg-cabinet-text/60", "bg-cabinet-accent/40", "bg-cabinet-text/50"].map((tone, i) => (
            <div key={i} className={"relative h-8 w-6 border border-black " + tone}>
              <span className="absolute left-1/2 top-1 h-1 w-1 -translate-x-1/2 bg-black" />
              <span className="absolute inset-x-1 top-3 h-0.5 bg-black/40" />
              <span className="absolute inset-x-1 top-5 h-0.5 bg-black/40" />
            </div>
          ))}
        </div>
        {/* table with a card standing on it */}
        <div className="mt-0.5 w-full border-t-2 border-cabinet-frame pt-1">
          <span className="mx-auto mb-0.5 block h-4 w-4 border border-black bg-cabinet-text/70" />
          <div className="mx-auto h-1.5 w-20 border border-black bg-cabinet-frame" />
        </div>
      </Booth>
    </div>
  );
}

// Clicking a booth opens it from anywhere in the pit. Walking into range first
// is the keyboard path; making the mouse obey the same reach just reads broken.
// Merch is two businesses under one sign: the LeCoin shop and the shirt press.
// The tab strip is handed to whichever panel is open, so neither has to know
// about the other beyond rendering the strip in its own header.
type MerchTab = "shop" | "shirt";

function BoothTabs({ value, onChange }: { value: MerchTab; onChange: (t: MerchTab) => void }) {
  const tabs: { id: MerchTab; label: string }[] = [
    { id: "shop", label: "Shop" },
    { id: "shirt", label: "Paint a Shirt" },
  ];
  return (
    <div className="flex gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={
            "border-2 px-4 py-2 text-[10px] uppercase tracking-widest transition-colors " +
            (t.id === value
              ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
              : "border-cabinet-border bg-cabinet-btn text-cabinet-text/70 hover:border-cabinet-accent")
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Booths are proximity+Enter targets for keyboard players, but also directly
// tappable — the only way in on touch, where there's no arrow-key walk to close
// the distance. Scaled down on phones so the props fit a narrow pit.
function SpotProp({ spot, onOpen }: { spot: Spot; onOpen?: () => void }) {
  const inner = <div className="pointer-events-none">{spot.render()}</div>;
  const posClass = "absolute z-10 origin-bottom -translate-x-1/2 scale-[0.55] md:scale-100";
  if (!onOpen) {
    return (
      <div
        className={"pointer-events-none " + posClass}
        style={{ left: `${spot.x}%`, bottom: `${GROUND}%` }}
      >
        {inner}
      </div>
    );
  }
  return (
    <button
      onClick={onOpen}
      aria-label={`open ${spot.label}`}
      className={"cursor-pointer hover:outline hover:outline-2 hover:outline-cabinet-accent " + posClass}
      style={{ left: `${spot.x}%`, bottom: `${GROUND}%` }}
    >
      {inner}
    </button>
  );
}

function InteractPrompt({ x }: { x: number }) {
  return (
    <div
      className="pointer-events-none absolute z-20 flex -translate-x-1/2 flex-col items-center"
      style={{ left: `${x}%`, bottom: `calc(${GROUND}% + 158px)` }}
    >
      <div className="frog-bob border-2 border-black bg-cabinet-accent px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-cabinet-ink shadow-[2px_2px_0_#6b4e18]">
        Enter
      </div>
      <span className="text-[10px] leading-none text-cabinet-accent">▾</span>
    </div>
  );
}

function Footlights() {
  return (
    <div className="absolute -top-1 left-0 right-0 flex justify-between px-2">
      {Array.from({ length: 44 }, (_, i) => (
        <span
          key={i}
          className={
            "h-2 w-2 border border-black " + (i % 2 === 0 ? "bg-cabinet-accent" : "bg-cabinet-shadow")
          }
        />
      ))}
    </div>
  );
}

function PitFrog({
  name,
  x,
  y,
  facing,
  energy,
  you,
  scale = 1,
  flip,
  bobOffset = 0,
  smooth = true,
  lift = 0,
  shirt,
  item,
  emote,
  product,
}: {
  name?: string;
  x: number;
  y: number;
  facing: number;
  energy: number;
  you?: boolean;
  scale?: number;
  flip?: boolean;
  bobOffset?: number;
  smooth?: boolean;
  lift?: number;
  shirt?: WornShirt | null;
  item?: CrowdItem;
  emote?: Emote;
  /** Catalog entry for `item`, when it is a product id rather than a built-in. */
  product?: Product | null;
}) {
  const airborne = y > 0.4;
  const visualDir = flip ? -facing : facing;
  return (
    <div
      className="absolute flex -translate-x-1/2 flex-col items-center"
      style={{
        left: `${x}%`,
        bottom: `calc(${GROUND}% + ${y + lift}%)`,
        transition: smooth ? "left .08s linear, bottom .08s linear" : "none",
      }}
    >
      {airborne && (
        <span className="mb-0.5 border border-black bg-cabinet-accent px-1 text-[7px] uppercase tracking-widest text-cabinet-ink">
          woo
        </span>
      )}
            {name && (
        <span
          className={
            "mb-1 max-w-[80px] truncate border px-1 py-0.5 text-[8px] uppercase tracking-widest " +
            (you
              ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
              : "border-cabinet-border bg-cabinet-btn text-cabinet-text/70")
          }
        >
          {name}
        </span>
      )}
      <div
        className="frog-bob relative"
        style={{ animationDuration: bobDuration(energy, bobOffset) }}
      >
        {/* Emote wrapper: cartwheel spins it, glow lights it. Keyed on the emote
            id so a fresh press replays the animation from the top. */}
        <div
          key={emote?.id ?? "idle"}
          className={"relative inline-block " + (emote ? EMOTE_CLASS[emote.kind] : "")}
        >
          <CrowdFrog
            name={name}
            className="block w-auto"
            style={{
              height: `${Math.round(74 * scale)}px`,
              transform: `scaleX(${visualDir})`,
              opacity: name ? 1 : 0.5,
            }}
          />
          <SpriteShirt shirt={shirt} />
        </div>
        {item && (
          <div className="absolute" style={{ bottom: 14, [visualDir > 0 ? "right" : "left"]: -2 }}>
            <HeldItem item={item} product={product} />
          </div>
        )}
        {emote?.kind === "confetti" && <Confetti key={emote.id} id={emote.id} />}
      </div>
    </div>
  );
}

export function CrowdFloor({
  crowd,
  wardrobe = {},
  youId,
  youName,
  username,
  controllable,
  onMove,
  onInteract,
  onEquip,
  onEmote,
  emotes = [],
  energy,
}: {
  crowd: CrowdMember[];
  /** What each spectator has on, keyed by crowd id. */
  wardrobe?: Record<string, WornShirt>;
  youId: string | null;
  youName?: string;
  /** Wallet key. Without one the booths still open, but nothing can be bought. */
  username?: string | null;
  controllable: boolean;
  onMove?: (x: number, y: number, facing: -1 | 1) => void;
  // Fired when you press Enter in front of a spot. Merch/recs aren't built yet;
  // this is the hook for wiring them later.
  onInteract?: (id: SpotId) => void;
  // Fired when you grab (or put down) something at the bar; rides the crowd
  // channel so every machine sees you carry it.
  onEquip?: (item: CrowdItem | null) => void;
  // Fired when you press 1/2/3 to play a flourish on your own frog.
  onEmote?: (kind: EmoteKind) => void;
  // Flourishes in flight, keyed to the frogs that threw them.
  emotes?: Emote[];
  energy: number;
}) {
  const [active, setActive] = useState<Spot | null>(null);

  // Your own shirt comes from local state, not the wardrobe relay, so changing
  // it in the booth shows up on your frog with no round trip.
  const { shirt: yourShirt } = useWorn();

  // An open spot owns the keyboard — otherwise arrows and space would walk your
  // frog around behind the panel while you're painting or typing a name.
  const you = useCrowdWalk({
    enabled: controllable && !active,
    startX: 30,
    zone: ZONE,
    onMove: onMove ?? (() => {}),
  });

  const store = useStore(controllable ? username ?? null : null);
  const others = crowd.filter((c) => c.id !== youId);

  // The most recent flourish still animating on a given frog, if any. Latest
  // wins, so mashing 1/2/3 just replaces whatever was playing.
  const emoteFor = (id?: string | null) =>
    id ? [...emotes].reverse().find((e) => e.crowdId === id) : undefined;
  // Crowd members broadcast a product id; every client has the catalog, so the
  // art is a lookup rather than anything extra on the wire.
  const byId = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of store.products ?? []) m.set(p.id, p);
    return m;
  }, [store.products]);
  const held = (id: string | null | undefined) => (id ? byId.get(id) ?? null : null);


  // The spot you're standing in front of (grounded and within reach), if any.
  const nearSpot =
    controllable && you.y < 3
      ? SPOTS.find((s) => Math.abs(s.x - you.x) < REACH) ?? null
      : null;

  const [merchTab, setMerchTab] = useState<MerchTab>("shop");
  const [equipped, setEquipped] = useState<CrowdItem | null>(null);

  const equip = (item: CrowdItem | null) => {
    setEquipped(item);
    onEquip?.(item);
  };

  function openSpot(spot: Spot) {
    setMerchTab("shop");
    setActive(spot);
    onInteract?.(spot.id);
  }

  // A purchase is just an equip whose item is a product id, so what you
  // bought rides the same crowd channel as a drink grabbed at the bar.
  async function buy(productId: string) {
    if (!(await store.buy(productId))) return;
    equip(productId);
  }


  // Enter opens the spot you're near; Escape closes an open one. Enter isn't in
  // the walker's keymap, so listening here doesn't fight the movement handler.
  const nearRef = useRef(nearSpot);
  nearRef.current = nearSpot;
  const interactRef = useRef(onInteract);
  interactRef.current = onInteract;
  const activeRef = useRef(active);
  activeRef.current = active;
  const openRef = useRef(openSpot);
  openRef.current = openSpot;
  const emoteRef = useRef(onEmote);
  emoteRef.current = onEmote;
  useEffect(() => {
    if (!controllable) return;
    function onKey(e: KeyboardEvent) {
      const emoteKind = EMOTE_KEY[e.key];
      if (emoteKind && !activeRef.current) {
        e.preventDefault();
        emoteRef.current?.(emoteKind);
      } else if (e.key === "Enter" && nearRef.current && !activeRef.current) {
        e.preventDefault();
        openRef.current(nearRef.current);
      } else if (e.key === "Escape") {
        setActive(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controllable]);

  return (
    <div className="relative h-full overflow-hidden border-t-[3px] border-cabinet-accent bg-black/40">
      <Footlights />

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 border-t-2 border-cabinet-frame bg-cabinet-frame/30"
        style={{ height: `${GROUND}%` }}
      />

      {SPOTS.map((s) => (
        <SpotProp key={s.id} spot={s} onOpen={controllable ? () => openSpot(s) : undefined} />
      ))}

      {NPCS.map((npc, i) => (
        <PitFrog
          key={`npc-${i}`}
          x={npc.x}
          y={0}
          facing={1}
          scale={npc.scale}
          flip={npc.flip}
          energy={energy}
          bobOffset={npc.delay}
          lift={npc.lift}
          smooth={false}
        />
      ))}

      {others.map((c) => (
        <PitFrog
          key={c.id}
          name={c.name}
          x={c.x}
          y={c.y}
          facing={c.facing}
          energy={energy}
          shirt={wardrobe[c.id]}
          flip
          item={c.item}
          emote={emoteFor(c.id)}
          product={held(c.item)}
        />
      ))}

      {controllable && (
        <PitFrog
          name={youName}
          x={you.x}
          y={you.y}
          facing={you.facing}
          energy={energy}
          shirt={yourShirt}
          item={equipped ?? undefined}
          product={held(equipped)}
          emote={emoteFor(youId)}
          you
          flip
          smooth={false}
        />
      )}

      {nearSpot && !active && <InteractPrompt x={nearSpot.x} />}

      {controllable && !active && <Gamepad press={you.press} release={you.release} />}

      {active?.id === "merch" && merchTab === "shirt" ? (
        <MerchShop
          onClose={() => setActive(null)}
          tabs={<BoothTabs value={merchTab} onChange={setMerchTab} />}
        />
      ) : (
        active && (
          <StoreMenu
            label={active.label}
            products={store.products?.filter((p) => p.booth === active.id) ?? null}
            store={store}
            onBuy={buy}
            onClose={() => setActive(null)}
            tabs={
              active.id === "merch" ? (
                <BoothTabs value={merchTab} onChange={setMerchTab} />
              ) : undefined
            }
          />
        )
      )}

      <div className="pointer-events-none absolute bottom-1 right-2 flex items-center gap-2 text-[9px] uppercase tracking-widest text-cabinet-text/35">
        {store.wallet && <LeCoin amount={store.wallet.balance} className="text-cabinet-accent" />}
        <span>
          👥 {crowd.length}
          {controllable && (
            <span className="hidden md:inline">
              {" "}
              · ← → run · space cheer · enter interact · 1/2/3 emote
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
