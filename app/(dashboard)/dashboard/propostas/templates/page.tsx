import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ProposalTemplateForm } from "@/components/proposals/ProposalTemplateForm";
import { deleteProposalTemplate } from "@/lib/actions/proposal-templates";
import { prisma } from "@/lib/prisma";

type ProposalTemplatesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do modelo.",
  profile: "Crie o perfil do prestador antes de criar modelos.",
  "not-found": "Modelo nao encontrado."
};

export default async function ProposalTemplatesPage({
  searchParams
}: ProposalTemplatesPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
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

  return (
    <div className="p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        Modelos
      </p>
      <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
        Templates de proposta
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Crie modelos reutilizaveis para propostas comuns.
      </p>

      {params.error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessages[params.error] ?? "Nao foi possivel salvar o modelo."}
        </p>
      ) : null}

      {!profile ? (
        <div className="mt-8 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
          <h2 className="font-fraunces text-xl font-bold text-ink">
            Crie seu perfil primeiro
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Templates ficam vinculados ao perfil do prestador.
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/perfil"
          >
            Criar perfil
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8">
          <section>
            <h2 className="font-fraunces text-2xl font-bold text-ink">
              Novo modelo
            </h2>
            <div className="mt-4">
              <ProposalTemplateForm />
            </div>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-bold text-ink">
              Modelos salvos
            </h2>
            {profile.proposalTemplates.length === 0 ? (
              <div className="mt-4 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
                <p className="text-sm text-ink-muted">
                  Nenhum modelo de proposta criado ainda.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-5">
                {profile.proposalTemplates.map((template) => (
                  <article className="grid gap-4" key={template.id}>
                    <div className="flex flex-col gap-3 rounded-xl border border-paper-soft bg-white p-5 shadow-card">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-fraunces text-xl font-bold text-ink">
                            {template.name}
                          </h3>
                          <p className="mt-1 text-sm text-ink-muted">
                            {template.items.length} item(ns)
                          </p>
                        </div>
                        <form action={deleteProposalTemplate}>
                          <input name="templateId" type="hidden" value={template.id} />
                          <button
                            className="inline-flex min-h-9 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-700 transition hover:border-red-300"
                            type="submit"
                          >
                            Excluir
                          </button>
                        </form>
                      </div>
                      <ProposalTemplateForm template={template} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
