import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen text-ink">
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

      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
