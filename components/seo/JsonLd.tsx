import { serializeJsonLd } from "@/lib/seo/structured-data";

// Renderiza JSON-LD. `dangerouslySetInnerHTML` é o padrão oficial do Next.js
// para JSON-LD (não há alternativa em React: `<script>{string}</script>`
// escaparia entidades HTML e quebraria o JSON). O único vetor de XSS —
// conteúdo do dono fechar a tag <script> — é neutralizado por serializeJsonLd,
// que escapa `<` para `<` (coberto por teste). Autorizado pelo usuário.
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
