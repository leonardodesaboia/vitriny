import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PoweredByVitriny } from "@/components/public/PoweredByVitriny";

describe("PoweredByVitriny", () => {
  it("renderiza um link rastreável e descritivo para a landing page", () => {
    const html = renderToStaticMarkup(createElement(PoweredByVitriny));
    const visibleText = html.replace(/<[^>]+>/g, "");

    expect(html).toContain('href="/"');
    expect(html).toContain(">Vitriny</a>");
    expect(visibleText).toBe("Powered by Vitriny");
  });
});
