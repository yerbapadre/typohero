import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Baloo 2"', "system-ui", "cursive"],
      },
      colors: {
        cream: "#f3eddc",
        ink: "#1c1a17",
        frog: "#3f9b52",
        glove: "#e04b3a",
      },
    },
  },
  plugins: [],
} satisfies Config;
