import type { Service } from "@prisma/client";

import { toggleServiceStatus } from "@/lib/actions/services";
import { ServiceForm } from "@/components/services/ServiceForm";

type ServiceListProps = {
  services: Service[];
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
    <div className="grid gap-5">
      {services.map((service) => (
        <article className="rounded-lg border border-stone-200 bg-paper p-5" key={service.id}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-ink">{service.name}</h3>
              <p className="mt-1 text-sm font-semibold text-stone-600">
                {service.isActive ? "Ativo" : "Inativo"}
              </p>
            </div>
            <form action={toggleServiceStatus}>
              <input name="serviceId" type="hidden" value={service.id} />
              <input
                name="nextStatus"
                type="hidden"
                value={String(!service.isActive)}
              />
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                type="submit"
              >
                {service.isActive ? "Desativar" : "Ativar"}
              </button>
            </form>
          </div>

          <div className="mt-5">
            <ServiceForm service={service} />
          </div>
        </article>
      ))}
    </div>
  );
}
