import { confirmEmail } from "@/lib/actions/auth";

export function ConfirmEmailForm({ token }: { token: string }) {
  return (
    <form action={confirmEmail} className="mt-6">
      <input name="token" type="hidden" value={token} />
      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80"
        type="submit"
      >
        Confirmar meu e-mail
      </button>
    </form>
  );
}
