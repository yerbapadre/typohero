import { useEffect, useRef, useState } from "react";
import { FROGS } from "../characters";
import { playableFrogs } from "../game/unlocks";
import { DrawCanvas, type DrawHandle, type Tool } from "./DrawCanvas";
import { FrogWearing } from "./FrogWearing";
import { ShirtGraphic } from "./ShirtGraphic";
import {
  BRUSH_SIZES,
  GARMENTS,
  PAINTS,
  STAMPS,
  deleteDesign,
  listDesigns,
  newDesignId,
  saveDesign,
  useDesigns,
  useWorn,
  wear,
  type ShirtDesign,
} from "./shirts";

const TOOLS: { id: Tool; label: string }[] = [
  { id: "brush", label: "Brush" },
  { id: "fill", label: "Fill" },
  { id: "stamp", label: "Stamp" },
  { id: "eraser", label: "Eraser" },
];

const BTN = "border-2 px-3 py-2 text-[10px] uppercase tracking-widest transition-colors";
const BTN_OFF = "border-cabinet-border bg-cabinet-btn text-cabinet-text hover:border-cabinet-accent";
const BTN_ON = "border-cabinet-accent bg-cabinet-accent text-cabinet-ink";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[9px] uppercase tracking-widest text-cabinet-text/40">{label}</div>
      {children}
    </div>
  );
}

