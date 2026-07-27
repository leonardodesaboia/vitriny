const DEFAULT_RETURN_PATH = "/dashboard/pedidos";

// Nunca redirect aberto: só caminhos internos da área de pedidos.
export function resolveQuoteRequestReturnPath(value: unknown): string {
  if (
    typeof value === "string" &&
    value.startsWith(DEFAULT_RETURN_PATH) &&
    !value.includes("//") &&
    !value.includes(":") &&
    !value.includes("..")
  ) {
    return value;
  }
  return DEFAULT_RETURN_PATH;
}
