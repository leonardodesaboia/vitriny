import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicServicesGrid } from "@/components/public/PublicServicesGrid";
import { prisma } from "@/lib/prisma";
import { getPublicThemePreset } from "@/lib/theme-presets";
import { getHowItWorksContent } from "@/lib/utils/how-it-works";
import { formatPhoneBR, phoneToTelHref, phoneToWhatsAppNumber } from "@/lib/utils/phone";

type PublicProviderProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const getProfile = cache(async (slug: string) => {
  return prisma.providerProfile.findUnique({
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
});

export async function generateMetadata({
  params
}: PublicProviderProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);

  if (!profile || !profile.isPublished) {
    return { robots: { index: false, follow: false } };
  }

  const title = `${profile.businessName} · OrçaFácil`;
  const description =
    profile.description ?? `Solicite um orçamento para ${profile.businessName}.`;
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website"
    },
    twitter: {
      card: "summary",
      title,
      description
    }
  };
}

export default async function PublicProviderProfilePage({
  params
}: PublicProviderProfilePageProps) {
  const { slug } = await params;

  const profile = await getProfile(slug);

  if (!profile || !profile.isPublished) notFound();

  const pixConfigured = !!(profile.pixKey && profile.pixHolderName && profile.pixCity);

  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const profilePhoneDisplay = formatPhoneBR(profile.phone);
  const whatsappNumber = profile.phone ? phoneToWhatsAppNumber(profile.phone) : null;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `Olá ${profile.businessName}, vi seu perfil no OrçaFácil e gostaria de solicitar um orçamento.`
      )}`
    : null;

  const contacts = [
    profilePhoneDisplay
      ? {
          label: "Telefone",
          value: profilePhoneDisplay,
          href: phoneToTelHref(profile.phone ?? ""),
          whatsappHref
        }
      : null,
    profile.email
      ? {
          label: "E-mail",
          value: profile.email,
          href: `mailto:${profile.email}`,
          whatsappHref: null
        }
      : null,
    location
      ? { label: "Localização", value: location, href: null, whatsappHref: null }
      : null
  ].filter(Boolean) as {
    label: string;
    value: string;
    href: string | null;
    whatsappHref: string | null;
  }[];

  const hasServices = profile.services.length > 0;
  const theme = getPublicThemePreset(profile.plan, profile.themePreset);
  const { title: howItWorksTitle, steps: howItWorksSteps } = getHowItWorksContent(
    profile.services
  );

  return (
    <main
      className="min-h-screen bg-paper text-ink font-jakarta"
      data-brand-theme={theme.id}
    >
      {/* Hero */}
      <div className="grain relative bg-leaf px-6 pb-16 pt-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Prestador de serviço{location ? ` · ${location}` : ""}
          </p>
          <h1 className="mt-3 break-words font-fraunces text-5xl font-bold leading-tight text-white md:text-6xl">
            {profile.businessName}
          </h1>
          {profile.description ? (
            <p className="mt-5 max-w-2xl break-words text-base leading-7 text-white/80">
              {profile.description}
            </p>
          ) : null}
          <Link
            href={`/u/${slug}/orcamento`}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-white px-6 text-sm font-semibold text-leaf transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-leaf"
          >
            Solicitar orçamento →
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
                  {c.whatsappHref ? (
                    <>
                      <p className="mt-1 text-sm font-semibold text-ink">{c.value}</p>
                      <div className="mt-3 flex gap-2">
                        <a
                          href={c.whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-8 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                        >
                          WhatsApp
                        </a>
                        {c.href ? (
                          <a
                            href={c.href}
                            className="inline-flex min-h-8 items-center justify-center rounded-md border border-paper-soft px-3 text-xs font-semibold text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                          >
                            Ligar
                          </a>
                        ) : null}
                      </div>
                    </>
                  ) : c.href ? (
                    <a
                      href={c.href}
                      className="mt-1 text-sm font-semibold text-leaf transition hover:underline"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <p className="mt-1 break-words text-sm font-semibold text-ink">
                      {c.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {/* Services */}
          <div className="mt-12">
            {hasServices ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
                  Serviços disponíveis
                </p>
                <h2 className="mt-2 font-fraunces text-3xl font-bold text-ink">
                  O que ofereço
                </h2>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
                  Orçamento personalizado
                </p>
                <h2 className="mt-2 font-fraunces text-3xl font-bold text-ink">
                  Solicite o que precisa
                </h2>
              </>
            )}
            <PublicServicesGrid
              services={profile.services.map((s) => ({
                ...s,
                basePrice: s.basePrice?.toString() ?? null,
                imageUrl: profile.plan === "PRO" ? (s.imageUrl ?? null) : null,
                pixConfigured
              }))}
              slug={slug}
            />
          </div>

          {/* How it works */}
          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
              Como funciona
            </p>
            <h2 className="mt-2 font-fraunces text-3xl font-bold text-ink">
              {howItWorksTitle}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {howItWorksSteps.map((s) => (
                <div
                  key={s.step}
                  className="rounded-xl border border-paper-soft bg-white p-5 shadow-card"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-mint text-sm font-bold text-leaf">
                    {s.step}
                  </span>
                  <h3 className="mt-3 line-clamp-2 break-words font-jakarta text-base font-bold text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 break-words text-sm leading-6 text-ink-muted">
                    {s.description}
                  </p>
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
    </main>
  );
}
