import { useEffect, useRef, useState } from "react";
import { FROGS } from "../characters";

function Pips({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={"h-2.5 w-5 " + (i < value ? "bg-cabinet-accent" : "bg-cabinet-border")} />
      ))}
    </div>
  );
}

export function FrogList({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const start = Math.max(
    0,
    FROGS.findIndex((f) => f.id === selected),
  );
  const [index, setIndex] = useState(start);
  const [dir, setDir] = useState<1 | -1>(1);
  const touchX = useRef<number | null>(null);
  const frog = FROGS[index]!;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  useEffect(() => {
    onSelectRef.current(frog.id);
  }, [frog.id]);

  function move(step: 1 | -1) {
    setDir(step);
    setIndex((i) => (i + step + FROGS.length) % FROGS.length);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="w-full max-w-md select-none font-pixel"
      onTouchStart={(e) => (touchX.current = e.touches[0]!.clientX)}
      onTouchEnd={(e) => {
        const s = touchX.current;
        if (s == null) return;
        const dx = e.changedTouches[0]!.clientX - s;
        if (dx > 40) move(-1);
        else if (dx < -40) move(1);
        touchX.current = null;
      }}
    >
      <div className="relative border-[3px] border-cabinet-frame bg-black/20 p-4 shadow-[8px_8px_0_var(--cab-shadow)]">
        <button
          onClick={() => move(-1)}
          aria-label="previous frog"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 border-2 border-cabinet-border bg-cabinet-btn px-3 py-2 text-lg text-cabinet-text transition-colors hover:border-cabinet-accent"
        >
          ‹
        </button>

        <div key={frog.id} className={(dir === 1 ? "frog-in-right" : "frog-in-left") + " flex flex-col items-center gap-3 px-12"}>
          <img
            src={frog.image}
            alt={frog.name}
            draggable={false}
            className="h-44 w-auto object-contain md:h-52"
          />
          <div className="text-center">
            <div className="text-lg font-bold text-white md:text-xl">{frog.name}</div>
            <div className="mt-1 text-[11px] text-cabinet-accent">{frog.tagline}</div>
          </div>
        </div>

        <button
          onClick={() => move(1)}
          aria-label="next frog"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 border-2 border-cabinet-border bg-cabinet-btn px-3 py-2 text-lg text-cabinet-text transition-colors hover:border-cabinet-accent"
        >
          ›
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-2 border-cabinet-frame bg-black/15 p-4">
        <p className="font-mono text-[11px] leading-relaxed text-cabinet-text/70">{frog.description}</p>
        <div className="mt-1 flex flex-col gap-1.5">
          {frog.stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-16 text-right text-[10px] uppercase tracking-widest text-cabinet-text/50">
                {s.label}
              </span>
              <Pips value={s.value} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {FROGS.map((f, i) => (
          <button
            key={f.id}
            aria-label={f.name}
            onClick={() => {
              setDir(i > index ? 1 : -1);
              setIndex(i);
            }}
            className={"h-2 transition-all " + (i === index ? "w-6 bg-cabinet-accent" : "w-2 bg-cabinet-border hover:bg-cabinet-text/40")}
          />
        ))}
      </div>
    </div>
  );
}
