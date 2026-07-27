import type { BusinessType } from "@prisma/client";

import { SectionHeader } from "@/components/provider-profile/profile-form-ui";

const BUSINESS_TYPE_OPTIONS: {
  value: BusinessType;
  label: string;
  description: string;
}[] = [
  {
    value: "PRODUCTS",
    label: "Produtos",
    description:
      "Para lojas, encomendas, kits, doces, roupas, artesanato e itens físicos ou digitais.",
  },
  {
    value: "SERVICES",
    label: "Serviços",
    description:
      "Para atendimentos, consultorias, eventos, beleza, manutenção e trabalhos personalizados.",
  },
  {
    value: "BOTH",
    label: "Produtos e serviços",
    description: "Para negócios que vendem os dois tipos de item.",
  },
];

type BusinessTypeSectionProps = {
  businessType: BusinessType;
  onBusinessTypeChange: (value: BusinessType) => void;
};

export function BusinessTypeSection({
  businessType,
  onBusinessTypeChange,
}: BusinessTypeSectionProps) {
  return (
    <div className="grid gap-5">
      <SectionHeader
        label="Tipo da vitrine"
        description="Usamos essa informação para personalizar sua experiência ao cadastrar itens."
      />

      <input name="businessType" type="hidden" value={businessType} />
      <div className="grid gap-2">
        {BUSINESS_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={businessType === opt.value}
            onClick={() => onBusinessTypeChange(opt.value)}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition sm:gap-4 sm:p-4 ${
              businessType === opt.value
                ? "border-leaf/40 bg-mint/30"
                : "border-paper-soft bg-paper hover:border-stone-300"
            }`}
          >
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-current">
              {businessType === opt.value ? (
                <div className="h-2 w-2 rounded-full bg-leaf" />
              ) : null}
            </div>
            <div className="grid gap-0.5">
              <span className="text-sm font-semibold text-ink">
                {opt.label}
              </span>
              <span className="text-xs leading-5 text-ink-muted">
                {opt.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
