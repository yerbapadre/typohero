import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function CabinetButton({
  label,
  selected,
  onClick,
  onMouseEnter,
}: {
  label: string;
  selected: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  const base =
    "w-full cursor-pointer border-2 px-5 py-5 text-center text-sm uppercase tracking-widest transition-colors md:text-base";
  const look = selected
    ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
    : "border-cabinet-border bg-cabinet-btn text-cabinet-text hover:border-cabinet-accent";
  return (
    <button onClick={onClick} onMouseEnter={onMouseEnter} className={`${base} ${look}`}>
      {label}
    </button>
  );
}

const OPTIONS = [
  { label: "Single Player", to: "/solo/character" },
  { label: "Multiplayer", to: "/band" },
  { label: "Join the Crowd", to: "/crowd" },
];

const DEFAULT = OPTIONS.findIndex((o) => o.label === "Multiplayer");

export function ModeSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(DEFAULT);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => (i + 1) % OPTIONS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => (i - 1 + OPTIONS.length) % OPTIONS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        navigate(OPTIONS[selected]!.to);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-cabinet-bg px-6 py-12 font-pixel text-cabinet-text">
      <img
        src="/frogs/gunslinger.png"
        alt="frog"
        draggable={false}
        className="h-52 w-auto select-none object-contain md:h-64"
      />

      <h1 className="text-center leading-[1.3] tracking-wide">
        <span className="block text-3xl font-bold text-white md:text-5xl">FROG SINATRA</span>
        <span className="mt-2 block text-lg font-bold text-cabinet-accent md:text-2xl">
          &amp; THE TADPOLES
        </span>
      </h1>

      <div className="w-full max-w-md border-[3px] border-cabinet-frame bg-black/15 p-6 shadow-[8px_8px_0_var(--cab-shadow)]">
        <div className="flex flex-col gap-3">
          <CabinetButton
            label={OPTIONS[0]!.label}
            selected={selected === 0}
            onClick={() => navigate(OPTIONS[0]!.to)}
            onMouseEnter={() => setSelected(0)}
          />
          <CabinetButton
            label={OPTIONS[1]!.label}
            selected={selected === 1}
            onClick={() => navigate(OPTIONS[1]!.to)}
            onMouseEnter={() => setSelected(1)}
          />
          <div className="my-1 h-0.5 bg-cabinet-frame" />
          <CabinetButton
            label={OPTIONS[2]!.label}
            selected={selected === 2}
            onClick={() => navigate(OPTIONS[2]!.to)}
            onMouseEnter={() => setSelected(2)}
          />
        </div>
      </div>
    </div>
  );
}
