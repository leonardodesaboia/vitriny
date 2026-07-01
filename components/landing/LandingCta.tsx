"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function LandingCta() {
  return (
    <section className="grain relative overflow-hidden bg-leaf px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] translate-x-1/3 -translate-y-1/3 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #D4EBD9, transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring" as const, stiffness: 280, damping: 28 }}
        className="relative mx-auto max-w-xl text-center"
      >
        <h2 className="font-fraunces text-4xl font-bold leading-tight text-white md:text-5xl">
          Pronto para fechar
          <br />mais produtos e serviços?
        </h2>
        <p className="mt-4 text-base text-white/70">
          Crie sua conta e publique sua vitrine em menos de 5 minutos.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/cadastro"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-white px-8 text-sm font-bold text-leaf transition hover:bg-white/90 sm:w-auto"
          >
            Criar conta grátis
          </Link>
          <a
            href="#precos"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-white/30 px-8 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
          >
            Ver planos
          </a>
        </div>

        <p className="mt-5 text-xs text-white/40">
          Sem cartão de crédito · Cancele quando quiser
        </p>
      </motion.div>
    </section>
  );
}
