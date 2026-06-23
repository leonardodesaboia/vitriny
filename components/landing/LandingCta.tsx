"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function LandingCta() {
  return (
    <section className="grain bg-leaf px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring" as const, stiffness: 280, damping: 28 }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
          Comece agora
        </p>
        <h2 className="mt-4 font-fraunces text-4xl font-bold leading-tight text-white md:text-5xl">
          Seu próximo orçamento a um link de distância.
        </h2>
        <p className="mt-5 text-base leading-7 text-white/75">
          Cadastre-se gratuitamente com Google ou e-mail e publique
          seu perfil em minutos.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-amber px-8 text-sm font-semibold text-white transition hover:bg-amber/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-leaf sm:w-auto"
          >
            Criar conta grátis
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-white/30 px-8 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
          >
            Ver como funciona
          </a>
        </div>
      </motion.div>
    </section>
  );
}
