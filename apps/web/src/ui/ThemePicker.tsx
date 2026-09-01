import { useEffect, useRef, useState } from "react";
import { THEMES, setTheme, type ThemeId } from "../theme/themes";
import { useTheme } from "../theme/useTheme";

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const active = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: ThemeId) {
    setTheme(id);
  }

  return (
    <div ref={ref} className="fixed right-4 top-4 z-50 font-pixel">
      <button
        aria-label="Themes"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center border-2 border-cabinet-border bg-cabinet-btn text-cabinet-text transition-colors hover:border-cabinet-accent hover:text-cabinet-accent"
      >
        <GearIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 border-[3px] border-cabinet-frame bg-cabinet-bg p-3 shadow-[6px_6px_0_var(--cab-shadow)]">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-cabinet-text/50">
            Theme
          </div>
          <div className="flex flex-col gap-2">
            {THEMES.map((t) => {
              const on = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => pick(t.id)}
                  className={`flex items-center gap-2 border-2 px-3 py-2 text-left text-[11px] uppercase tracking-wide transition-colors ${
                    on
                      ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
                      : "border-cabinet-border bg-cabinet-btn text-cabinet-text hover:border-cabinet-accent"
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 border border-black/40"
                    style={{ background: t.vars.accent }}
                  />
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
