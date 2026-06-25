import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicServicesGrid } from "@/components/public/PublicServicesGrid";
import { prisma } from "@/lib/prisma";
import { formatPhoneBR, phoneToTelHref } from "@/lib/utils/phone";

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
          basePrice: true,
          pricingType: true
        }
      }
    }
  });

  if (!profile || !profile.isPublished) notFound();

  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const profilePhoneDisplay = formatPhoneBR(profile.phone);

  const contacts = [
    profilePhoneDisplay
      ? {
          label: "Telefone",
          value: profilePhoneDisplay,
          href: phoneToTelHref(profile.phone ?? "")
        }
      : null,
    profile.email
      ? { label: "E-mail", value: profile.email, href: `mailto:${profile.email}` }
      : null,
    location ? { label: "Localização", value: location, href: null } : null
  ].filter(Boolean) as { label: string; value: string; href: string | null }[];

  const hasServices = profile.services.length > 0;

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Hero */}
      <div className="grain relative bg-leaf px-6 pb-16 pt-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Prestador de serviço{location ? ` · ${location}` : ""}
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
            className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-amber px-6 text-sm font-semibold text-white transition hover:bg-amber/90"
            href={`/u/${slug}/orcamento`}
          >
            Pedir orçamento grátis
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="px-6">
      <div className="mx-auto max-w-4xl pb-28 pt-10 sm:pb-16">
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
                {c.href ? (
                  <a
                    href={c.href}
                    className="mt-1 block text-sm font-semibold text-leaf transition hover:underline"
                  >
                    {c.value}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-ink">{c.value}</p>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Services */}
        {hasServices ? (
          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
              Serviços disponíveis
            </p>
            <h2 className="mt-2 font-fraunces text-3xl font-bold text-ink">
              O que ofereço
            </h2>
            <PublicServicesGrid
              services={profile.services.map((s) => ({
                ...s,
                basePrice: s.basePrice?.toString() ?? null
              }))}
              slug={slug}
            />
          </div>
        ) : null}

                {/* How it works */}
        <div className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            Como funciona
          </p>
          <h2 className="mt-2 font-fraunces text-3xl font-bold text-ink">
            Simples e rápido
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Preencha o formulário",
                description: "Conte o que você precisa em poucos campos. Leva menos de 2 minutos."
              },
              {
                step: "2",
                title: "Prestador avalia",
                description: "O prestador analisa seu pedido e prepara uma proposta personalizada."
              },
              {
                step: "3",
                title: "Receba a proposta",
                description: "Você recebe uma proposta com valor, prazo e condições para aprovar."
              }
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-xl border border-paper-soft bg-white p-5 shadow-card"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-mint text-sm font-bold text-leaf">
                  {s.step}
                </span>
                <h3 className="mt-3 text-sm font-bold text-ink">{s.title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Powered by */}
        <p className="mt-8 text-center text-xs text-ink-muted/60">
          Powered by{" "}
          <span className="font-semibold text-ink-muted">OrçaFácil</span>
        </p>
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
