type StorefrontContentInput = {
  activeItemCount: number;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

// "Conteúdo suficiente" para indexar/entrar no sitemap. Regra deliberadamente
// leniente (considera o conjunto, não só a descrição): uma vitrine com itens,
// ou com texto próprio, ou que seja um negócio local localizável (localização
// + contato) é útil. Barra apenas o stub publicado só com o nome.
export function hasSufficientStorefrontContent(
  input: StorefrontContentInput,
): boolean {
  const hasDescription = Boolean(input.description?.trim());
  const hasLocation = Boolean(
    input.city?.trim() || input.state?.trim() || input.address?.trim(),
  );
  const hasContact = Boolean(input.phone?.trim() || input.email?.trim());

  return (
    input.activeItemCount > 0 ||
    hasDescription ||
    (hasLocation && hasContact)
  );
}
