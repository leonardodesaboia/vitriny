import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingSteps } from "@/components/landing/LandingSteps";

export default function Home() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />

      <LandingHero />

      <section id="como-funciona" className="border-y border-paper-soft bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Fluxo
          </p>
          <h2 className="mt-3 font-fraunces text-3xl font-bold text-ink">
            Como o MVP funciona
          </h2>
          <LandingSteps />
        </div>
      </section>

      <section id="proximos-passos" className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
          Status
        </p>
        <h2 className="mt-3 font-fraunces text-3xl font-bold text-ink">
          Próxima etapa
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
          O MVP já cobre o fluxo principal. A próxima etapa é validar o caminho
          completo em ambiente real e preparar o deploy.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
