import { resendEmailVerification } from "@/lib/actions/auth";

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none ring-offset-paper transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

export function ResendVerificationForm({ email }: { email?: string }) {
  return (
    <form action={resendEmailVerification} className="mt-6 grid gap-4">
      {email ? (
        <div className="rounded-lg border border-paper-soft bg-paper px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            E-mail do cadastro
          </p>
          <p className="mt-1 break-all text-sm font-semibold text-ink">{email}</p>
          <input name="email" type="hidden" value={email} />
        </div>
      ) : (
        <div className="grid gap-2">
          <label
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted"
            htmlFor="verification-email"
          >
            E-mail do cadastro
          </label>
          <input
            autoComplete="email"
            className={inputClass}
            id="verification-email"
            name="email"
            placeholder="seu@email.com"
            required
            type="email"
          />
        </div>
      )}

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
        type="submit"
      >
        Reenviar confirmação
      </button>
    </form>
  );
}
