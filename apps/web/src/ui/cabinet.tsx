import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/** Amber Cabinet primitives — the shared vocabulary every screen builds from. */

type Variant = "primary" | "default" | "ghost";
type Size = "sm" | "md" | "lg" | "hero";

const SIZES: Record<Size, string> = {
  sm: "border-2 px-3 py-2 text-[11px]",
  md: "border-2 px-5 py-4 text-sm md:text-base",
  lg: "border-2 px-5 py-5 text-sm md:text-base",
  hero: "border-[3px] px-6 py-6 text-lg font-bold tracking-[0.2em] shadow-[6px_6px_0_var(--cab-shadow)] md:text-2xl",
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "border-cabinet-accent bg-cabinet-accent text-cabinet-ink hover:bg-[#ffcf5a] " +
    "disabled:cursor-not-allowed disabled:border-cabinet-border disabled:bg-cabinet-btn " +
    "disabled:text-cabinet-text/30 disabled:hover:bg-cabinet-btn",
  default:
    "border-cabinet-border bg-cabinet-btn text-cabinet-text hover:border-cabinet-accent " +
    "disabled:cursor-not-allowed disabled:text-cabinet-text/25 disabled:hover:border-cabinet-border",
  ghost: "text-cabinet-text/40 hover:text-cabinet-text disabled:text-cabinet-text/20",
};

export function CabinetButton({
  variant = "default",
  size = "lg",
  selected = false,
  full = false,
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  /** Promotes a default button to the amber fill — for radio-style rows. */
  selected?: boolean;
  full?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const look = VARIANTS[selected ? "primary" : variant];
  const box = variant === "ghost" ? "text-sm" : SIZES[size];
  return (
    <button
      {...rest}
      className={[
        "cursor-pointer text-center uppercase tracking-widest transition-colors",
        box,
        look,
        full ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

/** Prev/next arrow for the frog carousels in the solo picker and the lobby. */
export function CarouselArrow({
  dir,
  label,
  onClick,
  className = "",
}: {
  dir: "prev" | "next";
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={
        "border-2 border-cabinet-border bg-cabinet-btn px-3 py-2 text-lg text-cabinet-text transition-colors hover:border-cabinet-accent " +
        className
      }
    >
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}

/** The signature pixel frame: 3px border over a hard, un-blurred offset shadow. */
export function CabinetPanel({
  title,
  tight = false,
  className = "",
  children,
  ...rest
}: {
  title?: ReactNode;
  /** p-4 instead of p-6 — for dense panels like lists and grids. */
  tight?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={
        "border-[3px] border-cabinet-frame bg-black/15 shadow-[8px_8px_0_var(--cab-shadow)] " +
        (tight ? "p-4 " : "p-6 ") +
        className
      }
    >
      {title && <div className="mb-3 text-xs uppercase tracking-widest text-cabinet-accent">{title}</div>}
      {children}
    </div>
  );
}

export function CabinetInput({
  code = false,
  className = "",
  ...rest
}: {
  /** Wide-tracked caps for 4-letter band codes. */
  code?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={[
        "border-2 border-cabinet-border bg-cabinet-btn px-4 py-4 text-center text-cabinet-text outline-none",
        "placeholder:text-cabinet-text/30 focus:border-cabinet-accent",
        code ? "text-xl uppercase tracking-[0.4em] placeholder:tracking-widest" : "text-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

/** Amber caps label stacked over its control. */
export function CabinetField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-widest text-cabinet-accent">{label}</span>
      {children}
    </label>
  );
}

/** Thin frame-colored rule. With `label`, it splits around centered caps text. */
export function Divider({ label, className = "" }: { label?: ReactNode; className?: string }) {
  if (!label) return <div className={"h-0.5 bg-cabinet-frame " + className} />;
  return (
    <div className={"flex items-center gap-3 text-xs uppercase tracking-widest text-cabinet-text/40 " + className}>
      <div className="h-0.5 flex-1 bg-cabinet-frame" />
      {label}
      <div className="h-0.5 flex-1 bg-cabinet-frame" />
    </div>
  );
}

/** Blocked-out meter used for frog stats and difficulty intensity. */
export function Pips({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={"h-2.5 w-5 " + (i < value ? "bg-cabinet-accent" : "bg-cabinet-border")} />
      ))}
    </div>
  );
}

/** A single large readout over a caps label. */
export function Stat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-2xl text-white md:text-3xl">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-cabinet-text/40">{label}</div>
    </div>
  );
}

/** Full-screen "connecting…" / "loading…" hold. */
export function CabinetStatus({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-cabinet-bg px-6 text-center font-pixel text-sm uppercase tracking-widest text-cabinet-text/50">
      {children}
    </div>
  );
}

/** Footer for every step of the solo wizard: back beside a full-width amber next. */
export function WizardNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled = false,
  backLabel = "← Back",
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: ReactNode;
  nextDisabled?: boolean;
  backLabel?: ReactNode;
}) {
  return (
    <div className="mt-2 flex w-full max-w-md gap-3">
      <CabinetButton size="md" onClick={onBack}>
        {backLabel}
      </CabinetButton>
      <CabinetButton variant="primary" size="md" onClick={onNext} disabled={nextDisabled} className="flex-1">
        {nextLabel}
      </CabinetButton>
    </div>
  );
}

/** Oversized band-code marquee for lobby and crowd holding screens. */
export function RoomHeader({
  eyebrow,
  code,
  caption,
}: {
  eyebrow: ReactNode;
  code: string;
  caption?: ReactNode;
}) {
  return (
    <header className="text-center">
      <div className="text-xs uppercase tracking-widest text-cabinet-text/40">{eyebrow}</div>
      <div className="mt-1 text-4xl font-bold tracking-[0.3em] text-cabinet-accent md:text-5xl">{code}</div>
      {caption && (
        <div className="mt-1 text-[11px] uppercase tracking-widest text-cabinet-text/40">{caption}</div>
      )}
    </header>
  );
}

/** Count-in card overlaid on the highway while the band waits for its cue. */
export function CountIn({
  label,
  value,
  size = "screen",
}: {
  label: ReactNode;
  value: ReactNode;
  size?: "screen" | "panel";
}) {
  return (
    <div className="border-[3px] border-cabinet-accent bg-cabinet-bg/90 px-8 py-6 text-center shadow-[8px_8px_0_var(--cab-shadow)]">
      <div className="text-[10px] uppercase tracking-[0.4em] text-cabinet-text/50 md:text-xs">{label}</div>
      <div
        className={
          "mt-2 tracking-widest text-cabinet-accent " +
          (size === "screen" ? "text-5xl md:text-7xl" : "text-3xl md:text-4xl")
        }
      >
        {value}
      </div>
    </div>
  );
}
