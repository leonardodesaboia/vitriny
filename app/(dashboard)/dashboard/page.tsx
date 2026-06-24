import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PlanUsageCard } from "@/components/billing/PlanUsageCard";
import {
  OnboardingChecklist,
  type OnboardingStep
} from "@/components/onboarding/OnboardingChecklist";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { profileLinkMessage } from "@/lib/whatsapp-messages";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Card } from "@/components/ui/Card";
import { getCurrentMonthRange, getPlanLimits } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const monthRange = getCurrentMonthRange();
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      quoteRequests: { select: { id: true, status: true, createdAt: true } },
      proposals: { select: { id: true, status: true, createdAt: true } },
      proposalTemplates: { select: { id: true } },
      services: { select: { id: true, isActive: true } }
    }
  });

  const totalPedidos = profile?.quoteRequests.length ?? 0;
  const novosPedidos =
    profile?.quoteRequests.filter((r) => r.status === "NEW").length ?? 0;
  const propostasEnviadas =
    profile?.proposals.filter((p) => p.status === "SENT").length ?? 0;
  const propostasAprovadas =
    profile?.proposals.filter((p) => p.status === "APPROVED").length ?? 0;
  const limits = profile ? getPlanLimits(profile.plan) : null;
  const monthlyQuoteRequests =
    profile?.quoteRequests.filter(
      (request) =>
        request.createdAt >= monthRange.start && request.createdAt < monthRange.end
    ).length ?? 0;
  const monthlyProposals =
    profile?.proposals.filter(
      (proposal) =>
        proposal.createdAt >= monthRange.start && proposal.createdAt < monthRange.end
    ).length ?? 0;

  const activeServicesCount =
    profile?.services.filter((s) => s.isActive).length ?? 0;

  const onboardingSteps: OnboardingStep[] = [
    {
      id: "profile",
      label: "Criar perfil do prestador",
      description:
        "Adicione o nome do seu negócio, descrição e informações de contato.",
      done: !!profile,
      href: "/dashboard/perfil",
      actionLabel: "Criar perfil"
    },
    {
      id: "publish",
      label: "Publicar perfil",
      description: "Ative seu perfil público para que clientes encontrem você.",
      done: profile?.isPublished ?? false,
      href: "/dashboard/perfil",
      actionLabel: "Publicar perfil"
    },
    {
      id: "service",
      label: "Cadastrar pelo menos 1 serviço ativo",
      description:
        "Serviços aparecem na página pública e ajudam clientes a entender o que você oferece.",
      done: activeServicesCount > 0,
      href: "/dashboard/servicos",
      actionLabel: "Cadastrar serviço"
    },
    {
      id: "link",
      label: "Copiar ou acessar link público",
      description:
        "Compartilhe o link do seu perfil com clientes para receber pedidos.",
      done: profile?.isPublished ?? false,
      isCopyStep: true,
      actionLabel: "Copiar link"
    },
    {
      id: "request",
      label: "Receber primeiro pedido de orçamento",
      description:
        "Quando um cliente preencher o formulário no seu perfil, o pedido aparece aqui.",
      done: (profile?.quoteRequests.length ?? 0) > 0,
      href: "/dashboard/pedidos",
      actionLabel: "Ver pedidos"
    },
    {
      id: "proposal",
      label: "Criar primeira proposta",
      description:
        "Responda um pedido com uma proposta detalhada e envie o link para o cliente aprovar.",
      done: (profile?.proposals.length ?? 0) > 0,
      href: "/dashboard/pedidos",
      actionLabel: "Ir para pedidos"
    }
  ];

  const metrics = [
    { label: "Pedidos totais", value: totalPedidos },
    { label: "Pedidos novos", value: novosPedidos },
    { label: "Propostas enviadas", value: propostasEnviadas },
    { label: "Propostas aprovadas", value: propostasAprovadas }
  ];

  return (
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Dashboard
          </p>
          <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
            Olá, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Gerencie seu perfil, serviços e pedidos em um único painel.
          </p>
        </div>
        <LogoutButton className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf" />
      </div>

      {profile?.isPublished && profile.slug ? (
        <section className="mt-8 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
                Seu link público
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Compartilhe com clientes para receber pedidos de orçamento.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <CopyLinkButton
                url={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${profile.slug}`}
              />
              <a
                href={`/u/${profile.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
              >
                Abrir
              </a>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-paper-soft bg-paper px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">
              {`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${profile.slug}`}
            </p>
          </div>

          <div className="mt-4 border-t border-paper-soft pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
              Mensagens prontas para WhatsApp
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Copie o texto abaixo e cole no WhatsApp para divulgar seu link de orçamento.
            </p>
            <div className="mt-2">
              <WhatsAppButton
                label="Compartilhar link de orçamento"
                message={profileLinkMessage(
                  `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${profile.slug}`
                )}
              />
            </div>
          </div>
        </section>
      ) : null}

      <OnboardingChecklist
        steps={onboardingSteps}
        slug={profile?.slug}
      />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              {m.label}
            </p>
            <p className="mt-2 font-fraunces text-4xl font-bold text-ink">
              <AnimatedCounter value={m.value} />
            </p>
          </Card>
        ))}
      </div>

      {profile && limits ? (
        <PlanUsageCard
          plan={profile.plan}
          usage={[
            {
              current: profile.services.filter((service) => service.isActive).length,
              limit: limits.activeServices,
              resource: "activeServices"
            },
            {
              current: monthlyQuoteRequests,
              limit: limits.monthlyQuoteRequests,
              resource: "monthlyQuoteRequests"
            },
            {
              current: monthlyProposals,
              limit: limits.monthlyProposals,
              resource: "monthlyProposals"
            },
            {
              current: profile.proposalTemplates.length,
              limit: limits.proposalTemplates,
              resource: "proposalTemplates"
            }
          ]}
        />
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card hoverable className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Perfil
          </p>
          <h2 className="mt-2 font-fraunces text-xl font-bold text-ink">
            {profile ? profile.businessName : "Criar perfil"}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {profile
              ? profile.isPublished
                ? `Publicado em /u/${profile.slug}`
                : "Perfil criado, mas não publicado"
              : "Você ainda não criou seu perfil público."}
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/perfil"
          >
            {profile ? "Editar perfil" : "Criar perfil"}
          </Link>
        </Card>

        <Card hoverable className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Serviços
          </p>
          <h2 className="mt-2 font-fraunces text-xl font-bold text-ink">
            Seus serviços
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Cadastre os serviços que você oferece para exibir no perfil público.
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
            href="/dashboard/servicos"
          >
            Gerenciar serviços
          </Link>
        </Card>

        <Card hoverable className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Pedidos
          </p>
          <h2 className="mt-2 font-fraunces text-xl font-bold text-ink">
            Pedidos recebidos
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Veja os pedidos enviados pelo formulário público e crie propostas.
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
            href="/dashboard/pedidos"
          >
            Ver pedidos
          </Link>
        </Card>
      </div>
    </div>
  );
}
