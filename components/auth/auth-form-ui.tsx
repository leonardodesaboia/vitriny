import type { ReactNode } from "react";

// UI compartilhada dos forms de autenticação (login, cadastro, esqueci/redefinir
// senha) — antes duplicada em cada arquivo.

export const authLabelClass =
  "text-xs font-semibold uppercase tracking-widest text-ink-muted";

const inputBase =
  "min-h-11 w-full rounded-lg border bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition";

// Estado de erro é visível também na borda do campo, não só no texto.
export function fieldClass(hasError = false): string {
  return hasError
    ? `${inputBase} border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200`
    : `${inputBase} border-paper-soft focus:border-leaf focus:ring-2 focus:ring-leaf/20`;
}

// Alerta no topo do form (erro geral: credenciais, e-mail já existe, etc.).
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
    >
      <svg
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" strokeLinecap="round" />
        <path d="M12 16h.01" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
      <p className="text-sm font-semibold text-red-700">{children}</p>
    </div>
  );
}

// Mensagem de erro por campo, ancorada ao input via aria-describedby.
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-xs font-medium text-red-600">
      {children}
    </p>
  );
}

export function SubmitButton({
  children,
  pending,
  pendingLabel,
}: {
  children: ReactNode;
  pending: boolean;
  pendingLabel: string;
}) {
  return (
    <button
      className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <>
          <svg
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
            />
          </svg>
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
