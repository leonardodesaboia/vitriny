import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ProfileForm } from "@/components/provider-profile/ProfileForm";
import { prisma } from "@/lib/prisma";

type ProviderProfilePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do perfil.",
  slug: "Este slug já está em uso."
};

export default async function ProviderProfilePage({
  searchParams
}: ProviderProfilePageProps) {
  const session = await auth();
  const params = await searchParams;

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
      <section className="mx-auto max-w-3xl rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <Link className="text-sm font-semibold text-leaf" href="/dashboard">
          Voltar ao dashboard
        </Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-leaf">
          Perfil do prestador
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          {profile ? "Editar perfil" : "Criar perfil"}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">
          Estes dados serão usados depois na página pública do prestador.
        </p>
        {params.error ? (
          <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessages[params.error] ?? "Não foi possível salvar o perfil."}
          </p>
        ) : null}
        <ProfileForm profile={profile} userEmail={session.user.email} />
      </section>
    </main>
  );
}
