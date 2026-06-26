import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ServiceForm } from "@/components/services/ServiceForm";
import { ServiceList } from "@/components/services/ServiceList";
import { LIMIT_ERROR_MESSAGES } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

type ServicesPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do serviço.",
  profile: "Crie o perfil do prestador antes de cadastrar serviços.",
  "not-found": "Serviço não encontrado.",
  "limit-active-services": LIMIT_ERROR_MESSAGES["limit-active-services"]
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: {
      userId: session.user.id
    },
    select: {
      plan: true,
      services: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
          isActive: true,
          pricingType: true,
          requiresSchedulingDetails: true,
          imageUrl: true
        }
      }
    }
  });

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        Serviços
      </p>
      <h1 className="mt-2 font-fraunces text-2xl sm:text-3xl md:text-4xl font-bold text-ink">
        Cadastro de serviços
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Cadastre os serviços que serão exibidos no seu perfil público e usados nos pedidos de orçamento.
      </p>

      {params.error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessages[params.error] ?? "Não foi possível salvar o serviço."}
        </p>
      ) : null}

      {!profile ? (
        <div className="mt-8 rounded-xl border border-paper-soft bg-paper p-6">
          <h2 className="font-fraunces text-xl font-bold text-ink">Crie seu perfil primeiro</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Serviços pertencem ao perfil do prestador. Crie o perfil antes de
            cadastrar serviços.
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/perfil"
          >
            Criar perfil
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid max-w-2xl gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
              Novo serviço
            </p>
            <div className="mt-4">
              <ServiceForm isPro={profile.plan === "PRO"} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
              Serviços cadastrados
            </p>
            <div className="mt-4">
              <ServiceList
                isPro={profile.plan === "PRO"}
                services={profile.services.map((s) => ({
                  id: s.id,
                  name: s.name,
                  description: s.description,
                  basePrice: s.basePrice?.toString() ?? null,
                  isActive: s.isActive,
                  pricingType: s.pricingType,
                  requiresSchedulingDetails: s.requiresSchedulingDetails,
                  imageUrl: s.imageUrl ?? null
                }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
