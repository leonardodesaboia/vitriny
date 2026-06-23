import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginButton } from "@/components/auth/LoginButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen text-ink">
      {/* Left side — decorative */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-leaf p-12 lg:flex">
        <p className="font-fraunces text-2xl font-semibold text-white">OrçaFácil</p>

        <div
          className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #D4EBD9, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #F5E6D3, transparent 70%)" }}
        />

        <blockquote>
          <p className="font-fraunces text-2xl font-medium leading-snug text-white/90">
            &ldquo;Transforme pedidos soltos em propostas profissionais.&rdquo;
          </p>
          <p className="mt-4 text-sm font-medium text-white/60">
            Feito para prestadores de serviço
          </p>
        </blockquote>
      </div>

      {/* Right side — form */}
      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="font-fraunces text-3xl font-bold text-ink">Entrar</p>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Use sua conta do GitHub para acessar o painel do prestador.
          </p>
          <LoginButton className="mt-8 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80" />
          <p className="mt-6 text-center text-xs text-ink-muted">
            Ao entrar, você concorda com os termos de uso.
          </p>
        </div>
      </div>
    </main>
  );
}
