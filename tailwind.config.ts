import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F5F0E8",
        "paper-soft": "#EDE8DE",
        ink: "#1C1917",
        "ink-muted": "#78716C",
        leaf: "#1B5E3B",
        "leaf-hover": "#2D7A52",
        mint: "#D4EBD9",
        amber: "#C97D3F",
        "amber-soft": "#F5E6D3"
      },
      fontFamily: {
        fraunces: ["var(--font-fraunces)", "serif"],
        jakarta: ["var(--font-jakarta)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      boxShadow: {
        card: "0 1px 3px rgba(28,25,23,0.08), 0 4px 16px rgba(28,25,23,0.06)",
        "card-hover": "0 4px 20px rgba(28,25,23,0.14), 0 8px 32px rgba(28,25,23,0.08)"
      }
    }
  },
  plugins: []
};

export default config;
