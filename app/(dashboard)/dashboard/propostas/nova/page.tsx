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
  exists: "Este pedido já possui uma proposta.",
  "fixed-price": "Pedidos de item com preço fixo não geram proposta.",
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

  const selectedTemplate = params.templateId
    ? profile.proposalTemplates.find((template) => template.id === params.templateId)
    : null;

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <section className="mx-auto max-w-4xl rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-leaf transition hover:text-leaf-hover" href="/dashboard/pedidos">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar aos pedidos
        </Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-leaf">
          Proposta
        </p>
        <h1 className="mt-3 text-3xl font-bold">Criar proposta</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">
          Pedido de {quoteRequest.customerName}
          {quoteRequest.service?.name ? (
            <>
              {" "}— <span className="font-semibold text-ink">{quoteRequest.service.name}</span>
            </>
          ) : null}
        </p>

        {params.error ? (
          <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessages[params.error] ?? "Não foi possível criar a proposta."}
          </p>
        ) : null}

        {quoteRequest.service?.pricingType === "FIXED" ? (
          <div className="mt-8 rounded-lg border border-mint bg-mint/30 p-5">
            <h2 className="text-xl font-bold text-ink">Preço fixo</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Este pedido veio de um item com preço fixo, então não é possível criar proposta.
            </p>
            <Link
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-leaf px-4 text-sm font-semibold text-white transition hover:bg-leaf-hover"
              href="/dashboard/pedidos"
            >
              Voltar aos pedidos
            </Link>
          </div>
        ) : quoteRequest.proposal ? (
          <div className="mt-8 rounded-lg border border-stone-200 bg-paper p-5">
            <h2 className="text-xl font-bold text-ink">Proposta já criada</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Este pedido já possui uma proposta. Link público:
            </p>
            <Link
              className="mt-3 inline-flex rounded-md bg-white px-3 py-2 text-sm font-semibold text-leaf"
              href={`/proposta/${quoteRequest.proposal.publicToken}`}
            >
              /proposta/{quoteRequest.proposal.publicToken}
            </Link>
          </div>
        ) : (
          <>
            {profile.proposalTemplates.length > 0 ? (
              <div className="mt-8 rounded-lg border border-stone-200 bg-paper p-5">
                <h2 className="text-xl font-bold text-ink">Usar modelo</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.proposalTemplates.map((template) => (
                    <Link
                      className={`inline-flex min-h-9 items-center justify-center rounded-md border px-4 text-sm font-semibold transition ${
                        selectedTemplate?.id === template.id
                          ? "border-leaf bg-mint text-leaf"
                          : "border-stone-300 bg-white text-ink hover:border-leaf hover:text-leaf"
                      }`}
                      href={`/dashboard/propostas/nova?requestId=${quoteRequest.id}&templateId=${template.id}`}
                      key={template.id}
                    >
                      {template.name}
                    </Link>
                  ))}
                  {selectedTemplate ? (
                    <Link
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                      href={`/dashboard/propostas/nova?requestId=${quoteRequest.id}`}
                    >
                      Limpar modelo
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
            <ProposalForm
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
          </>
        )}
      </section>
    </main>
  );
}
