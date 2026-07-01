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
    success?: string;
    image_error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do item.",
  profile: "Cadastre os dados do negócio antes de adicionar itens.",
  "not-found": "Item não encontrado.",
  "limit-active-services": LIMIT_ERROR_MESSAGES["limit-active-services"],
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      plan: true,
      businessType: true,
      services: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          itemType: true,
          basePrice: true,
          isActive: true,
          pricingType: true,
          fixedServiceCheckoutMode: true,
          requiresSchedulingDetails: true,
          imageUrl: true,
        },
      },
    },
  });

  const businessType = profile?.businessType ?? "SERVICES";
  const defaultItemType =
    businessType === "PRODUCTS" ? "PRODUCT" : "SERVICE";

  const pageSubtitle =
    businessType === "PRODUCTS"
      ? "Cadastre os produtos que serão exibidos na sua vitrine pública."
      : businessType === "SERVICES"
        ? "Cadastre os serviços que serão exibidos na sua vitrine pública."
        : "Cadastre os produtos e serviços que serão exibidos na sua vitrine pública.";

  const newItemLabel =
    businessType === "PRODUCTS"
      ? "Novo produto"
      : businessType === "SERVICES"
        ? "Novo serviço"
        : "Novo item";

  return (
    <div className="min-w-0 overflow-x-hidden p-4 sm:p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        Itens da vitrine
      </p>
      <h1 className="mt-2 font-fraunces text-2xl sm:text-3xl md:text-4xl font-bold text-ink">
        Cadastro de itens
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        {pageSubtitle}
      </p>

      {params.success === "saved" && !params.image_error ? (
        <p className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Item salvo com sucesso!
        </p>
      ) : null}

      {params.image_error ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Item salvo, mas o envio da imagem falhou. Edite o item para reenviar.
        </p>
      ) : null}

      {params.error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessages[params.error] ?? "Não foi possível salvar o item."}
        </p>
      ) : null}

      {!profile ? (
        <div className="mt-8 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
          <h2 className="font-fraunces text-xl font-bold text-ink">
            Cadastre seu negócio primeiro
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Os itens ficam vinculados aos dados do negócio.
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/perfil"
          >
            Cadastrar negócio
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid w-full min-w-0 gap-8">
          <section className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
              {newItemLabel}
            </p>
            <div className="mt-4 min-w-0">
              <ServiceForm
                isPro={profile.plan === "PRO"}
                defaultItemType={defaultItemType}
              />
            </div>
          </section>

          <section className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
              Itens cadastrados
            </p>
            <div className="mt-4 min-w-0">
              <ServiceList
                isPro={profile.plan === "PRO"}
                services={profile.services.map((s) => ({
                  id: s.id,
                  name: s.name,
                  description: s.description,
                  itemType: s.itemType,
                  basePrice: s.basePrice?.toString() ?? null,
                  isActive: s.isActive,
                  pricingType: s.pricingType,
                  fixedServiceCheckoutMode: s.fixedServiceCheckoutMode,
                  requiresSchedulingDetails: s.requiresSchedulingDetails,
                  imageUrl: s.imageUrl ?? null,
                }))}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
