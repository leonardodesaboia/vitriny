import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginButton } from "@/components/auth/LoginButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <>
      <p className="font-fraunces text-3xl font-bold text-ink">Entrar</p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Use sua conta do GitHub para acessar o painel do prestador.
      </p>
      <LoginButton className="mt-8 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80" />
      <p className="mt-6 text-center text-xs text-ink-muted">
        Ao entrar, você concorda com os termos de uso.
      </p>
    </>
  );
}