export function MerchShop({ onClose }: { onClose: () => void }) {
  const press = useRef<DrawHandle | null>(null);
  const designs = useDesigns();
  const { designId: wornId } = useWorn();

  const models = playableFrogs().length ? playableFrogs() : FROGS;
  const [modelIndex, setModelIndex] = useState(0);
  const model = models[modelIndex % models.length]!;

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState(PAINTS[5]!);
  const [size, setSize] = useState(BRUSH_SIZES[1]!);
  const [stamp, setStamp] = useState(STAMPS[0]!);
  const [garment, setGarment] = useState(GARMENTS[0]!.hex);

  const [art, setArt] = useState<string | null>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [name, setName] = useState("");
  /** Set when the rack loaded a design, so saving replaces it instead of piling up. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Ctrl/Cmd+Z steps the press back. Escape is the pit's own close handler.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) press.current?.redo();
        else press.current?.undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function load(design: ShirtDesign) {
    setEditingId(design.id);
    setName(design.name);
    setGarment(design.garment);
    press.current?.loadArt(design.art);
    setStatus(null);
  }

  function startFresh() {
    setEditingId(null);
    setName("");
    press.current?.loadArt(null);
    setStatus(null);
  }

  /** Returns the saved design id, or null if it couldn't be saved. */
  function save(): string | null {
    const current = press.current?.toArt() ?? null;
    if (!current) {
      setStatus("paint something first");
      return null;
    }
    const design: ShirtDesign = {
      id: editingId ?? newDesignId(),
      name: name.trim() || `Tee #${designs.length + 1}`,
      garment,
      art: current,
      createdAt: Date.now(),
    };
    if (!saveDesign(design)) {
      setStatus("rack is full — pull one off first");
      return design.id;
    }
    setEditingId(design.id);
    setName(design.name);
    setStatus(editingId ? "updated on the rack" : "hung on the rack");
    return design.id;
  }

  /**
   * Putting a shirt on saves it first — you can't wear something that isn't on
   * the rack, and it saves explaining why an unsaved print vanished.
   */
  async function putOn() {
    const id = save();
    const design = id ? (listDesigns().find((d) => d.id === id) ?? null) : null;
    if (!design) return;
    await wear(design);
    setStatus(`wearing ${design.name}`);
  }

  async function takeOff() {
    await wear(null);
    setStatus("back to a bare frog");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-3 font-pixel">
      <div className="max-h-full w-full max-w-5xl overflow-y-auto border-[3px] border-cabinet-accent bg-cabinet-bg p-5 shadow-[8px_8px_0_var(--cab-shadow)]">
        <header className="flex items-center justify-between gap-4 border-b-2 border-cabinet-frame pb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-cabinet-text/40">
              merch booth
            </div>
            <h2 className="mt-1 text-lg font-bold tracking-wide text-white md:text-xl">
              PRINT YOUR OWN <span className="text-cabinet-accent">SHIRT</span>
            </h2>
          </div>
          <button onClick={onClose} className={BTN + " " + BTN_OFF}>
            Esc · close
          </button>
        </header>

        <div className="mt-4 grid gap-5 md:grid-cols-[300px_1fr]">
          {/* ── the press ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <Section label="Tool">
              <div className="grid grid-cols-4 gap-1.5">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    className={BTN + " px-1 " + (tool === t.id ? BTN_ON : BTN_OFF)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Section>

            {tool === "stamp" ? (
              <Section label="Stamp">
                <div className="flex flex-wrap gap-1.5">
                  {STAMPS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStamp(s)}
                      aria-label={`stamp ${s}`}
                      className={
                        "h-9 w-9 border-2 text-base leading-none transition-colors " +
                        (stamp === s
                          ? "border-cabinet-accent bg-cabinet-accent/20"
                          : "border-cabinet-border bg-cabinet-btn hover:border-cabinet-accent")
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Section>
            ) : (
              <Section label="Size">
                <div className="flex items-center gap-1.5">
                  {BRUSH_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      aria-label={`brush ${s}`}
                      className={
                        "flex h-9 w-9 items-center justify-center border-2 transition-colors " +
                        (size === s
                          ? "border-cabinet-accent bg-cabinet-accent/20"
                          : "border-cabinet-border bg-cabinet-btn hover:border-cabinet-accent")
                      }
                    >
                      <span
                        className="block bg-cabinet-text"
                        style={{ width: Math.max(3, s / 4), height: Math.max(3, s / 4) }}
                      />
                    </button>
                  ))}
                </div>
              </Section>
            )}

            <Section label="Paint">
              <div className="grid grid-cols-9 gap-1">
                {PAINTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setColor(p);
                      if (tool === "eraser" || tool === "stamp") setTool("brush");
                    }}
                    aria-label={`paint ${p}`}
                    title={p}
                    style={{ background: p }}
                    className={
                      "h-7 w-full border-2 transition-colors " +
                      (color === p ? "border-cabinet-accent" : "border-black/60 hover:border-cabinet-text/50")
                    }
                  />
                ))}
              </div>
            </Section>

            <Section label="Print area">
              <DrawCanvas
                ref={press}
                tool={tool}
                color={color}
                size={size}
                stamp={stamp}
                garment={garment}
                onChange={setArt}
                onHistory={setHistory}
                className="w-full border-2 border-cabinet-frame"
              />
            </Section>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => press.current?.undo()}
                disabled={!history.canUndo}
                className={BTN + " " + BTN_OFF + " disabled:cursor-not-allowed disabled:opacity-30"}
              >
                ↶ Undo
              </button>
              <button
                onClick={() => press.current?.redo()}
                disabled={!history.canRedo}
                className={BTN + " " + BTN_OFF + " disabled:cursor-not-allowed disabled:opacity-30"}
              >
                ↷ Redo
              </button>
              <button onClick={() => press.current?.clear()} className={BTN + " " + BTN_OFF}>
                Clear
              </button>
            </div>
          </div>

          {/* ── the model + the rack ────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <Section label="Garment">
              <div className="flex flex-wrap gap-1.5">
                {GARMENTS.map((g) => (
                  <button
                    key={g.hex}
                    onClick={() => setGarment(g.hex)}
                    title={g.name}
                    aria-label={g.name}
                    style={{ background: g.hex }}
                    className={
                      "h-8 w-8 border-2 transition-colors " +
                      (garment === g.hex
                        ? "border-cabinet-accent"
                        : "border-black/60 hover:border-cabinet-text/50")
                    }
                  />
                ))}
              </div>
            </Section>

            <div className="relative border-2 border-cabinet-frame bg-black/20 p-3">
              <button
                onClick={() => setModelIndex((i) => (i - 1 + models.length) % models.length)}
                aria-label="previous model"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 border-2 border-cabinet-border bg-cabinet-btn px-2.5 py-1.5 text-cabinet-text transition-colors hover:border-cabinet-accent"
              >
                ‹
              </button>
              <FrogWearing
                frog={model}
                garment={garment}
                art={art}
                className="h-52 w-full md:h-64"
              />
              <button
                onClick={() => setModelIndex((i) => (i + 1) % models.length)}
                aria-label="next model"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 border-2 border-cabinet-border bg-cabinet-btn px-2.5 py-1.5 text-cabinet-text transition-colors hover:border-cabinet-accent"
              >
                ›
              </button>
              <div className="mt-1 text-center text-[10px] uppercase tracking-widest text-cabinet-text/50">
                {model.name} models it
              </div>
            </div>

            <Section label="Name it">
              <div className="flex gap-1.5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  placeholder="untitled tee"
                  className="min-w-0 flex-1 border-2 border-cabinet-border bg-cabinet-btn px-3 py-2 text-[11px] uppercase tracking-widest text-cabinet-text outline-none focus:border-cabinet-accent"
                />
                <button onClick={save} className={BTN + " " + BTN_OFF}>
                  {editingId ? "Update" : "Hang it up"}
                </button>
                <button onClick={startFresh} className={BTN + " " + BTN_OFF}>
                  New
                </button>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => void putOn()} className={BTN + " flex-1 " + BTN_ON}>
                  👕 Wear it in the pit
                </button>
                {wornId && (
                  <button onClick={() => void takeOff()} className={BTN + " " + BTN_OFF}>
                    Take it off
                  </button>
                )}
              </div>
              <div className="h-4 font-mono text-[11px] lowercase text-cabinet-accent">{status}</div>
            </Section>

            <Section label={`The rack · ${designs.length}`}>
              {designs.length === 0 ? (
                <p className="font-mono text-[11px] leading-relaxed text-cabinet-text/50">
                  Nothing on the rack yet. Paint a print, name it, and hang it up.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {designs.map((d) => (
                    <div
                      key={d.id}
                      className={
                        "relative border-2 bg-black/25 p-1 " +
                        (editingId === d.id ? "border-cabinet-accent" : "border-cabinet-border")
                      }
                    >
                      <button
                        onClick={() => load(d)}
                        title={`wear ${d.name}`}
                        className="block w-full"
                      >
                        <ShirtGraphic garment={d.garment} art={d.art} className="h-16 w-full" />
                        <div className="mt-1 truncate text-[8px] uppercase tracking-widest text-cabinet-text/70">
                          {d.name}
                        </div>
                        {wornId === d.id && (
                          <div className="text-[8px] uppercase tracking-widest text-cabinet-accent">
                            · worn ·
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          deleteDesign(d.id);
                          if (wornId === d.id) void wear(null);
                          if (editingId === d.id) startFresh();
                        }}
                        aria-label={`remove ${d.name}`}
                        className="absolute -right-1.5 -top-1.5 h-5 w-5 border-2 border-black bg-cabinet-btn text-[9px] leading-none text-cabinet-text hover:border-cabinet-accent hover:text-cabinet-accent"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
