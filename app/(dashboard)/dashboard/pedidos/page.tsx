import Link from "next/link";
import { redirect } from "next/navigation";
import type { QuoteRequestStatus } from "@prisma/client";

import { auth } from "@/auth";
import { QuoteRequestList } from "@/components/quote-request/QuoteRequestList";
import {
  DASHBOARD_REQUEST_VIEW_LABELS,
  matchesDashboardRequestView,
  parseDashboardRequestView
} from "@/lib/dashboard";
import { getCurrentMonthRange } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

type RequestsPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    status?: string;
    view?: string;
    warning?: string;
  }>;
};

const statusFilters: { label: string; value: QuoteRequestStatus | "ALL" }[] = [
  { label: "Todos", value: "ALL" },
  { label: "Novo", value: "NEW" },
  { label: "Em análise", value: "REVIEWING" },
  { label: "Proposta enviada", value: "PROPOSAL_SENT" },
  { label: "Fechado", value: "CLOSED" }
];

const statusLabel: Record<QuoteRequestStatus, string> = {
  CLOSED: "Fechado",
  NEW: "Novo",
  PROPOSAL_SENT: "Proposta enviada",
  REVIEWING: "Em análise"
};

function parseStatusFilter(status: string | undefined): QuoteRequestStatus | "ALL" {
  return statusFilters.some((filter) => filter.value === status)
    ? (status as QuoteRequestStatus | "ALL")
    : "ALL";
}

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do pedido.",
  profile: "Cadastre os dados do negócio antes de receber pedidos.",
  "not-found": "Pedido não encontrado."
};

const noticeMessages: Record<string, string> = {
  "proposal-email-sent": "Proposta criada e enviada por e-mail ao cliente."
};

const warningMessages: Record<string, string> = {
  "proposal-email-missing":
    "Proposta criada, mas o pedido não tem e-mail do cliente para envio automático.",
  "proposal-email-failed":
    "Proposta criada, mas o e-mail não foi enviado. Verifique o Resend, EMAIL_FROM e se o domínio está validado."
};

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      quoteRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              itemType: true,
              pricingType: true,
              fixedServiceCheckoutMode: true,
              basePrice: true
            }
          },
          proposal: {
            select: {
              depositAmount: true,
              depositPaidAt: true,
              id: true,
              publicToken: true,
              respondedAt: true,
              status: true
            }
          },
          statusHistory: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              fromStatus: true,
              toStatus: true,
              actor: true,
              note: true,
              createdAt: true
            }
          },
          internalNotes: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      },
      services: { select: { id: true, name: true, itemType: true, pricingType: true, fixedServiceCheckoutMode: true, basePrice: true, requiresSchedulingDetails: true } }
    }
  });

  const totalRequests = profile?.quoteRequests.length ?? 0;
  const newRequests = profile?.quoteRequests.filter((r) => r.status === "NEW").length ?? 0;
  const activeStatus = parseStatusFilter(params.status);
  const activeView = parseDashboardRequestView(params.view);
  const monthRange = getCurrentMonthRange();
  const requestCounts = Object.fromEntries(
    statusFilters.map((filter) => [
      filter.value,
      filter.value === "ALL"
        ? totalRequests
        : (profile?.quoteRequests.filter((request) => request.status === filter.value).length ?? 0)
    ])
  ) as Record<QuoteRequestStatus | "ALL", number>;
  const filteredRequests =
    activeView
      ? (profile?.quoteRequests.filter((request) =>
          matchesDashboardRequestView(request, activeView, monthRange)
        ) ?? [])
      : activeStatus === "ALL"
      ? (profile?.quoteRequests ?? [])
      : (profile?.quoteRequests.filter((request) => request.status === activeStatus) ?? []);

  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        Pedidos
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <h1 className="font-fraunces text-4xl font-bold text-ink">
          Pedidos recebidos
        </h1>
        {newRequests > 0 ? (
          <span className="mb-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            {newRequests} novo{newRequests > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-ink-muted">
        {totalRequests > 0
          ? `${totalRequests} pedido${totalRequests > 1 ? "s" : ""} recebido${totalRequests > 1 ? "s" : ""} no total.`
          : "Acompanhe os pedidos enviados pela sua vitrine pública."}
      </p>

      {params.error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessages[params.error] ?? "Não foi possível atualizar o pedido."}
        </p>
      ) : null}

      {params.notice ? (
        <p className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {noticeMessages[params.notice] ?? "Operação concluída."}
        </p>
      ) : null}

      {params.warning ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {warningMessages[params.warning] ?? "Operação concluída com aviso."}
        </p>
      ) : null}

      {!profile ? (
        <div className="mt-8 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
          <h2 className="font-fraunces text-xl font-bold text-ink">
            Cadastre seu negócio primeiro
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Os pedidos ficam vinculados aos dados do negócio.
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/perfil"
          >
            Cadastrar negócio
          </Link>
        </div>
      ) : (
        <div className="mt-8 min-w-0">
          {activeView ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-leaf/20 bg-mint px-4 py-3">
              <p className="text-sm font-semibold text-leaf">
                Visão: {DASHBOARD_REQUEST_VIEW_LABELS[activeView]}
              </p>
              <Link
                className="text-xs font-semibold text-leaf underline-offset-4 hover:underline"
                href="/dashboard/pedidos"
              >
                Limpar filtro
              </Link>
            </div>
          ) : null}

          <div className="mb-5 overflow-x-auto pb-1">
            <nav
              aria-label="Filtrar pedidos por status"
              className="flex min-w-max gap-2"
            >
              {statusFilters.map((filter) => {
                const active = !activeView && filter.value === activeStatus;
                const href =
                  filter.value === "ALL"
                    ? "/dashboard/pedidos"
                    : `/dashboard/pedidos?status=${filter.value}`;

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition ${
                      active
                        ? "border-leaf bg-mint text-leaf"
                        : "border-paper-soft bg-white text-ink-muted hover:bg-paper"
                    }`}
                    href={href}
                    key={filter.value}
                  >
                    <span>{filter.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                        active ? "bg-white/70 text-leaf" : "bg-paper-soft text-ink-muted"
                      }`}
                    >
                      {requestCounts[filter.value]}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <QuoteRequestList
            emptyDescription={
              activeView
                ? `Nenhum pedido encontrado em “${DASHBOARD_REQUEST_VIEW_LABELS[activeView]}”.`
                : activeStatus === "ALL"
                ? undefined
                : `Nenhum pedido com status "${statusLabel[activeStatus]}".`
            }
            emptyTitle={
              activeView
                ? "Nenhuma pendência nesta visão"
                : activeStatus === "ALL"
                ? undefined
                : "Nenhum pedido neste filtro"
            }
            quoteRequests={filteredRequests}
            services={profile.services.map((s) => ({
              ...s,
              basePrice: s.basePrice?.toString() ?? null,
              requiresSchedulingDetails: s.requiresSchedulingDetails
            }))}
          />
        </div>
      )}
    </div>
  );
}
