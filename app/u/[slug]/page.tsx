import { notFound } from "next/navigation";

import { PublicServicesGrid } from "@/components/public/PublicServicesGrid";
import { prisma } from "@/lib/prisma";
import { getPublicThemePreset } from "@/lib/theme-presets";
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
      plan: true,
      themePreset: true,
      pixKey: true,
      pixHolderName: true,
      pixCity: true,
      services: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
          pricingType: true,
          fixedServiceCheckoutMode: true,
          imageUrl: true
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
  const theme = getPublicThemePreset(profile.plan, profile.themePreset);

  return (
    <main className={`min-h-screen ${theme.page}`}>
      {/* Hero */}
      <div className={theme.hero}>
        <div className="mx-auto max-w-4xl">
          <p className={theme.heroEyebrow}>
            Prestador de serviço{location ? ` · ${location}` : ""}
          </p>
          <h1 className={theme.heroTitle}>
            {profile.businessName}
          </h1>
          {profile.description ? (
            <p className={theme.heroDescription}>
              {profile.description}
            </p>
          ) : null}
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
                className={theme.contactCard}
              >
                <p className={theme.contactLabel}>
                  {c.label}
                </p>
                {c.href ? (
                  <a
                    href={c.href}
                    className={theme.contactValue}
                  >
                    {c.value}
                  </a>
                ) : (
                  <p className={theme.serviceTitle}>{c.value}</p>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Services */}
        {hasServices ? (
          <div className="mt-12">
            <p className={theme.sectionEyebrow}>
              Serviços disponíveis
            </p>
            <h2 className={theme.sectionTitle}>
              O que ofereço
            </h2>
            <PublicServicesGrid
              services={profile.services.map((s) => ({
                ...s,
                basePrice: s.basePrice?.toString() ?? null,
                imageUrl: profile.plan === "PRO" ? (s.imageUrl ?? null) : null,
                pixConfigured:
                  !!(profile.pixKey && profile.pixHolderName && profile.pixCity)
              }))}
              slug={slug}
              theme={theme}
            />
          </div>
        ) : null}

                {/* How it works */}
        <div className="mt-12">
          <p className={theme.sectionEyebrow}>
            Como funciona
          </p>
          <h2 className={theme.sectionTitle}>
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
                className={theme.stepCard}
              >
                <span className={theme.stepMarker}>
                  {s.step}
                </span>
                <h3 className={`${theme.serviceTitle} mt-3`}>{s.title}</h3>
                <p className={theme.serviceDescription}>{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Powered by */}
        <p className={theme.poweredBy}>
          Powered by{" "}
          <span className="font-semibold text-ink-muted">OrçaFácil</span>
        </p>
      </div>
      </div>
    </main>
  );
}
