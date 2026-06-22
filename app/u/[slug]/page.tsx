import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

type PublicProviderProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

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
      isPublished: true
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

        <div className="mt-10 border-t border-stone-200 pt-6">
          <span className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white">
            Pedir orçamento
          </span>
          <p className="mt-3 text-sm text-stone-600">
            O formulário de pedido será habilitado em uma próxima etapa.
          </p>
        </div>
      </section>
    </main>
  );
}
