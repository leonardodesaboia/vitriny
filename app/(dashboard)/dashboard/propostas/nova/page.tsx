import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ProposalForm } from "@/components/proposals/ProposalForm";
import { LIMIT_ERROR_MESSAGES } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

type NewProposalPageProps = {
  searchParams: Promise<{
    error?: string;
    requestId?: string;
    templateId?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados da proposta.",
  "limit-monthly-proposals":
    LIMIT_ERROR_MESSAGES["limit-monthly-proposals"]
};

export default async function NewProposalPage({ searchParams }: NewProposalPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!params.requestId) {
    redirect("/dashboard/pedidos?error=invalid");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: {
      userId: session.user.id
    },
    include: {
      proposalTemplates: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            orderBy: { createdAt: "asc" }
          }
        }
      }
    }
  });

  if (!profile) {
    redirect("/dashboard/pedidos?error=profile");
  }

  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: {
      id: params.requestId,
      providerId: profile.id
    },
    include: {
      proposal: true,
      service: {
        select: { name: true, pricingType: true }
      }
    }
  });

  if (!quoteRequest) {
    redirect("/dashboard/pedidos?error=not-found");
  }

  if (quoteRequest.service?.pricingType === "FIXED") {
    redirect("/dashboard/pedidos?error=fixed-price");
  }

  if (quoteRequest.proposal) {
    redirect("/dashboard/pedidos?error=proposal-exists");
  }

  const selectedTemplate = params.templateId
    ? profile.proposalTemplates.find((template) => template.id === params.templateId)
    : null;

  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-ink sm:px-6 md:px-8 md:py-10">
      <section className="mx-auto max-w-3xl">
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-leaf transition hover:text-leaf-hover"
          href="/dashboard/pedidos"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar aos pedidos
        </Link>

        <h1 className="mt-6 font-fraunces text-3xl font-bold text-ink sm:text-4xl">
          Proposta para {quoteRequest.customerName}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {quoteRequest.service?.name ??
            quoteRequest.serviceNameSnapshot ??
            "Pedido sem item selecionado"}
        </p>

        {params.error ? (
          <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessages[params.error] ?? "Não foi possível criar a proposta."}
          </p>
        ) : null}

        {profile.proposalTemplates.length > 0 ? (
          <div className="mt-6 border-y border-paper-soft py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Modelo
              </span>
              {profile.proposalTemplates.map((template) => (
                <Link
                  className={`inline-flex min-h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition ${
                    selectedTemplate?.id === template.id
                      ? "border-leaf bg-mint text-leaf"
                      : "border-paper-soft bg-white text-ink hover:border-leaf hover:text-leaf"
                  }`}
                  href={`/dashboard/propostas/nova?requestId=${quoteRequest.id}&templateId=${template.id}`}
                  key={template.id}
                >
                  {template.name}
                </Link>
              ))}
              {selectedTemplate ? (
                <Link
                  className="text-xs font-semibold text-ink-muted transition hover:text-ink"
                  href={`/dashboard/propostas/nova?requestId=${quoteRequest.id}`}
                >
                  Limpar
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <ProposalForm
          // Remonta o formulário ao trocar de modelo para reaplicar os
          // defaultValues do template selecionado.
          key={selectedTemplate?.id ?? "blank"}
          initialValues={
            selectedTemplate
              ? {
                  title: selectedTemplate.title,
                  description: selectedTemplate.description,
                  items: selectedTemplate.items
                }
              : undefined
          }
          requestId={quoteRequest.id}
        />
      </section>
    </main>
  );
}
