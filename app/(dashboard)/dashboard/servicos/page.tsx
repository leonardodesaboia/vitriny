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
    include: {
      services: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <section className="mx-auto max-w-5xl rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <Link className="text-sm font-semibold text-leaf" href="/dashboard">
          Voltar ao dashboard
        </Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-leaf">
          Serviços
        </p>
        <h1 className="mt-3 text-3xl font-bold">Cadastro de serviços</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">
          Cadastre os serviços que serão usados depois na página pública e nos
          pedidos de orçamento.
        </p>

        {params.error ? (
          <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessages[params.error] ?? "Não foi possível salvar o serviço."}
          </p>
        ) : null}

        {!profile ? (
          <div className="mt-8 rounded-lg border border-stone-200 bg-paper p-5">
            <h2 className="text-xl font-bold text-ink">Crie seu perfil primeiro</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Serviços pertencem ao perfil do prestador. Crie o perfil antes de
              cadastrar serviços.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443]"
              href="/dashboard/perfil"
            >
              Criar perfil
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8">
            <section>
              <h2 className="text-xl font-bold text-ink">Novo serviço</h2>
              <div className="mt-4">
                <ServiceForm />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-ink">Serviços cadastrados</h2>
              <div className="mt-4">
                <ServiceList
                  services={profile.services.map((s) => ({
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    basePrice: s.basePrice?.toString() ?? null,
                    isActive: s.isActive
                  }))}
                />
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
