/**
 * Parses a Brazilian-formatted string to a plain decimal string.
 * "1.234,56" → "1234.56"
 * "1234,56"  → "1234.56"
 * "150.00"   → "150.00"  (period treated as decimal when no comma)
 */
export function parseBRLInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes(",")) {
    return trimmed.replace(/\./g, "").replace(",", ".");
  }
  return trimmed;
}

/**
 * Formats a number or decimal string to Brazilian display format: "1.234,56"
 */
export function formatBRL(value: string | number): string {
  const num =
    typeof value === "number"
      ? value
      : parseFloat(parseBRLInput(String(value)));
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}
