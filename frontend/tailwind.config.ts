import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#FAF8F4",
        surface: "#FFFFFF",
        ink: "#17160F",
        "ink-muted": "#6B6858",
        border: "#E7E2D8",
        money: "#0D7A5F",
        accent: "#4338CA"
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-ibm-plex)", "sans-serif"]
      },
      borderRadius: {
        card: "14px"
      }
    }
  },
  plugins: []
};
export default config;
