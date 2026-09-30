import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutrals are cool blue-tinted now, not the old warm cream/beige —
        // ink in particular is drawn from the wordmark's navy (#102E6B) so
        // body text itself reads as part of the brand, not a neutral gray.
        ground: "#F3F8FC",
        surface: "#FFFFFF",
        ink: "#0B1F3A",
        "ink-muted": "#5B6B80",
        border: "#D9E6F0",
        money: "#0AA7B5",
        accent: "#1476E8",
        "accent-teal": "#17D0C1"
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
