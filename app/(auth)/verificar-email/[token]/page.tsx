import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ConfirmEmailForm } from "@/components/auth/ConfirmEmailForm";
import { verificationTokenSchema } from "@/lib/validations/auth";

type ConfirmEmailPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ConfirmEmailPage({ params }: ConfirmEmailPageProps) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { token } = await params;
  const validToken = verificationTokenSchema.safeParse(token);

  return (
    <>
      <h1 className="font-fraunces text-3xl font-bold text-ink">
        Confirmar e-mail
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Confirme que este endereço pertence a você para ativar sua conta no
        Vitriny.
      </p>

      {validToken.success ? (
        <ConfirmEmailForm token={validToken.data} />
      ) : (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            O link de confirmação é inválido.
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-ink-muted">
        Precisa de outro link?{" "}
        <Link
          className="font-semibold text-leaf hover:text-leaf-hover"
          href="/verifique-seu-email"
        >
          Reenviar confirmação
        </Link>
      </p>
    </>
  );
}
