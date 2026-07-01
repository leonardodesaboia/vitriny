import type { ServiceSaleMode } from "@/lib/service-sale-mode";
import type { CatalogItemType } from "@/types/service";

type Props = {
  name: string;
  description: string;
  basePrice: string;
  itemType: CatalogItemType;
  saleMode: ServiceSaleMode;
};

function formatMoney(value: string) {
  const num = parseFloat(value);
  if (!value || isNaN(num) || num <= 0) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

export function ItemCardPreview({ name, description, basePrice, itemType, saleMode }: Props) {
  const formattedPrice = formatMoney(basePrice);
  const isCustom = saleMode === "CUSTOM";
  const isPix = saleMode === "FIXED_PIX";
  const displayName = name.trim();

  return (
    <div className="overflow-hidden rounded-xl border border-paper-soft bg-white shadow-card">
      <div className="flex flex-col p-4">
        <span className="mb-2 w-fit rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
          {itemType === "PRODUCT" ? "Produto" : "Serviço"}
        </span>
        <p className={`line-clamp-2 font-jakarta text-sm font-bold ${displayName ? "text-ink" : "text-ink-muted/50"}`}>
          {displayName || "Nome do item"}
        </p>
        {description.trim() ? (
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-muted">
            {description}
          </p>
        ) : null}
        {formattedPrice && !isCustom ? (
          <p className="mt-2 font-fraunces text-base font-bold text-ink">{formattedPrice}</p>
        ) : formattedPrice && isCustom ? (
          <p className="mt-2 font-fraunces text-base font-bold text-ink">
            A partir de {formattedPrice}
          </p>
        ) : (
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-ink-muted">
            {isCustom ? "Sob consulta" : "Preço não definido"}
          </p>
        )}
        {isPix ? (
          <span className="mt-3 inline-flex min-h-8 w-fit items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white">
            Pagar com Pix →
          </span>
        ) : isCustom ? (
          <span className="mt-3 inline-flex min-h-8 w-fit items-center justify-center rounded-md border border-paper-soft bg-paper px-3 text-xs font-semibold text-ink">
            Solicitar orçamento →
          </span>
        ) : (
          <span className="mt-3 inline-flex min-h-8 w-fit items-center justify-center rounded-md border border-paper-soft bg-paper px-3 text-xs font-semibold text-ink">
            Solicitar →
          </span>
        )}
      </div>
    </div>
  );
}
