import type { Metadata } from "next";

// Metadata compartilhada para rotas que NÃO devem ser indexadas (dashboard,
// autenticação, formulário de orçamento, proposta por link, 404). Usamos
// `noindex, nofollow` no HTML em vez de `Disallow` no robots.txt: o Google
// precisa rastrear a página para enxergar o noindex. Ver docs oficiais:
// https://developers.google.com/search/docs/essentials/technical
export const PRIVATE_METADATA: Metadata = {
  robots: { index: false, follow: false },
};

// Variante com título próprio (a aba do navegador continua útil), mantendo o
// mesmo noindex.
export function privateMetadata(title?: string): Metadata {
  if (title) {
    return { title, robots: { index: false, follow: false } };
  }
  return PRIVATE_METADATA;
}
