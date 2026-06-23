import { requestPasswordReset } from "@/lib/actions/auth";

type ForgotPasswordFormProps = {
  errorCode?: string;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass = "text-xs font-semibold uppercase tracking-widest text-ink-muted";

const errorMessages: Record<string, string> = {
  invalid: "Informe um e-mail válido."
};

export function ForgotPasswordForm({ errorCode }: ForgotPasswordFormProps) {
  return (
    <form action={requestPasswordReset} className="mt-6 grid gap-4">
      {errorCode ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMessages[errorCode] ?? "Não foi possível processar o pedido."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="email">
          E-mail
        </label>
        <input
          className={inputClass}
          id="email"
          name="email"
          placeholder="seu@email.com"
          required
          type="email"
        />
      </div>

      <button
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80"
        type="submit"
      >
        Enviar link de redefinição
      </button>
    </form>
  );
}
