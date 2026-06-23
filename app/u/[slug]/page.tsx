import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicServicesGrid } from "@/components/public/PublicServicesGrid";
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
    where: { slug },
    select: {
      businessName: true,
      description: true,
      phone: true,
      email: true,
      city: true,
      state: true,
      isPublished: true,
      services: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true
        }
      }
    }
  });

  if (!profile || !profile.isPublished) notFound();

  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const contacts = [
    profile.phone ? { label: "Telefone", value: profile.phone } : null,
    profile.email ? { label: "E-mail", value: profile.email } : null,
    location ? { label: "Localização", value: location } : null
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Hero */}
      <div className="grain relative bg-leaf px-6 pb-16 pt-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Prestador de serviço
          </p>
          <h1 className="mt-3 font-fraunces text-5xl font-bold leading-tight text-white md:text-6xl">
            {profile.businessName}
          </h1>
          {profile.description ? (
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/80">
              {profile.description}
            </p>
          ) : null}
          <Link
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-md bg-amber px-6 text-sm font-semibold text-white transition hover:bg-amber/90"
            href={`/u/${slug}/orcamento`}
          >
            Pedir orçamento
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 pb-28 pt-10 sm:pb-16">
        {/* Contact cards */}
        {contacts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {contacts.map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-paper-soft bg-white p-4 shadow-card"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  {c.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">{c.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Services */}
        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            Serviços disponíveis
          </p>
          <h2 className="mt-2 font-fraunces text-3xl font-bold text-ink">
            O que ofereço
          </h2>
          <PublicServicesGrid services={profile.services} slug={slug} />
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-paper-soft bg-white/90 px-6 py-4 backdrop-blur-sm sm:hidden">
        <Link
          className="block w-full rounded-md bg-leaf py-3 text-center text-sm font-semibold text-white transition hover:bg-leaf-hover"
          href={`/u/${slug}/orcamento`}
        >
          Pedir orçamento
        </Link>
      </div>
    </main>
  );
}
