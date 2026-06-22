import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <section className="mx-auto max-w-4xl rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-leaf">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold">Olá, {session.user.name}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">
          Esta é apenas a área autenticada inicial. Perfil do prestador,
          serviços, pedidos e propostas entram nas próximas etapas do MVP.
        </p>
        <LogoutButton className="mt-8 inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf" />
      </section>
    </main>
  );
}
