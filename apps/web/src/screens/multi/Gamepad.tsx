import type { PointerEvent as ReactPointerEvent } from "react";
import type { WalkControls } from "../../game/useCrowdWalk";

// On-screen movement pad for touch — mobile has no arrow keys. Each button
// feeds the walker the matching arrow key on press and releases it on lift, so
// the physics are identical to keyboard play. Hidden on desktop (md:hidden).
function PadButton({
  label,
  keyName,
  press,
  release,
  className = "",
}: {
  label: string;
  keyName: string;
  press: (k: string) => void;
  release: (k: string) => void;
  className?: string;
}) {
  const start = (e: ReactPointerEvent) => {
    e.preventDefault();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    press(keyName);
  };
  const end = () => release(keyName);
  return (
    <button
      aria-label={label}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      className={
        "flex h-16 w-16 select-none touch-none items-center justify-center border-2 border-cabinet-accent bg-cabinet-btn/85 text-2xl text-cabinet-accent shadow-[2px_2px_0_#6b4e18] active:bg-cabinet-accent active:text-cabinet-ink " +
        className
      }
    >
      {label}
    </button>
  );
}

// `className` positions the cluster within its (relative) container — defaults
// to the top-left, clear of anything sitting on the floor.
export function Gamepad({ press, release, className = "left-3 top-4" }: WalkControls & { className?: string }) {
  return (
    <div className={"pointer-events-none absolute z-30 flex items-end gap-2 md:hidden " + className}>
      <PadButton label="◀" keyName="arrowleft" press={press} release={release} className="pointer-events-auto" />
      <PadButton label="▶" keyName="arrowright" press={press} release={release} className="pointer-events-auto" />
      <PadButton label="▲" keyName="arrowup" press={press} release={release} className="pointer-events-auto ml-1" />
    </div>
  );
}
