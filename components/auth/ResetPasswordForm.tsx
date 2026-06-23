import { resetPassword } from "@/lib/actions/auth";

type ResetPasswordFormProps = {
  token: string;
  errorCode?: string;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass = "text-xs font-semibold uppercase tracking-widest text-ink-muted";

const errorMessages: Record<string, string> = {
  invalid: "Revise a senha informada."
};

export function ResetPasswordForm({ token, errorCode }: ResetPasswordFormProps) {
  return (
    <form action={resetPassword} className="mt-6 grid gap-4">
      <input name="token" type="hidden" value={token} />

      {errorCode ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMessages[errorCode] ?? "Não foi possível redefinir a senha."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="password">
          Nova senha
        </label>
        <input
          className={inputClass}
          id="password"
          minLength={8}
          name="password"
          placeholder="Pelo menos 8 caracteres"
          required
          type="password"
        />
      </div>

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="confirmPassword">
          Confirmar nova senha
        </label>
        <input
          className={inputClass}
          id="confirmPassword"
          minLength={8}
          name="confirmPassword"
          placeholder="Repita a senha"
          required
          type="password"
        />
      </div>

      <button
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80"
        type="submit"
      >
        Redefinir senha
      </button>
    </form>
  );
}
