# Etapa 3 — Perfil público, conversão e SEO: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `/u/[slug]` em página comercial completa com CTAs em todos os estados, contato via WhatsApp, "Como funciona" condicional por tipo de serviço, SEO/Open Graph e acessibilidade básica.

**Architecture:** Extrair a lógica de seleção dos steps "Como funciona" para `lib/utils/how-it-works.ts` (função pura testável). Todos os demais changes são edições diretas nos 3 arquivos existentes — sem novos componentes, sem migration.

**Tech Stack:** Next.js App Router, React `cache()`, framer-motion `useReducedMotion`, Vitest (testes unitários), Tailwind CSS.

---

## Mapa de arquivos

| Arquivo                                         | O que muda                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `lib/utils/how-it-works.ts`                     | **Novo.** Função pura `getHowItWorksContent(services)` → `{ title, steps }`                              |
| `tests/unit/utils/how-it-works.test.ts`         | **Novo.** Testes unitários dos 4 casos da função                                                         |
| `app/u/[slug]/page.tsx`                         | Hero CTA · WhatsApp no card de telefone · "Como funciona" condicional · `generateMetadata` com `cache()` |
| `app/u/[slug]/orcamento/page.tsx`               | `aria-live="polite"` no bloco de sucesso                                                                 |
| `components/public/PublicServicesGrid.tsx`      | Estado vazio com CTA · CTA de fallback pós-grid · `useReducedMotion`                                     |
| `components/quote-request/QuoteRequestForm.tsx` | `role="alert"` no `<p>` de erro                                                                          |

---

## Task 1: Função "Como funciona" + testes

**Files:**

- Create: `lib/utils/how-it-works.ts`
- Create: `tests/unit/utils/how-it-works.test.ts`

- [ ] **Step 1.1: Escrever o teste**

```typescript
// tests/unit/utils/how-it-works.test.ts
import { describe, expect, it } from "vitest";
import { getHowItWorksContent } from "@/lib/utils/how-it-works";

describe("getHowItWorksContent", () => {
  it("retorna fluxo CUSTOM quando não há serviços", () => {
    const { title, steps } = getHowItWorksContent([]);
    expect(title).toBe("Simples e rápido");
    expect(steps[0].title).toBe("Preencha o formulário");
    expect(steps[1].title).toBe("Prestador avalia");
    expect(steps[2].title).toBe("Receba a proposta");
  });

  it("retorna fluxo CUSTOM quando há apenas serviços CUSTOM", () => {
    const { title, steps } = getHowItWorksContent([
      { pricingType: "CUSTOM", fixedServiceCheckoutMode: null },
    ]);
    expect(title).toBe("Simples e rápido");
    expect(steps[0].title).toBe("Preencha o formulário");
  });

  it("retorna fluxo FIXED quando há apenas FIXED/REQUEST_ONLY", () => {
    const { title, steps } = getHowItWorksContent([
      { pricingType: "FIXED", fixedServiceCheckoutMode: "REQUEST_ONLY" },
    ]);
    expect(title).toBe("Simples e rápido");
    expect(steps[0].title).toBe("Escolha o serviço");
    expect(steps[2].title).toBe("Prestador entra em contato");
  });

  it("retorna fluxo PIX quando há apenas FIXED/ALLOW_PIX_RESERVATION", () => {
    const { title, steps } = getHowItWorksContent([
      {
        pricingType: "FIXED",
        fixedServiceCheckoutMode: "ALLOW_PIX_RESERVATION",
      },
    ]);
    expect(title).toBe("Simples e rápido");
    expect(steps[0].title).toBe("Preencha seus dados");
    expect(steps[1].title).toBe("Realize o pagamento Pix");
    expect(steps[2].title).toBe("Confirmação manual");
  });

  it("retorna fluxo MISTO quando há CUSTOM e FIXED", () => {
    const { title, steps } = getHowItWorksContent([
      { pricingType: "CUSTOM", fixedServiceCheckoutMode: null },
      { pricingType: "FIXED", fixedServiceCheckoutMode: "REQUEST_ONLY" },
    ]);
    expect(title).toBe("Serviços fixos e sob orçamento");
    expect(steps[0].title).toBe("Escolha ou descreva");
    expect(steps[2].title).toBe("Receba o retorno");
  });

  it("retorna fluxo FIXED (não PIX) para perfil com ambos os modos FIXED", () => {
    const { title, steps } = getHowItWorksContent([
      { pricingType: "FIXED", fixedServiceCheckoutMode: "REQUEST_ONLY" },
      {
        pricingType: "FIXED",
        fixedServiceCheckoutMode: "ALLOW_PIX_RESERVATION",
      },
    ]);
    expect(title).toBe("Simples e rápido");
    expect(steps[0].title).toBe("Escolha o serviço");
  });
});
```

