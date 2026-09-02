import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CrowdItem, WornShirt } from "@typohero/protocol";
import type { CrowdMember } from "../../net/useRoom";
import { CROWD_FROG_IMAGE } from "../../characters";
import { CrowdFrog } from "../../ui/CrowdFrog";
import { useCrowdWalk } from "../../game/useCrowdWalk";
import { MerchShop } from "../../merch/MerchShop";
import { SpriteShirt } from "../../merch/SpriteShirt";
import { useWorn } from "../../merch/shirts";

// The pit along the front of the stage. Spectators walk their own frog here
// while the band plays; NPCs keep it full even when nobody has joined yet.
const GROUND = 9;
const ZONE = { min: 3, max: 97 };
const NPC_COUNT = 18;

// Hangout spots that line the pit. Each is a pixel-cabinet prop a spectator can
// walk up to and press Enter on. Merch opens the shirt press; the rest are
// still stubs behind the same proximity/Enter plumbing.
export type SpotId = "merch" | "bar" | "recs";
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

// What a frog carries after a bar visit. A tumbler with an amber pour, or a
// pizza slice (clip-path triangle, tip down) with pepperoni. Off-palette reds
// on the pizza so it reads as food, same trick as the DietCoke prop.
const ITEM_LABEL: Record<CrowdItem, string> = { drink: "Drink", pizza: "Pizza" };

function HeldItem({ item }: { item: CrowdItem }) {
  if (item === "drink") {
    return (
      <span className="relative block h-6 w-4 border border-black bg-white/10">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-white/60" />
        <span className="absolute inset-x-0 bottom-0 h-4 bg-cabinet-accent" />
        <span className="absolute left-0.5 top-1 h-3 w-0.5 bg-white/40" />
      </span>
    );
  }
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

function SpotProp({ spot }: { spot: Spot }) {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2"
      style={{ left: `${spot.x}%`, bottom: `${GROUND}%` }}
    >
      {spot.render()}
    </div>
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

// The bar's Enter menu: grab a drink or a slice, or set it back down by
// tapping the one you already hold. The pick rides the crowd channel so every
// machine sees you carry it.
function BarPanel({
  equipped,
  onPick,
  onClose,
}: {
  equipped: CrowdItem | null;
  onPick: (item: CrowdItem | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/50">
      <div className="border-[3px] border-cabinet-accent bg-cabinet-bg px-8 py-6 text-center shadow-[8px_8px_0_#6b4e18]">
        <div className="text-sm uppercase tracking-widest text-cabinet-accent">Bar</div>
        <div className="mt-1 font-mono text-[11px] lowercase tracking-wide text-cabinet-text/60">
          grab something for the show
        </div>
        <div className="mt-5 flex gap-4">
          {(["drink", "pizza"] as const).map((it) => {
            const on = equipped === it;
            return (
              <button
                key={it}
                onClick={() => onPick(on ? null : it)}
                className={
                  "flex w-28 flex-col items-center gap-2 border-2 px-4 py-4 text-[11px] uppercase tracking-widest " +
                  (on
                    ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
                    : "border-cabinet-border bg-cabinet-btn text-cabinet-text hover:border-cabinet-accent")
                }
              >
                <HeldItem item={it} />
                <span>{on ? "Put down" : ITEM_LABEL[it]}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-5 border-2 border-cabinet-border bg-cabinet-btn px-4 py-2 text-[10px] uppercase tracking-widest text-cabinet-text hover:border-cabinet-accent"
        >
          Esc · close
        </button>
      </div>
    </div>
  );
}

function InteractPanel({ spot, onClose }: { spot: Spot; onClose: () => void }) {
  // Merch is built: it takes over the screen, since the pit strip is far too
  // short to paint in.
  if (spot.id === "merch") return <MerchShop onClose={onClose} />;

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/50">
      <div className="border-[3px] border-cabinet-accent bg-cabinet-bg px-8 py-6 text-center shadow-[8px_8px_0_#6b4e18]">
        <div className="text-sm uppercase tracking-widest text-cabinet-accent">{spot.label}</div>
        <div className="mt-2 font-mono text-[11px] lowercase tracking-wide text-cabinet-text/70">
          coming soon
        </div>
        <button
          onClick={onClose}
          className="mt-4 border-2 border-cabinet-border bg-cabinet-btn px-4 py-2 text-[10px] uppercase tracking-widest text-cabinet-text hover:border-cabinet-accent"
        >
          Esc · close
        </button>
      </div>
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
        {item && (
          <div className="absolute" style={{ bottom: 14, [visualDir > 0 ? "right" : "left"]: -2 }}>
            <HeldItem item={item} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CrowdFloor({
  crowd,
  wardrobe = {},
  youId,
  youName,
  controllable,
  onMove,
  onInteract,
  onEquip,
  energy,
}: {
  crowd: CrowdMember[];
  /** What each spectator has on, keyed by crowd id. */
  wardrobe?: Record<string, WornShirt>;
  youId: string | null;
  youName?: string;
  controllable: boolean;
  onMove?: (x: number, y: number, facing: -1 | 1) => void;
  // Fired when you press Enter in front of a spot. Merch/recs aren't built yet;
  // this is the hook for wiring them later.
  onInteract?: (id: SpotId) => void;
  // Fired when you grab (or put down) something at the bar; rides the crowd
  // channel so every machine sees you carry it.
  onEquip?: (item: CrowdItem | null) => void;
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

  const others = crowd.filter((c) => c.id !== youId);

  // The spot you're standing in front of (grounded and within reach), if any.
  const nearSpot =
    controllable && you.y < 3
      ? SPOTS.find((s) => Math.abs(s.x - you.x) < REACH) ?? null
      : null;

  const [equipped, setEquipped] = useState<CrowdItem | null>(null);

  const equip = (item: CrowdItem | null) => {
    setEquipped(item);
    onEquip?.(item);
  };

  // Enter opens the spot you're near; Escape closes an open one. Enter isn't in
  // the walker's keymap, so listening here doesn't fight the movement handler.
  const nearRef = useRef(nearSpot);
  nearRef.current = nearSpot;
  const interactRef = useRef(onInteract);
  interactRef.current = onInteract;
  const openRef = useRef(active);
  openRef.current = active;
  useEffect(() => {
    if (!controllable) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && nearRef.current && !openRef.current) {
        e.preventDefault();
        setActive(nearRef.current);
        interactRef.current?.(nearRef.current.id);
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
        <SpotProp key={s.id} spot={s} />
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
          you
          flip
          smooth={false}
          item={equipped ?? undefined}
        />
      )}

      {nearSpot && !active && <InteractPrompt x={nearSpot.x} />}

      {active?.id === "bar" ? (
        <BarPanel equipped={equipped} onPick={equip} onClose={() => setActive(null)} />
      ) : (
        active && <InteractPanel spot={active} onClose={() => setActive(null)} />
      )}

      <div className="pointer-events-none absolute bottom-1 right-2 text-[9px] uppercase tracking-widest text-cabinet-text/35">
        👥 {crowd.length}
        {controllable && " · ← → run · space cheer · enter interact"}
      </div>
    </div>
  );
}
