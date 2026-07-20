import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";
import { PENDING_VERIFICATION_EMAIL_COOKIE } from "@/lib/auth/email-verification";

type VerifyEmailNoticePageProps = {
  searchParams: Promise<{ error?: string; sent?: string }>;
};

const errorMessages: Record<string, string> = {
  delivery:
    "A conta foi criada, mas não conseguimos enviar o e-mail. Confira o endereço e tente reenviar.",
  invalid:
    "Este link é inválido, expirou ou já foi utilizado. Solicite uma nova confirmação.",
};

export const dynamic = "force-dynamic";

export default async function VerifyEmailNoticePage({
  searchParams,
}: VerifyEmailNoticePageProps) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const query = await searchParams;
  const cookieStore = await cookies();
  const pendingEmail = cookieStore.get(PENDING_VERIFICATION_EMAIL_COOKIE)?.value;

  return (
    <>
      <h1 className="font-fraunces text-3xl font-bold text-ink">
        Verifique seu e-mail
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Enviamos um link de confirmação. Sua conta só poderá ser acessada depois
        que o endereço for confirmado.
      </p>

      {query.sent ? (
        <div className="mt-6 rounded-lg border border-mint bg-mint/40 px-4 py-3">
          <p className="text-sm font-semibold text-leaf">
            Se houver uma conta pendente para esse e-mail, uma nova confirmação
            será enviada.
          </p>
        </div>
      ) : null}

      {query.error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            {errorMessages[query.error] ??
              "Não foi possível confirmar o e-mail."}
          </p>
        </div>
      ) : null}

      <ResendVerificationForm email={pendingEmail} />

      <p className="mt-6 text-center text-xs text-ink-muted">
        Já confirmou?{" "}
        <Link className="font-semibold text-leaf hover:text-leaf-hover" href="/login">
          Entrar
        </Link>
      </p>
    </>
  );
}
