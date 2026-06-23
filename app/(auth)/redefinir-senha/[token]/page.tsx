import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

type ResetPasswordPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({
  params,
  searchParams
}: ResetPasswordPageProps) {
  const { token } = await params;
  const query = await searchParams;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { expiresAt: true }
  });

  const isValid = !!resetToken && resetToken.expiresAt > new Date();

  return (
    <>
      <p className="font-fraunces text-3xl font-bold text-ink">Redefinir senha</p>

      {isValid ? (
        <>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Escolha uma nova senha para sua conta.
          </p>
          <ResetPasswordForm errorCode={query.error} token={token} />
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Este link é inválido ou já expirou.
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80"
            href="/esqueci-senha"
          >
            Solicitar novo link
          </Link>
        </>
      )}
    </>
  );
}
