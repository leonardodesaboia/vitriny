import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; reset?: string }>;
};

const googleButtonClassName =
  "mt-8 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-stone-300 px-5 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const query = await searchParams;

  return (
    <>
      <p className="font-fraunces text-3xl font-bold text-ink">Entrar</p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Acesse o painel do prestador.
      </p>

      {query.reset ? (
        <div className="mt-6 rounded-lg border border-mint bg-mint/40 px-4 py-3">
          <p className="text-sm font-semibold text-leaf">
            Senha redefinida. Entre com sua nova senha.
          </p>
        </div>
      ) : null}

      <GoogleButton className={googleButtonClassName} />

      <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-widest text-ink-muted">
        <span className="h-px flex-1 bg-paper-soft" />
        ou
        <span className="h-px flex-1 bg-paper-soft" />
      </div>

      <LoginForm errorCode={query.error} />

      <p className="mt-6 text-center text-xs text-ink-muted">
        Não tem conta?{" "}
        <Link className="font-semibold text-leaf hover:text-leaf-hover" href="/cadastro">
          Cadastre-se
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-ink-muted">
        <Link className="font-semibold text-leaf hover:text-leaf-hover" href="/esqueci-senha">
          Esqueci minha senha
        </Link>
      </p>
    </>
  );
}
