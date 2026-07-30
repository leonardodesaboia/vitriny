import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  // Só bloqueamos o que não é HTML (sem meta possível). As rotas privadas
  // (dashboard, auth, orçamento, proposta, 404) usam `noindex, nofollow` no
  // próprio HTML — precisam ser rastreáveis para o Google ler a diretiva.
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api"],
      },
    ],
    sitemap: baseUrl ? `${baseUrl}/sitemap.xml` : undefined,
  };
}
