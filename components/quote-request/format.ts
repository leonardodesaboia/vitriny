import type { QuoteRequestStatusActor } from "@prisma/client";

export const statusLabels: Record<string, string> = {
  NEW: "Novo",
  REVIEWING: "Em análise",
  PROPOSAL_SENT: "Proposta enviada",
  CLOSED: "Fechado"
};

export const statusBadge: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border border-blue-200",
  REVIEWING: "bg-amber-50 text-amber-700 border border-amber-200",
  PROPOSAL_SENT: "bg-mint text-leaf border border-mint",
  CLOSED: "bg-paper-soft text-ink-muted border border-paper-soft"
};

export const proposalStatusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  EXPIRED: "Expirada"
};

export const proposalStatusBadge: Record<string, string> = {
  DRAFT: "bg-paper-soft text-ink-muted",
  SENT: "bg-amber-50 text-amber-700",
  APPROVED: "bg-mint text-leaf",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-paper-soft text-ink-muted"
};

export const actorLabels: Record<QuoteRequestStatusActor, string> = {
  CUSTOMER: "Cliente",
  PROVIDER: "Negócio",
  SYSTEM: "Sistema"
};

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function splitServiceFromDescription(
  description: string,
  serviceNamesById: Record<string, string>
) {
  const prefix = "Serviço selecionado: ";
  if (!description.startsWith(prefix)) {
    return { serviceLabel: null, cleanDescription: description };
  }
  const [firstLine, ...rest] = description.split("\n");
  const serviceId = firstLine.replace(prefix, "").trim();
  return {
    serviceLabel: serviceNamesById[serviceId] ?? serviceId,
    cleanDescription: rest.join("\n").trim()
  };
}
