// The stage canvas can't use Tailwind tokens, so it reads the same `--cab-*`
// custom properties the DOM chrome is built from. Re-read whenever the theme
// changes so the highway follows the cabinet.
export type Palette = {
  bg: string;
  accent: string;
  ink: string;
  frame: string;
  shadow: string;
  btn: string;
  border: string;
  text: string;
  bad: string;
};

const FALLBACK: Palette = {
  bg: "#12100a",
  accent: "#f5b53f",
  ink: "#1a1305",
  frame: "#2a2212",
  shadow: "#6b4e18",
  btn: "#1a1710",
  border: "#322a18",
  text: "#ecdcb4",
  bad: "#e0563e",
};

export function readPalette(): Palette {
  if (typeof window === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read("--cab-bg", FALLBACK.bg),
    accent: read("--cab-accent", FALLBACK.accent),
    ink: read("--cab-ink", FALLBACK.ink),
    frame: read("--cab-frame", FALLBACK.frame),
    shadow: read("--cab-shadow", FALLBACK.shadow),
    btn: read("--cab-btn", FALLBACK.btn),
    border: read("--cab-border", FALLBACK.border),
    text: read("--cab-text", FALLBACK.text),
    bad: FALLBACK.bad,
  };
}

// Colors compose: `mix` returns hex so its result can be fed back into `mix`
// or `alpha` without losing the channels.
function parseColor(color: string): [number, number, number] {
  const rgb = color.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1]!.split(",").map((v) => parseInt(v.trim(), 10) || 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  }
  const h = color.replace("#", "").trim();
  const full = h.length === 3 ? h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]! : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function alpha(color: string, a: number): string {
  const [r, g, b] = parseColor(color);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(from: string, to: string, t: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  const k = Math.max(0, Math.min(1, t));
  const hex = (i: 0 | 1 | 2) =>
    Math.round(a[i] + (b[i] - a[i]) * k)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(0)}${hex(1)}${hex(2)}`;
}
