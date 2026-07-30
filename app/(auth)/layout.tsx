import type { ReactNode } from "react";

import { AuthVitrinePreview } from "@/components/auth/AuthVitrinePreview";
import { PRIVATE_METADATA } from "@/lib/seo/metadata";

export const metadata = PRIVATE_METADATA;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen text-ink">
      <div className="grain relative hidden w-1/2 flex-col overflow-hidden bg-leaf p-12 lg:flex">
        {/* Glow de acento para dar profundidade ao painel (grão + glow). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-mint/10 blur-3xl"
        />

        <p className="relative font-fraunces text-2xl font-semibold text-white">
          Vitriny
        </p>

        {/* Showcase do produto: a própria vitrine que o visitante vai criar,
            trazendo luz/creme para o painel escuro em vez de só uma frase. */}
        <div className="relative my-auto w-full max-w-sm">
          <p className="font-fraunces text-[2rem] font-bold leading-[1.1] tracking-[-0.01em] text-white">
            Apresente seus produtos e serviços e organize cada pedido.
          </p>
          <div className="mt-8">
            <AuthVitrinePreview />
          </div>
        </div>

        <p className="relative text-xs font-medium text-white/50">
          Feito para pequenos negócios
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
