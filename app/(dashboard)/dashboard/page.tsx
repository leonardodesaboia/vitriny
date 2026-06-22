import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: {
      userId: session.user.id
    }
  });

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <section className="mx-auto max-w-4xl rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-leaf">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold">Olá, {session.user.name}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">
          Gerencie seu perfil, serviços, pedidos recebidos e propostas em um
          único painel.
        </p>

        <div className="mt-8 rounded-lg border border-stone-200 bg-paper p-5">
          <h2 className="text-xl font-bold text-ink">Perfil do prestador</h2>
          {profile ? (
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Perfil criado para <strong>{profile.businessName}</strong>.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Você ainda não criou seu perfil. Ele será usado depois na página
              pública do prestador e nos pedidos de orçamento.
            </p>
          )}
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443]"
            href="/dashboard/perfil"
          >
            {profile ? "Editar perfil" : "Criar perfil"}
          </Link>
          {profile ? (
            <div className="mt-5 rounded-md border border-stone-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink">Link público</p>
              {profile.isPublished ? (
                <Link
                  className="mt-2 inline-flex text-sm font-semibold text-leaf"
                  href={`/u/${profile.slug}`}
                >
                  /u/{profile.slug}
                </Link>
              ) : (
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  O perfil ainda não está publicado. Ative a publicação na edição
                  do perfil para liberar o link <strong>/u/{profile.slug}</strong>.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-lg border border-stone-200 bg-paper p-5">
          <h2 className="text-xl font-bold text-ink">Serviços</h2>
          {profile ? (
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Cadastre os serviços oferecidos pelo seu negócio.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Crie o perfil do prestador antes de cadastrar serviços.
            </p>
          )}
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
            href="/dashboard/servicos"
          >
            Gerenciar serviços
          </Link>
        </div>

        <div className="mt-5 rounded-lg border border-stone-200 bg-paper p-5">
          <h2 className="text-xl font-bold text-ink">Pedidos</h2>
          {profile ? (
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Veja os pedidos de orçamento recebidos e acompanhe o status.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Crie o perfil do prestador antes de receber pedidos.
            </p>
          )}
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
            href="/dashboard/pedidos"
          >
            Ver pedidos
          </Link>
        </div>

        <LogoutButton className="mt-8 inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf" />
      </section>
    </main>
  );
}
