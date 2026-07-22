"use client";

import { useEffect } from "react";

// Dispara uma contagem de visita, no máximo uma vez por sessão de browser por
// vitrine (dedupe via sessionStorage — sem cookie, sem PII). Erros são
// silenciosos: a métrica nunca pode quebrar a vitrine.
export function StorefrontViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `sv-${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage indisponível: segue sem dedupe.
    }

    void fetch("/api/storefront-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  return null;
}
