import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OpenNowBadge } from "@/components/public/OpenNowBadge";
import { PoweredByVitriny } from "@/components/public/PoweredByVitriny";
import { PublicServicesGrid } from "@/components/public/PublicServicesGrid";
import { StorefrontViewBeacon } from "@/components/public/StorefrontViewBeacon";
import { canUseServiceImages } from "@/lib/plan-limits";
import { formatWeek, parseBusinessHours } from "@/lib/business-hours";
import { prisma } from "@/lib/prisma";
import { parseProfileLinks } from "@/lib/profile-links";
import { normalizeSocialUrl, SOCIAL_LABELS } from "@/lib/social-links";
import { getBrandAppearance } from "@/lib/brand-appearance";
import { buildStorefrontSeo } from "@/lib/seo/storefront-metadata";
import { hasSufficientStorefrontContent } from "@/lib/seo/storefront-content";
import {
  buildBreadcrumbJsonLd,
  buildStorefrontJsonLd,
} from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  formatPhoneBR,
  phoneToTelHref,
  phoneToWhatsAppNumber,
} from "@/lib/utils/phone";

type PublicProviderProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

const getProfile = cache(async (slug: string) => {
  return prisma.providerProfile.findUnique({
    where: { slug },
    select: {
      businessName: true,
      businessType: true,
      description: true,
      phone: true,
      email: true,
      city: true,
      state: true,
      address: true,
      instagram: true,
      facebook: true,
      tiktok: true,
      links: true,
      businessHours: true,
      isPublished: true,
      plan: true,
      brandColor: true,
      brandFont: true,
      services: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          itemType: true,
          basePrice: true,
          pricingType: true,
          fixedServiceCheckoutMode: true,
          imageUrl: true,
        },
      },
    },
  });
});

