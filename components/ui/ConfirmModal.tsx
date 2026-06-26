"use client";

import type { ReactNode } from "react";

type ConfirmVariant = "danger" | "primary";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  eyebrow?: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  pendingLabel?: string;
  variant?: ConfirmVariant;
  onClose: () => void;
  onConfirm: () => void;
};

const confirmClasses: Record<ConfirmVariant, string> = {
  danger: "bg-red-600 text-white hover:bg-red-700",
  primary: "bg-leaf text-white hover:bg-leaf-hover"
};

const eyebrowClasses: Record<ConfirmVariant, string> = {
  danger: "text-red-600",
  primary: "text-leaf"
};

export function ConfirmModal({
  open,
  title,
  description,
  eyebrow,
  confirmLabel,
  cancelLabel = "Cancelar",
  pending = false,
  pendingLabel = "Aguarde...",
  variant = "primary",
  onClose,
  onConfirm
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        tabIndex={-1}
        onKeyDown={(event) => event.key === "Escape" && !pending && onClose()}
        className="w-full max-w-md rounded-xl border border-paper-soft bg-white p-6 shadow-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow ? (
              <p
                className={`text-xs font-semibold uppercase tracking-widest ${eyebrowClasses[variant]}`}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2
              id="confirm-modal-title"
              className="mt-2 font-fraunces text-xl font-bold text-ink"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition hover:bg-paper hover:text-ink disabled:opacity-60"
            aria-label="Fechar"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 text-sm leading-6 text-ink-muted">{description}</div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-sm font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition disabled:opacity-60 ${confirmClasses[variant]}`}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