- [ ] **Step 1.2: Rodar o teste para confirmar que falha**

```bash
npm test tests/unit/utils/how-it-works.test.ts
```

Esperado: FAIL com `Cannot find module '@/lib/utils/how-it-works'`.

- [ ] **Step 1.3: Criar a implementação**

```typescript
// lib/utils/how-it-works.ts

type ServiceInput = {
  pricingType: "FIXED" | "CUSTOM";
  fixedServiceCheckoutMode:
    | "REQUEST_ONLY"
    | "ALLOW_PIX_RESERVATION"
    | null
    | undefined;
};

type Step = {
  step: string;
  title: string;
  description: string;
};

export function getHowItWorksContent(services: ServiceInput[]): {
  title: string;
  steps: Step[];
} {
  const hasCustom = services.some((s) => s.pricingType === "CUSTOM");
  const hasFixed = services.some((s) => s.pricingType === "FIXED");
  const hasPixRequired = services.some(
    (s) =>
      s.pricingType === "FIXED" &&
      s.fixedServiceCheckoutMode === "ALLOW_PIX_RESERVATION",
  );
  const hasRequestOnly = services.some(
    (s) =>
      s.pricingType === "FIXED" &&
      s.fixedServiceCheckoutMode === "REQUEST_ONLY",
  );

  if (hasCustom && hasFixed) {
    return {
      title: "Serviços fixos e sob orçamento",
      steps: [
        {
          step: "1",
          title: "Escolha ou descreva",
          description:
            "Selecione um serviço da lista ou descreva livremente o que precisa.",
        },
        {
          step: "2",
          title: "Prestador avalia",
          description:
            "O prestador analisa e confirma disponibilidade ou prepara uma proposta.",
        },
        {
          step: "3",
          title: "Receba o retorno",
          description: "Você é contactado com as próximas etapas.",
        },
      ],
    };
  }

  if (hasFixed && hasPixRequired && !hasRequestOnly) {
    return {
      title: "Simples e rápido",
      steps: [
        {
          step: "1",
          title: "Preencha seus dados",
          description: "Informe nome e contato para continuar.",
        },
        {
          step: "2",
          title: "Realize o pagamento Pix",
          description: "O pagamento é exigido para confirmar o pedido.",
        },
        {
          step: "3",
          title: "Confirmação manual",
          description:
            "O prestador confirma o recebimento e finaliza o agendamento.",
        },
      ],
    };
  }

  if (hasFixed) {
    return {
      title: "Simples e rápido",
      steps: [
        {
          step: "1",
          title: "Escolha o serviço",
          description: "Selecione o serviço desejado e preencha seus dados.",
        },
        {
          step: "2",
          title: "Prestador avalia",
          description:
            "O prestador analisa a solicitação e confirma disponibilidade.",
        },
        {
          step: "3",
          title: "Prestador entra em contato",
          description: "Você recebe o retorno pelo contato informado.",
        },
      ],
    };
  }

  return {
    title: "Simples e rápido",
    steps: [
      {
        step: "1",
        title: "Preencha o formulário",
        description:
          "Conte o que você precisa em poucos campos. Leva menos de 2 minutos.",
      },
      {
        step: "2",
        title: "Prestador avalia",
        description:
          "O prestador analisa seu pedido e prepara uma proposta personalizada.",
      },
      {
        step: "3",
        title: "Receba a proposta",
        description:
          "Você recebe uma proposta com valor, prazo e condições para aprovar.",
      },
    ],
  };
}
```

- [ ] **Step 1.4: Rodar os testes para confirmar que passam**

```bash
npm test tests/unit/utils/how-it-works.test.ts
```

Esperado: 6 testes PASS.

- [ ] **Step 1.5: Commit**

```bash
git add lib/utils/how-it-works.ts tests/unit/utils/how-it-works.test.ts
git commit -m "feat(profile): adiciona utilitário de steps Como Funciona com testes"
```

---

## Task 2: PublicServicesGrid — estado vazio, fallback CTA, useReducedMotion

**Files:**

