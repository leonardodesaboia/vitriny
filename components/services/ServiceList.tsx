import { ServiceItem } from "@/components/services/ServiceItem";
import type { ServiceForClient } from "@/types/service";

type ServiceListProps = {
  services: ServiceForClient[];
  isPro?: boolean;
  allowItemTypeSelection?: boolean;
  slug?: string | null;
};

export function ServiceList({
  services,
  isPro = false,
  allowItemTypeSelection = false,
  slug = null
}: ServiceListProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-paper-soft bg-paper p-5">
        <p className="text-sm leading-6 text-ink-muted">
          Nenhum item cadastrado ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-2">
      {services.map((service) => (
        <ServiceItem
          allowItemTypeSelection={allowItemTypeSelection}
          isPro={isPro}
          key={service.id}
          service={service}
          slug={slug}
        />
      ))}
    </div>
  );
}
