import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QuoteRequestList } from "@/components/quote-request/QuoteRequestList";
import { prisma } from "@/lib/prisma";

type RequestsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do pedido.",
  profile: "Crie o perfil do prestador antes de receber pedidos.",
  "not-found": "Pedido não encontrado."
};

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      quoteRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          service: {
            select: {
              id: true,
              name: true
            }
          },
          proposal: {
            select: { id: true, publicToken: true, status: true, depositAmount: true, depositPaidAt: true }
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              fromStatus: true,
              toStatus: true,
              actor: true,
              note: true,
              createdAt: true
            }
          },
          internalNotes: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      },
      services: { select: { id: true, name: true } }
    }
  });

  const totalRequests = profile?.quoteRequests.length ?? 0;
  const newRequests = profile?.quoteRequests.filter((r) => r.status === "NEW").length ?? 0;

  return (
    <div className="p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        Pedidos
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <h1 className="font-fraunces text-4xl font-bold text-ink">
          Pedidos recebidos
        </h1>
        {newRequests > 0 ? (
          <span className="mb-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            {newRequests} novo{newRequests > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-ink-muted">
        {totalRequests > 0
          ? `${totalRequests} pedido${totalRequests > 1 ? "s" : ""} recebido${totalRequests > 1 ? "s" : ""} no total.`
          : "Acompanhe os pedidos enviados pelo formulário público de orçamento."}
      </p>

      {params.error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessages[params.error] ?? "Não foi possível atualizar o pedido."}
        </p>
      ) : null}

      {!profile ? (
        <div className="mt-8 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
          <h2 className="font-fraunces text-xl font-bold text-ink">
            Crie seu perfil primeiro
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Pedidos ficam vinculados ao perfil do prestador.
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/perfil"
          >
            Criar perfil
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <QuoteRequestList
            quoteRequests={profile.quoteRequests}
            services={profile.services}
          />
        </div>
      )}
    </div>
  );
}
