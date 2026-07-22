"use client";

import { useEffect } from "react";

// Conta uma visita (vitrine) ou uma view de item (quando serviceId é passado),
// no máximo uma vez por sessão de browser por chave (dedupe via sessionStorage —
// sem cookie, sem PII). Erros silenciosos: a métrica nunca quebra a página.
export function StorefrontViewBeacon({
  slug,
  serviceId,
}: {
  slug: string;
  serviceId?: string;
}) {
  useEffect(() => {
    const key = serviceId ? `sv-${slug}-item-${serviceId}` : `sv-${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage indisponível: segue sem dedupe.
    }

    void fetch("/api/storefront-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(serviceId ? { slug, serviceId } : { slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, serviceId]);

  return null;
}
