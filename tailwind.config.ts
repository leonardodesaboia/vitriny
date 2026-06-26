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
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        "paper-soft": "rgb(var(--color-paper-soft) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--color-ink-muted) / <alpha-value>)",
        leaf: "rgb(var(--color-leaf) / <alpha-value>)",
        "leaf-hover": "rgb(var(--color-leaf-hover) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        amber: "rgb(var(--color-amber) / <alpha-value>)",
        "amber-soft": "rgb(var(--color-amber-soft) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-brand-body)", "sans-serif"],
        serif: ["var(--font-brand-display)", "serif"],
        fraunces: ["var(--font-brand-display)", "serif"],
        jakarta: ["var(--font-brand-body)", "sans-serif"],
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
