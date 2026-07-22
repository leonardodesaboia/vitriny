export type ProfileLink = { label: string; url: string };

export const MAX_PROFILE_LINKS = 10;
export const MAX_LINK_LABEL_LENGTH = 40;

// Normaliza a URL digitada: prefixa https:// quando falta esquema, valida com
// new URL() e aceita SOMENTE http/https (bloqueia javascript:, data:, etc.).
// Retorna a URL normalizada (url.href) ou null se for inválida.
export function normalizeLinkUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Tem um esquema explícito ("algo:")? Se sim, respeita; senão, assume https.
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url.href;
}

// Sanitiza a lista crua vinda do formulário: descarta linhas vazias, valida
// rótulo e URL, e corta em MAX_PROFILE_LINKS. Erros são mensagens por linha.
export function sanitizeProfileLinks(
  raw: Array<{ label: string; url: string }>
): { links: ProfileLink[]; errors: string[] } {
  const links: ProfileLink[] = [];
  const errors: string[] = [];

  for (const row of raw) {
    if (links.length >= MAX_PROFILE_LINKS) break;

    const label = row.label.trim();
    const rawUrl = row.url.trim();

    if (!label && !rawUrl) continue;

    if (label.length > MAX_LINK_LABEL_LENGTH) {
      errors.push(
        `Um dos rótulos é muito longo (máx. ${MAX_LINK_LABEL_LENGTH} caracteres).`
      );
      continue;
    }

    if (!label) {
      errors.push("Informe um rótulo para cada link.");
      continue;
    }

    const url = normalizeLinkUrl(rawUrl);
    if (!url) {
      errors.push(`O link "${label}" precisa de uma URL válida.`);
      continue;
    }

    links.push({ label, url });
  }

  return { links: links.slice(0, MAX_PROFILE_LINKS), errors };
}

// Lê defensivamente a coluna Json (unknown) do banco para ProfileLink[].
export function parseProfileLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item) => {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as { label?: unknown }).label === "string" &&
        typeof (item as { url?: unknown }).url === "string"
      ) {
        const link = item as ProfileLink;
        if (
          !link.url.startsWith("http://") &&
          !link.url.startsWith("https://")
        ) {
          return [];
        }
        return [{ label: link.label, url: link.url }];
      }
      return [];
    })
    .slice(0, MAX_PROFILE_LINKS);
}
