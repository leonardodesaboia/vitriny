import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

type PublicProviderProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatMoney(value: { toString: () => string }) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value.toString()));
}

export default async function PublicProviderProfilePage({
  params
}: PublicProviderProfilePageProps) {
  const { slug } = await params;

  const profile = await prisma.providerProfile.findUnique({
    where: {
      slug
    },
    select: {
      businessName: true,
      description: true,
      phone: true,
      email: true,
      city: true,
      state: true,
      isPublished: true,
      services: {
        where: {
          isActive: true
        },
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true
        }
      }
    }
  });

  if (!profile || !profile.isPublished) {
    notFound();
  }

  const location = [profile.city, profile.state].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <section className="mx-auto max-w-4xl rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-leaf">
          Prestador de serviço
        </p>
        <h1 className="mt-3 text-4xl font-bold">{profile.businessName}</h1>

        {profile.description ? (
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700">
            {profile.description}
          </p>
        ) : null}

        <dl className="mt-8 grid gap-5 md:grid-cols-2">
          {profile.phone ? (
            <div className="rounded-lg border border-stone-200 bg-paper p-5">
              <dt className="text-sm font-semibold text-stone-500">Telefone</dt>
              <dd className="mt-2 text-base font-semibold text-ink">
                {profile.phone}
              </dd>
            </div>
          ) : null}

          {profile.email ? (
            <div className="rounded-lg border border-stone-200 bg-paper p-5">
              <dt className="text-sm font-semibold text-stone-500">E-mail</dt>
              <dd className="mt-2 text-base font-semibold text-ink">
                {profile.email}
              </dd>
            </div>
          ) : null}

          {location ? (
            <div className="rounded-lg border border-stone-200 bg-paper p-5">
              <dt className="text-sm font-semibold text-stone-500">Localização</dt>
              <dd className="mt-2 text-base font-semibold text-ink">
                {location}
              </dd>
            </div>
          ) : null}
        </dl>

        <section className="mt-10 border-t border-stone-200 pt-8">
          <h2 className="text-2xl font-bold text-ink">Serviços</h2>
          {profile.services.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {profile.services.map((service) => (
                <article
                  className="rounded-lg border border-stone-200 bg-paper p-5"
                  key={service.id}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-ink">{service.name}</h3>
                      {service.description ? (
                        <p className="mt-2 text-sm leading-6 text-stone-700">
                          {service.description}
                        </p>
                      ) : null}
                      {service.basePrice ? (
                        <p className="mt-3 text-sm font-semibold text-leaf">
                          A partir de {formatMoney(service.basePrice)}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
                      href={`/u/${slug}/orcamento?serviceId=${service.id}`}
                    >
                      Pedir orçamento deste serviço
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-stone-200 bg-paper p-5">
              <p className="text-sm leading-6 text-stone-700">
                Este prestador ainda não possui serviços ativos publicados.
              </p>
            </div>
          )}
        </section>

        <div className="mt-10 border-t border-stone-200 pt-6">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443]"
            href={`/u/${slug}/orcamento`}
          >
            Pedir orçamento
          </Link>
          <p className="mt-3 text-sm text-stone-600">
            Envie as informações iniciais para o prestador avaliar seu pedido.
          </p>
        </div>
      </section>
    </main>
  );
}
