import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Baloo 2"', "system-ui", "cursive"],
        pixel: ['"Silkscreen"', "monospace"],
      },
      colors: {
        cream: "#f3eddc",
        ink: "#1c1a17",
        frog: "#3f9b52",
        glove: "#e04b3a",
        cabinet: {
          bg: "var(--cab-bg)",
          accent: "var(--cab-accent)",
          ink: "var(--cab-ink)",
          frame: "var(--cab-frame)",
          shadow: "var(--cab-shadow)",
          btn: "var(--cab-btn)",
          border: "var(--cab-border)",
          text: "var(--cab-text)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