- Modify: `components/public/PublicServicesGrid.tsx`

- [ ] **Step 2.1: Substituir o arquivo pelo código atualizado**

O arquivo atual tem 123 linhas. Substituir pelo conteúdo abaixo (mudanças: `useReducedMotion`, variantes dinâmicas, estado vazio com CTA, fragment com fallback CTA após grid):

```typescript
"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import type { PublicService } from "@/types";

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value));
}

export function PublicServicesGrid({
  services,
  slug
}: {
  services: PublicService[];
  slug: string;
}) {
  const reducedMotion = useReducedMotion();

  const container = reducedMotion
    ? {}
    : {
        hidden: {},
        show: { transition: { staggerChildren: 0.09 } }
      };

  const item = reducedMotion
    ? {}
    : {
        hidden: { opacity: 0, y: 20 },
        show: {
          opacity: 1,
          y: 0,
          transition: { type: "spring" as const, stiffness: 280, damping: 28 }
        }
      };

  if (services.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-paper-soft bg-white p-8 shadow-card">
        <p className="font-fraunces text-lg font-bold text-ink">
          Serviços personalizados
        </p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Este prestador aceita solicitações personalizadas. Descreva o que você
          precisa e ele entrará em contato com uma proposta.
        </p>
        <Link
          href={`/u/${slug}/orcamento`}
          className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
        >
          Solicitar orçamento →
        </Link>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="mt-6 grid gap-4 sm:grid-cols-2"
        initial={reducedMotion ? undefined : "hidden"}
        whileInView={reducedMotion ? undefined : "show"}
        viewport={{ once: true, amount: 0.1 }}
        variants={container}
      >
        {services.map((service) => (
          <motion.article
            key={service.id}
            variants={item}
            className="group flex flex-col overflow-hidden rounded-xl border border-paper-soft bg-white shadow-card transition-shadow hover:shadow-card-hover"
          >
            {service.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={service.name}
                className="h-44 w-full object-cover"
                loading="lazy"
                src={service.imageUrl}
              />
            ) : null}

            <div className="flex flex-1 flex-col p-6">
              <h3 className="line-clamp-2 break-words font-jakarta text-base font-bold text-ink">
                {service.name}
              </h3>
              {service.description ? (
                <p className="mt-2 line-clamp-3 flex-1 break-words text-sm leading-6 text-ink-muted">
                  {service.description}
                </p>
              ) : (
                <div className="flex-1" />
              )}
              {service.basePrice ? (
                service.pricingType === "FIXED" ? (
                  <p className="mt-3 font-fraunces text-lg font-bold text-ink">
                    {formatMoney(service.basePrice)}
                  </p>
                ) : (
                  <p className="mt-3 font-fraunces text-lg font-bold text-ink">
                    A partir de {formatMoney(service.basePrice)}
                  </p>
                )
              ) : (
                <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
                  Sob orçamento
                </p>
              )}
              {service.pricingType === "FIXED" &&
              service.fixedServiceCheckoutMode === "ALLOW_PIX_RESERVATION" ? (
                service.pixConfigured ? (
                  <Link
                    href={`/u/${slug}/orcamento?serviceId=${service.id}&modo=pagamento`}
                    className="mt-4 inline-flex min-h-9 w-fit flex-none items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition-colors hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                  >
                    Pagar com Pix →
                  </Link>
                ) : (
                  <span className="mt-4 inline-flex min-h-9 w-fit items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink-muted">
                    Pagamento temporariamente indisponível
                  </span>
                )
              ) : (
                <Link
                  href={`/u/${slug}/orcamento?serviceId=${service.id}`}
                  className="mt-4 inline-flex min-h-9 w-fit flex-none items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition-colors hover:border-leaf hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
                >
                  {service.pricingType === "FIXED"
                    ? "Solicitar serviço →"
                    : "Pedir orçamento →"}
                </Link>
              )}
            </div>
          </motion.article>
        ))}
      </motion.div>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Não encontrou o que procura?{" "}
        <Link
          href={`/u/${slug}/orcamento`}
          className="font-semibold text-leaf transition hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          Envie sua solicitação →
        </Link>
      </p>
    </>
  );
}
```

- [ ] **Step 2.2: Verificar build sem erros de TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros relacionados a `PublicServicesGrid`.

- [ ] **Step 2.3: Commit**

```bash
git add components/public/PublicServicesGrid.tsx
git commit -m "feat(profile): estado vazio com CTA, fallback pós-grid e prefers-reduced-motion"
```

