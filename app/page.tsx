import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingSteps } from "@/components/landing/LandingSteps";

export default function Home() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />

      <LandingHero />

      <div className="border-t border-paper-soft" />

      <section id="como-funciona" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            Como funciona
          </p>
          <h2 className="mt-3 font-fraunces text-3xl font-bold text-ink md:text-4xl">
            Quatro passos. <span className="text-ink-muted">Sem complicação.</span>
          </h2>
          <LandingSteps />
        </div>
      </section>

      <LandingFeatures />

      <LandingPricing />

      <LandingCta />

      <SiteFooter />
    </main>
  );
}
