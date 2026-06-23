import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { RegisterForm } from "@/components/auth/RegisterForm";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const googleButtonClassName =
  "mt-8 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-stone-300 px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf";

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const query = await searchParams;

  return (
    <>
      <p className="font-fraunces text-3xl font-bold text-ink">Criar conta</p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Cadastre-se para criar seu perfil de prestador.
      </p>

      <GoogleButton className={googleButtonClassName} />

      <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-widest text-ink-muted">
        <span className="h-px flex-1 bg-paper-soft" />
        ou
        <span className="h-px flex-1 bg-paper-soft" />
      </div>

      <RegisterForm errorCode={query.error} />

      <p className="mt-6 text-center text-xs text-ink-muted">
        Já tem conta?{" "}
        <Link className="font-semibold text-leaf hover:text-leaf-hover" href="/login">
          Entrar
        </Link>
      </p>
    </>
  );
}