export async function generateMetadata({
  params,
}: PublicProviderProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);

  if (!profile || !profile.isPublished) {
    return { robots: { index: false, follow: false } };
  }

  const { title, description } = buildStorefrontSeo({
    businessName: profile.businessName,
    businessType: profile.businessType,
    description: profile.description,
    city: profile.city,
    state: profile.state,
  });
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${slug}`;

  // Vitrine publicada porém sem conteúdo suficiente renderiza (200) mas não é
  // indexada — evita thin content no índice. Mesma regra do sitemap.
  const sufficient = hasSufficientStorefrontContent({
    activeItemCount: profile.services.length,
    description: profile.description,
    city: profile.city,
    state: profile.state,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
  });

  return {
    // `absolute` evita que o template do root ("%s · Vitriny") duplique a marca.
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: sufficient ? undefined : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url,
      siteName: "Vitriny",
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${className} fill-current`}
    >
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.86 9.86 0 0 0 4.73 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.06 8.06 0 0 1 2.37 5.73c0 4.46-3.63 8.09-8.1 8.09a8.1 8.1 0 0 1-4.12-1.13l-.3-.18-3.06.8.82-2.99-.19-.31a8.03 8.03 0 0 1-1.24-4.28c0-4.47 3.64-8.1 8.1-8.1Zm4.68 10.24c-.25-.13-1.5-.74-1.73-.82-.23-.09-.4-.13-.57.13-.17.25-.65.82-.8.99-.15.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.66-1.25-1.48-1.4-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.57-1.37-.78-1.87-.2-.49-.41-.42-.57-.43l-.48-.01c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.43 1.03 2.6.13.17 1.77 2.7 4.29 3.79.6.26 1.06.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.11-.23-.17-.48-.3Z" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default async function PublicProviderProfilePage({
  params,
}: PublicProviderProfilePageProps) {
  const { slug } = await params;

  const profile = await getProfile(slug);

  if (!profile || !profile.isPublished) notFound();

  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  // Rótulo do catálogo conforme o tipo do negócio. Ver docs/UX_UI_AUDIT.md P12.
  const catalogLabel =
    profile.businessType === "PRODUCTS"
      ? "Produtos"
      : profile.businessType === "SERVICES"
        ? "Serviços"
        : "Produtos e serviços";
  const locationDisplay = [profile.address, location]
    .filter(Boolean)
    .join(" · ");

  const hours = parseBusinessHours(profile.businessHours);

  const mapsQuery = [profile.address, profile.city, profile.state]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null;

  const socialLinks = (
    [
      ["instagram", profile.instagram],
      ["facebook", profile.facebook],
      ["tiktok", profile.tiktok],
    ] as const
  ).flatMap(([network, value]) => {
    if (!value) return [];
    const href = normalizeSocialUrl(network, value);
    return href ? [{ network, label: SOCIAL_LABELS[network], href }] : [];
  });

  const customLinks = parseProfileLinks(profile.links);

  const profilePhoneDisplay = formatPhoneBR(profile.phone);
  const whatsappNumber = profile.phone
    ? phoneToWhatsAppNumber(profile.phone)
    : null;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `Olá ${profile.businessName}, vi sua vitrine no Vitriny e gostaria de pedir mais detalhes.`,
      )}`
    : null;

  const contacts = [
    profilePhoneDisplay
      ? {
          label: "Telefone",
          value: profilePhoneDisplay,
          href: phoneToTelHref(profile.phone ?? ""),
          whatsappHref,
        }
      : null,
    profile.email
      ? {
          label: "E-mail",
          value: profile.email,
          href: `mailto:${profile.email}`,
          whatsappHref: null,
        }
      : null,
  ].filter(Boolean) as {
    label: string;
    value: string;
    href: string | null;
    whatsappHref: string | null;
  }[];

  const appearance = getBrandAppearance(
    profile.plan,
    profile.brandColor,
    profile.brandFont,
  );

  const allLinks = [
    ...socialLinks.map((link) => ({ key: link.network, label: link.label, href: link.href, nofollow: false })),
    ...customLinks.map((link, index) => ({ key: `custom-${index}`, label: link.label, href: link.url, nofollow: true })),
  ];

  const phoneContact = contacts.find((c) => c.label === "Telefone") ?? null;
  const emailContact = contacts.find((c) => c.label === "E-mail") ?? null;
  const hasBusinessInfo = Boolean(locationDisplay || hours || allLinks.length > 0);

  // Dados estruturados — refletem só o que a vitrine já mostra (telefone,
  // endereço, redes e catálogo entram apenas quando publicados).
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const canonicalUrl = `${baseUrl}/u/${slug}`;
  const storefrontJsonLd = buildStorefrontJsonLd({
    businessName: profile.businessName,
    businessType: profile.businessType,
    url: canonicalUrl,
    description: profile.description,
    city: profile.city,
    state: profile.state,
    address: profile.address,
    phone: profile.phone,
    sameAs: socialLinks.map((link) => link.href),
    items: profile.services.map((service) => ({
      name: service.name,
      itemType: service.itemType,
    })),
    image: canUseServiceImages(profile.plan)
      ? (profile.services.find((service) => service.imageUrl)?.imageUrl ?? null)
      : null,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd({
    businessName: profile.businessName,
    url: canonicalUrl,
    baseUrl,
  });

  return (
    <main
      className="min-h-screen bg-paper text-ink font-jakarta"
      data-brand-color={appearance.color}
      data-brand-font={appearance.font}
    >
      <StorefrontViewBeacon slug={slug} />
      <JsonLd data={[storefrontJsonLd, breadcrumbJsonLd]} />

      {/* Hero — masthead com hierarquia em tiers:
          1) identidade (nome) + utilitário (info) · 2) meta (oferta · local · status)
          · 3) descrição · 4) ação. O espaçamento cresce entre tiers para separar
          os pensamentos; a meta fica tight sob o nome. */}
      <header className="grain relative overflow-hidden bg-leaf px-5 pb-10 pt-14 sm:px-6 sm:pb-16 sm:pt-16">
        <div className="relative mx-auto max-w-3xl">
          {/* Tier 1 — identidade + utilitário no canto (equilibra a composição) */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="min-w-0 break-words font-fraunces text-[2.85rem] font-bold leading-[0.98] tracking-[-0.02em] text-white sm:text-[4.25rem]">
              {profile.businessName}
            </h1>
            {hasBusinessInfo ? (
              <a
                aria-label="Ver endereço e horários"
                href="#informacoes"
                className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 text-white transition hover:bg-white hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-leaf sm:h-11 sm:w-11"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5" strokeLinecap="round" />
                  <path d="M12 8h.01" strokeLinecap="round" strokeWidth="3" />
                </svg>
              </a>
            ) : null}
          </div>

          {/* Tier 2 — meta: oferta · local + status, agrupados e tight ao nome */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <p className="min-w-0 break-words font-medium text-white/80">
              {catalogLabel}
              {location ? (
                <span className="text-white/60"> · {location}</span>
              ) : null}
            </p>
            {hours ? (
              <span aria-hidden="true" className="h-3.5 w-px bg-white/25" />
            ) : null}
            <OpenNowBadge businessHours={profile.businessHours} />
          </div>

          {/* Tier 3 — descrição (gap maior: outro pensamento) */}
          {profile.description ? (
            <p className="mt-6 max-w-xl break-words text-[0.95rem] leading-7 text-white/85">
              {profile.description}
            </p>
          ) : null}

          {/* Tier 4 — ação */}
          {!whatsappHref && contacts.length > 0 ? (
            <a
              href="#contato"
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-leaf transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-leaf"
            >
              Ver contato ↓
            </a>
          ) : null}
        </div>
      </header>

      <div className="px-5 sm:px-6">
        <div className="mx-auto max-w-3xl pb-20 pt-8 sm:pt-8">
          {/* Produtos — primeiro conteúdo: é o que o cliente veio ver */}
          <section id="itens" className="scroll-mt-6">
            <h2 className="font-fraunces text-3xl font-bold tracking-[-0.01em] text-ink sm:text-4xl">
              O que ofereço
            </h2>
            <PublicServicesGrid
              services={profile.services.map((s) => ({
                ...s,
                basePrice: s.basePrice?.toString() ?? null,
                imageUrl: canUseServiceImages(profile.plan)
                  ? (s.imageUrl ?? null)
                  : null,
              }))}
              slug={slug}
            />
          </section>

          {/* Falar direto com o negócio — segunda ação mais importante */}
          {contacts.length > 0 ? (
            <section id="contato" className="mt-14 scroll-mt-6">
              <h2 className="font-fraunces text-xl font-bold text-ink sm:text-2xl">
                Fale com o negócio
              </h2>
              <div
                className={`mt-4 grid gap-2.5 ${contacts.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
              >
                {phoneContact?.href ? (
                  <a
                    href={phoneContact.href}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-paper-soft bg-white px-4 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                  >
                    Ligar
                  </a>
                ) : null}
                {emailContact?.href ? (
                  <a
                    href={emailContact.href}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-paper-soft bg-white px-4 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                  >
                    Enviar e-mail
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}

          <div id="informacoes" className="scroll-mt-6">
            {/* Identidade secundária — divulgação progressiva, fora do caminho */}
            {locationDisplay || hours ? (
            <details className="group mt-10 border-t border-paper-soft">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-4 text-ink [&::-webkit-details-marker]:hidden">
                <span className="font-fraunces text-lg font-bold">
                  Endereço e horários
                </span>
                <Chevron />
              </summary>
              <div className="grid gap-5 pb-5">
                {locationDisplay ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="break-words text-sm text-ink">
                      {locationDisplay}
                    </p>
                    {mapsUrl ? (
                      <a
                        className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-paper-soft bg-white px-3 text-xs font-semibold text-leaf transition hover:border-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 sm:w-auto"
                        href={mapsUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Ver no mapa ↗
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {hours ? (
                  <dl className="grid gap-1.5 sm:grid-cols-2 sm:gap-x-10">
                    {formatWeek(hours).map((entry) => (
                      <div
                        className="flex items-baseline justify-between gap-4 text-sm"
                        key={entry.day}
                      >
                        <dt className="text-ink-muted">{entry.day}</dt>
                        <dd className="font-semibold text-ink">{entry.label}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            </details>
            ) : null}

            {allLinks.length > 0 ? (
            <details className="group border-t border-paper-soft">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-4 text-ink [&::-webkit-details-marker]:hidden">
                <span className="font-fraunces text-lg font-bold">
                  Redes e links
                </span>
                <Chevron />
              </summary>
              <div className="flex flex-wrap gap-2 pb-5">
                {allLinks.map((link) => (
                  <a
                    className="inline-flex min-h-9 items-center justify-center rounded-full border border-paper-soft bg-white px-3.5 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                    href={link.href}
                    key={link.key}
                    rel={
                      link.nofollow
                        ? "noopener noreferrer nofollow"
                        : "noopener noreferrer"
                    }
                    target="_blank"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            </details>
            ) : null}
          </div>

          <PoweredByVitriny />
        </div>
      </div>

      {/* Ação persistente: alcançável de qualquer ponto de um catálogo longo */}
      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-leaf text-white shadow-[0_8px_24px_rgba(27,94,59,0.35)] transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      ) : null}
    </main>
  );
}
