import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const paletteIds = [
  "FOREST",
  "OCEAN",
  "ROSE",
  "GOLD",
  "SLATE",
  "LAVENDER",
  "TERRACOTTA",
  "TEAL",
] as const;

function readColor(id: string, token: string) {
  const block = css.match(
    new RegExp(`\\[data-brand-color="${id}"\\]\\s*\\{([^}]+)\\}`),
  )?.[1];
  const value = block?.match(
    new RegExp(`--color-${token}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`),
  );

  if (!value) throw new Error(`Token ${token} não encontrado em ${id}.`);
  return value.slice(1).map(Number);
}

function luminance(rgb: number[]) {
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: number[], second: number[]) {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("brand color contrast", () => {
  it.each(paletteIds)("%s atende WCAG AA nos usos principais", (id) => {
    const paper = readColor(id, "paper");
    const ink = readColor(id, "ink");
    const muted = readColor(id, "ink-muted");
    const leaf = readColor(id, "leaf");

    expect(contrast(paper, ink)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(paper, muted)).toBeGreaterThanOrEqual(4.5);
    expect(contrast([255, 255, 255], leaf)).toBeGreaterThanOrEqual(4.5);
  });
});
