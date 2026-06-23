import { registerUser } from "@/lib/actions/auth";

type RegisterFormProps = {
  errorCode?: string;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass = "text-xs font-semibold uppercase tracking-widest text-ink-muted";

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados informados.",
  "email-exists": "Este e-mail já está cadastrado.",
  "google-account": "Este e-mail já está cadastrado com Google. Entre com Google."
};

export function RegisterForm({ errorCode }: RegisterFormProps) {
  return (
    <form action={registerUser} className="mt-6 grid gap-4">
      {errorCode ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMessages[errorCode] ?? "Não foi possível criar a conta."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="name">
          Nome
        </label>
        <input
          className={inputClass}
          id="name"
          name="name"
          placeholder="Seu nome completo"
          required
          type="text"
        />
      </div>

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

      <div className="grid gap-2">
        <label className={labelClass} htmlFor="password">
          Senha
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
          Confirmar senha
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
        Criar conta
      </button>
    </form>
  );
}
