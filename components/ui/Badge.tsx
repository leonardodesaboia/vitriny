import { type ReactNode } from "react";

export type BadgeStatus =
  | "new"
  | "reviewing"
  | "proposal_sent"
  | "closed"
  | "approved"
  | "rejected"
  | "expired"
  | "draft"
  | "sent";

const variantClasses: Record<BadgeStatus, string> = {
  new: "bg-amber-soft text-amber",
  reviewing: "bg-blue-50 text-blue-700",
  proposal_sent: "bg-mint text-leaf",
  closed: "bg-paper-soft text-ink-muted",
  approved: "bg-leaf text-white",
  rejected: "bg-red-50 text-red-700",
  expired: "bg-paper-soft text-ink-muted",
  draft: "bg-paper-soft text-ink-muted",
  sent: "bg-mint text-leaf"
};

const defaultLabels: Record<BadgeStatus, string> = {
  new: "Novo",
  reviewing: "Em análise",
  proposal_sent: "Proposta enviada",
  closed: "Fechado",
  approved: "Aprovada",
  rejected: "Recusada",
  expired: "Expirada",
  draft: "Rascunho",
  sent: "Enviada"
};

export function Badge({
  status,
  children
}: {
  status: BadgeStatus;
  children?: ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        "text-xs font-semibold",
        variantClasses[status]
      ].join(" ")}
    >
      {status === "new" && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
        </span>
      )}
      {children ?? defaultLabels[status]}
    </span>
  );
}

/** Maps QuoteRequestStatus from Prisma to BadgeStatus */
export function quoteStatusToBadge(
  status: "NEW" | "REVIEWING" | "PROPOSAL_SENT" | "CLOSED"
): BadgeStatus {
  const map: Record<string, BadgeStatus> = {
    NEW: "new",
    REVIEWING: "reviewing",
    PROPOSAL_SENT: "proposal_sent",
    CLOSED: "closed"
  };
  return map[status] ?? "closed";
}

/** Maps ProposalStatus from Prisma to BadgeStatus */
export function proposalStatusToBadge(
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED"
): BadgeStatus {
  const map: Record<string, BadgeStatus> = {
    DRAFT: "draft",
    SENT: "sent",
    APPROVED: "approved",
    REJECTED: "rejected",
    EXPIRED: "expired"
  };
  return map[status] ?? "draft";
}
