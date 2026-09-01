import { useNavigate } from "react-router-dom";

function MenuButton({
  label,
  onClick,
  variant = "default",
  disabled = false,
  note,
}: {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "default";
  disabled?: boolean;
  note?: string;
}) {
  const base =
    "relative flex w-full items-center justify-center rounded-2xl px-6 py-4 text-2xl font-extrabold tracking-wide transition-all";
  let look: string;
  if (disabled) {
    look = "border-2 border-white/10 text-white/25";
  } else if (variant === "primary") {
    look =
      "bg-frog text-ink shadow-[4px_4px_0_#215c30] hover:bg-[#4bb062] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#215c30] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none";
  } else {
    look =
      "border-2 border-frog bg-transparent text-frog shadow-[4px_4px_0_#215c30] hover:bg-frog hover:text-ink hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#215c30] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none";
  }
  return (
    <button disabled={disabled} onClick={onClick} className={`${base} ${look}`}>
      {label}
      {note && (
        <span className="absolute right-4 rounded-full border border-white/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white/30">
          {note}
        </span>
      )}
    </button>
  );
}

export function ModeSelect() {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-12 overflow-hidden bg-neutral-950 px-8 py-12 font-display text-white md:flex-row md:gap-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_30%_40%,rgba(63,155,82,0.16),transparent_70%)]" />

      {/* logo */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="-rotate-2">
          <h1 className="text-7xl font-extrabold leading-[0.85] tracking-tight text-frog md:text-8xl">
            FROG
          </h1>
          <h1 className="text-7xl font-extrabold leading-[0.85] tracking-tight text-white md:text-8xl">
            CITY
          </h1>
          <div className="mt-2 h-2 w-full rounded-full bg-frog" />
        </div>
        <img
          src="/frogs/boxer.png"
          alt="frog"
          draggable={false}
          className="mt-6 h-48 w-auto select-none object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,0.6)] md:h-56"
        />
        <div className="mt-1 flex gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/30" />
          ))}
        </div>
      </div>

      {/* menu panel */}
      <div className="relative z-10 w-full max-w-sm rotate-[0.6deg] rounded-3xl border border-white/10 bg-neutral-900 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="mb-4 text-center text-sm font-bold uppercase tracking-[0.3em] text-white/40">
          Main Menu
        </div>
        <div className="flex flex-col gap-3">
          <MenuButton label="Single Player" variant="primary" onClick={() => navigate("/solo/character")} />
          <MenuButton label="Multiplayer" onClick={() => navigate("/band")} />
          <div className="my-1 border-t border-white/10" />
          <MenuButton label="Join the Crowd" onClick={() => navigate("/crowd")} />
        </div>
      </div>
    </div>
  );
}
