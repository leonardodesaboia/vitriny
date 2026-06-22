import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginButton } from "@/components/auth/LoginButton";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-16 text-ink">
      <section className="mx-auto max-w-md rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-leaf">
          OrçaFácil
        </p>
        <h1 className="mt-3 text-3xl font-bold">Entrar na sua conta</h1>
        <p className="mt-4 text-sm leading-6 text-stone-700">
          Use sua conta do GitHub para acessar a área inicial do prestador.
        </p>
        <LoginButton className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443]" />
      </section>
    </main>
  );
}
