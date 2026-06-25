import { ServiceItem } from "@/components/services/ServiceItem";
import type { ServiceForClient } from "@/types/service";

type ServiceListProps = {
  services: ServiceForClient[];
};

export function ServiceList({ services }: ServiceListProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-paper p-5">
        <p className="text-sm leading-6 text-stone-700">
          Nenhum serviço cadastrado ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {services.map((service) => (
        <ServiceItem key={service.id} service={service} />
      ))}
    </div>
  );
}
