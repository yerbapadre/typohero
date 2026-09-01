import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNav } from "../nav/NavContext";
import { FROGS, type Frog } from "../characters";

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 text-right text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={
              "h-2 w-6 rounded-sm " + (i < value ? "bg-emerald-400" : "bg-white/10")
            }
          />
        ))}
      </div>
    </div>
  );
}

export function CharacterSettings() {
  const { config, setConfig } = useNav();
  const navigate = useNavigate();

  const startIndex = Math.max(
    0,
    FROGS.findIndex((f) => f.id === config.character?.faceId),
  );
  const [index, setIndex] = useState(startIndex);
  const [dir, setDir] = useState<1 | -1>(1);
  const frog: Frog = FROGS[index]!;

  useEffect(() => {
    setConfig({
      character: { faceId: frog.id, outfitId: "default", instrumentSkinId: "default" },
    });
  }, [frog.id, setConfig]);

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
    <div className="relative flex h-screen flex-col overflow-hidden bg-neutral-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_35%_38%,rgba(52,211,153,0.14),transparent_70%)]" />

      <h1 className="relative z-10 pt-10 text-center text-sm uppercase tracking-[0.3em] text-neutral-500">
        Pick your player
      </h1>

      <div className="relative z-10 grid flex-1 grid-cols-1 items-center gap-8 px-6 md:grid-cols-2 md:px-16">
        {/* stage */}
        <div className="relative flex h-full items-center justify-center">
          <button
            onClick={() => move(-1)}
            aria-label="previous"
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/5 p-3 text-2xl text-neutral-400 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            ‹
          </button>

          <div className="flex flex-col items-center">
            <div key={frog.id} className={dir === 1 ? "frog-in-right" : "frog-in-left"}>
              <img
                src={frog.image}
                alt={frog.name}
                draggable={false}
                className="frog-bob max-h-[52vh] w-auto select-none object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.55)]"
              />
            </div>
            <div className="mt-[-8px] h-6 w-40 rounded-[100%] bg-black/60 blur-md" />
          </div>

          <button
            onClick={() => move(1)}
            aria-label="next"
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/5 p-3 text-2xl text-neutral-400 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            ›
          </button>

          <div className="absolute bottom-2 flex gap-2">
            {FROGS.map((f, i) => (
              <button
                key={f.id}
                aria-label={f.name}
                onClick={() => {
                  setDir(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className={
                  "h-2 rounded-full transition-all " +
                  (i === index ? "w-6 bg-emerald-400" : "w-2 bg-white/20 hover:bg-white/40")
                }
              />
            ))}
          </div>
        </div>

        {/* info */}
        <div key={frog.id} className={(dir === 1 ? "frog-in-right" : "frog-in-left") + " max-w-md"}>
          <div className="text-xs uppercase tracking-[0.3em] text-neutral-600">
            {index + 1} / {FROGS.length}
          </div>
          <h2 className="mt-2 text-4xl font-semibold">{frog.name}</h2>
          <div className={"mt-1 text-lg " + frog.accent}>{frog.tagline}</div>
          <p className="mt-4 leading-relaxed text-neutral-400">{frog.description}</p>

          <div className="mt-8 flex flex-col gap-2">
            {frog.stats.map((s) => (
              <StatBar key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-center gap-6 pb-10">
        <button className="text-neutral-500 hover:text-white" onClick={() => navigate("/")}>
          Back
        </button>
        <button
          onClick={() => navigate("/solo/song")}
          className="rounded-full bg-emerald-500 px-6 py-2 font-medium text-neutral-950 transition hover:bg-emerald-400"
        >
          Play as {frog.name} →
        </button>
      </div>
    </div>
  );
}
