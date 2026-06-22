import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteRequestForm } from "@/components/quote-request/QuoteRequestForm";
import { prisma } from "@/lib/prisma";

type PublicQuoteRequestPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    error?: string;
    serviceId?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do pedido.",
  service: "O serviço selecionado não está disponível.",
  unavailable: "Este perfil não está disponível para pedidos."
};

export default async function PublicQuoteRequestPage({
  params,
  searchParams
}: PublicQuoteRequestPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const profile = await prisma.providerProfile.findUnique({
    where: {
      slug
    },
    select: {
      businessName: true,
      isPublished: true,
      services: {
        where: {
          isActive: true
        },
        orderBy: {
          name: "asc"
        },
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!profile || !profile.isPublished) {
    notFound();
  }

  const selectedServiceId = profile.services.some(
    (service) => service.id === query.serviceId
  )
    ? query.serviceId
    : null;

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <section className="mx-auto max-w-3xl rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <Link className="text-sm font-semibold text-leaf" href={`/u/${slug}`}>
          Voltar ao perfil
        </Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-leaf">
          Pedido de orçamento
        </p>
        <h1 className="mt-3 text-3xl font-bold">{profile.businessName}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">
          Envie as informações iniciais para que o prestador avalie seu pedido.
        </p>

        {query.success ? (
          <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-5">
            <h2 className="text-lg font-bold text-green-800">Pedido enviado</h2>
            <p className="mt-2 text-sm leading-6 text-green-700">
              Seu pedido foi registrado. O prestador poderá avaliar as
              informações e retornar pelo contato informado.
            </p>
          </div>
        ) : (
          <>
            {query.error ? (
              <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessages[query.error] ?? "Não foi possível enviar o pedido."}
              </p>
            ) : null}
            <QuoteRequestForm
              selectedServiceId={selectedServiceId}
              services={profile.services}
              slug={slug}
            />
          </>
        )}
      </section>
    </main>
  );
}
