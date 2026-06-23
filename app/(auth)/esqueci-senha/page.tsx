import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string; sent?: string }>;
};

export default async function ForgotPasswordPage({
  searchParams
}: ForgotPasswordPageProps) {
  const query = await searchParams;

  return (
    <>
      <p className="font-fraunces text-3xl font-bold text-ink">Esqueci minha senha</p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Informe seu e-mail para receber um link de redefinição de senha.
      </p>

      {query.sent ? (
        <div className="mt-6 rounded-lg border border-mint bg-mint/40 px-4 py-3">
          <p className="text-sm font-semibold text-leaf">
            Se esse e-mail estiver cadastrado com senha, você vai receber um link em
            instantes.
          </p>
        </div>
      ) : (
        <ForgotPasswordForm errorCode={query.error} />
      )}

      <p className="mt-6 text-center text-xs text-ink-muted">
        <Link className="font-semibold text-leaf hover:text-leaf-hover" href="/login">
          Voltar para o login
        </Link>
      </p>
    </>
  );
}
