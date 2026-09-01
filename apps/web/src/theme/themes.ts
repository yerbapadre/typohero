export type ThemeId = "amber" | "pond" | "coral";

export type ThemeVars = {
  bg: string;
  accent: string;
  ink: string;
  frame: string;
  shadow: string;
  btn: string;
  border: string;
  text: string;
};

export const THEMES: { id: ThemeId; name: string; vars: ThemeVars }[] = [
  {
    id: "amber",
    name: "Amber Cabinet",
    vars: {
      bg: "#12100a",
      accent: "#f5b53f",
      ink: "#1a1305",
      frame: "#2a2212",
      shadow: "#6b4e18",
      btn: "#1a1710",
      border: "#322a18",
      text: "#ecdcb4",
    },
  },
  {
    id: "pond",
    name: "Pond Cyan",
    vars: {
      bg: "#0a1414",
      accent: "#45d6d0",
      ink: "#04201f",
      frame: "#133030",
      shadow: "#16403f",
      btn: "#0f1c1c",
      border: "#1c3231",
      text: "#bfe9e6",
    },
  },
  {
    id: "coral",
    name: "Coral Punch",
    vars: {
      bg: "#120c0b",
      accent: "#7cf07f",
      ink: "#0d100d",
      frame: "#4a1f1a",
      shadow: "#e0563e",
      btn: "#17100f",
      border: "#3a201d",
      text: "#f0d3cd",
    },
  },
];

const VAR: Record<keyof ThemeVars, string> = {
  bg: "--cab-bg",
  accent: "--cab-accent",
  ink: "--cab-ink",
  frame: "--cab-frame",
  shadow: "--cab-shadow",
  btn: "--cab-btn",
  border: "--cab-border",
  text: "--cab-text",
};

const STORAGE_KEY = "frog-theme";
const DEFAULT: ThemeId = "amber";

export function getStoredTheme(): ThemeId {
  const v = localStorage.getItem(STORAGE_KEY);
  return THEMES.some((t) => t.id === v) ? (v as ThemeId) : DEFAULT;
}

export function applyTheme(id: ThemeId) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0]!;
  const style = document.documentElement.style;
  (Object.keys(VAR) as (keyof ThemeVars)[]).forEach((k) =>
    style.setProperty(VAR[k], theme.vars[k]),
  );
}

export function setTheme(id: ThemeId) {
  localStorage.setItem(STORAGE_KEY, id);
  applyTheme(id);
}

export function initTheme() {
  applyTheme(getStoredTheme());
}
