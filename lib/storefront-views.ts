// Backstop de detecção de bot/crawler/preview de link. A maioria desses agentes
// nem executa o beacon (client JS), então isto pega só os que rodam JS.
export const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|telegram|bingpreview|preview|headless|phantom|puppeteer|playwright|lighthouse|pingdom|uptime/i;

// Deve esta visita ser contada? Exclui o dono logado e User-Agents de bot.
export function isCountableView(input: {
  userAgent: string | null;
  isOwner: boolean;
}): boolean {
  if (input.isOwner) return false;
  if (input.userAgent && BOT_UA_PATTERN.test(input.userAgent)) return false;
  return true;
}

// Bucket de dia: meia-noite UTC da data informada (para agregação por dia).
export function toDayBucket(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}
