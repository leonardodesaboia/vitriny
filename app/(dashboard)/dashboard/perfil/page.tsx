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
    <div className="p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        Configurações
      </p>
      <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
        {profile ? "Editar perfil" : "Criar perfil"}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Estes dados aparecem na sua página pública e nas propostas enviadas.
      </p>

      {params.error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMessages[params.error] ?? "Não foi possível salvar o perfil."}
          </p>
        </div>
      ) : null}

      <div className="mt-6 w-full rounded-xl border border-paper-soft bg-white p-6 shadow-card">
        <ProfileForm profile={profile} userEmail={session.user.email} />
      </div>
    </div>
  );
}