---

## Task 3: page.tsx — hero CTA, WhatsApp no card, "Como funciona" condicional, generateMetadata

**Files:**

- Modify: `app/u/[slug]/page.tsx`

Esta task edita `page.tsx` de uma vez, cobrindo todos os changes da página principal. Substituir o conteúdo do arquivo pelo código abaixo.

- [ ] **Step 3.1: Substituir o arquivo pelo código atualizado**

```typescript
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

  const title = `${profile.businessName} · Vitriny`;
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

  const pixConfigured =
    (await prisma.providerProfile.count({
      where: {
        slug,
        pixKey: { not: null },
        pixHolderName: { not: null },
        pixCity: { not: null }
      }
    })) > 0;

  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const profilePhoneDisplay = formatPhoneBR(profile.phone);
  const whatsappNumber = profile.phone ? phoneToWhatsAppNumber(profile.phone) : null;
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `Olá ${profile.businessName}, vi seu perfil no Vitriny e gostaria de solicitar um orçamento.`
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
            <span className="font-semibold text-ink-muted">Vitriny</span>
          </p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3.2: Verificar build sem erros de TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros. Se houver erro de `phoneToWhatsAppNumber` não exportado, verificar `lib/utils/phone.ts` — a função já existe lá (usada em `/orcamento/page.tsx`).

- [ ] **Step 3.3: Commit**

```bash
git add app/u/\[slug\]/page.tsx
git commit -m "feat(profile): hero CTA, WhatsApp no contato, Como Funciona condicional e SEO metadata"
```

---

## Task 4: Acessibilidade — QuoteRequestForm e página de orçamento

**Files:**

- Modify: `components/quote-request/QuoteRequestForm.tsx:68`
- Modify: `app/u/[slug]/orcamento/page.tsx:131`

- [ ] **Step 4.1: Adicionar `role="alert"` no erro do formulário**

Em `components/quote-request/QuoteRequestForm.tsx`, localizar o bloco de erro (linha ~68):

```tsx
// Antes:
{
  state?.error ? (
    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {state.error}
    </p>
  ) : null;
}

// Depois:
{
  state?.error ? (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
    >
      {state.error}
    </p>
  ) : null;
}
```

- [ ] **Step 4.2: Adicionar `aria-live="polite"` no bloco de sucesso da página de orçamento**

Em `app/u/[slug]/orcamento/page.tsx`, localizar o bloco de sucesso (linha ~131):

```tsx
// Antes:
{query.success ? (
  <div className="mt-8 rounded-xl border border-mint bg-mint/40 p-6">

// Depois:
{query.success ? (
  <div aria-live="polite" className="mt-8 rounded-xl border border-mint bg-mint/40 p-6">
```

- [ ] **Step 4.3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4.4: Commit**

```bash
git add components/quote-request/QuoteRequestForm.tsx app/u/\[slug\]/orcamento/page.tsx
git commit -m "feat(a11y): role=alert no erro do formulário e aria-live no sucesso"
```

---

## Task 5: Verificação final

- [ ] **Step 5.1: Rodar todos os testes unitários**

```bash
npm test
```

Esperado: todos os testes passam (incluindo os novos de `how-it-works`).

- [ ] **Step 5.2: Rodar build de produção**

```bash
npm run build
```

Esperado: build bem-sucedido sem erros de TypeScript ou de rota.

- [ ] **Step 5.3: Verificar manualmente os cenários críticos**

Subir o servidor de dev (`npm run dev`) e verificar:

1. `/u/[slug]` com serviços → hero tem botão "Solicitar orçamento →", cards de serviço têm CTAs, fallback "Não encontrou o que procura?" aparece após a grid.
2. `/u/[slug]` sem serviços → seção mostra "Solicite o que precisa" com card de CTA; "Como funciona" usa fluxo CUSTOM.
3. Card de telefone → exibe botão "WhatsApp" e link "Ligar" quando phone preenchido.
4. Compartilhar link no WhatsApp (ou inspecionar `<head>`) → `og:title` e `og:description` corretos.
5. Perfil não publicado → `robots: noindex` e 404.
6. Perfil com serviços CUSTOM + FIXED → "Como funciona" título "Serviços fixos e sob orçamento".

- [ ] **Step 5.4: Commit final (se houver ajustes)**

```bash
git add -p
git commit -m "fix(profile): ajustes pós-verificação manual"
```
