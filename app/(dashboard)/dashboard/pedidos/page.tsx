import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { QuoteRequestList } from "@/components/quote-request/QuoteRequestList";
import { prisma } from "@/lib/prisma";

type RequestsPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
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
    where: {
      userId: session.user.id
    },
    include: {
      quoteRequests: {
        orderBy: {
          createdAt: "desc"
        },
        include: {
          proposal: {
            select: {
              publicToken: true
            }
          }
        }
      },
      services: {
        select: {
          id: true,
          name: true
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
          Pedidos
        </p>
        <h1 className="mt-3 text-3xl font-bold">Pedidos recebidos</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">
          Acompanhe os pedidos enviados pelo formulário público de orçamento.
        </p>

        {params.error ? (
          <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessages[params.error] ?? "Não foi possível atualizar o pedido."}
          </p>
        ) : null}

        {!profile ? (
          <div className="mt-8 rounded-lg border border-stone-200 bg-paper p-5">
            <h2 className="text-xl font-bold text-ink">Crie seu perfil primeiro</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Pedidos ficam vinculados ao perfil do prestador. Crie o perfil
              antes de receber pedidos.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443]"
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
      </section>
    </main>
  );
}
