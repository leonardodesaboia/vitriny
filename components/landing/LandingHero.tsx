"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 28, delay: i * 0.1 }
  })
};

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      {/* Decorative bg blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, #1B5E3B, transparent 70%)" }}
      />

      <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-24 pt-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pb-32 md:pt-28">
        {/* Left — copy */}
        <div>
          <motion.span
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-mint bg-white px-3 py-1 text-xs font-semibold text-leaf"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
            Para prestadores de serviço
          </motion.span>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-5 font-fraunces text-5xl font-bold leading-[1.1] tracking-tight text-ink md:text-[64px]"
          >
            Feche serviços com um{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-leaf">link</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-sm bg-mint"
              />
            </span>
            {" "}profissional.
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-lg text-base leading-7 text-ink-muted"
          >
            Publique seu perfil, receba pedidos de orçamento e envie propostas
            para aprovação online — tudo em um único painel.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
            >
              Começar de graça
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-paper-soft bg-white px-6 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
            >
              Ver como funciona
            </a>
          </motion.div>

          <motion.p
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-5 text-xs text-ink-muted"
          >
            Login via GitHub · Gratuito durante o beta
          </motion.p>
        </div>

        {/* Right — product mockup */}
        <div className="relative flex items-center justify-center">
          {/* Card 3 — back: proposta aprovada */}
          <motion.div
            initial={{ opacity: 0, y: 32, rotate: 4 }}
            animate={{ opacity: 1, y: 0, rotate: 4 }}
            transition={{ delay: 0.55, type: "spring" as const, stiffness: 200, damping: 26 }}
            className="absolute -right-2 top-6 w-[85%] rounded-2xl border border-mint bg-white p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Proposta
              </p>
              <span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-leaf">
                Aprovada ✓
              </span>
            </div>
            <p className="mt-2 font-fraunces text-lg font-bold text-ink">
              Instalação elétrica
            </p>
            <p className="mt-3 font-fraunces text-2xl font-bold text-leaf">
              R$ 2.400,00
            </p>
          </motion.div>

          {/* Card 2 — middle: pedido recebido */}
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ delay: 0.35, type: "spring" as const, stiffness: 220, damping: 26 }}
            className="absolute -left-4 bottom-4 w-[80%] rounded-2xl border border-paper-soft bg-white p-5 shadow-card"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Pedido recebido
            </p>
            <p className="mt-1.5 font-fraunces text-base font-bold text-ink">
              Reforma do escritório
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-muted">
              Mariana Costa · mariana@email.com
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1 text-xs font-semibold text-amber">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
              </span>
              Aguardando proposta
            </div>
          </motion.div>

          {/* Card 1 — front: painel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, type: "spring" as const, stiffness: 240, damping: 26 }}
            className="relative z-10 w-full rounded-2xl border border-paper-soft bg-white p-6 shadow-card-hover"
          >
            {/* Mini header */}
            <div className="flex items-center justify-between border-b border-paper-soft pb-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-leaf" />
                <span className="font-fraunces text-sm font-semibold text-ink">
                  OrçaFácil
                </span>
              </div>
              <div className="h-2 w-2 rounded-full bg-leaf" />
            </div>

            {/* Metric row */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Pedidos", value: "12" },
                { label: "Propostas", value: "8" },
                { label: "Aprovadas", value: "5" }
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg bg-paper p-3 text-center"
                >
                  <p className="font-fraunces text-2xl font-bold text-ink">
                    {m.value}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent items */}
            <div className="mt-4 space-y-2">
              {[
                { name: "João Ferreira", service: "Pintura residencial", status: "Novo" },
                { name: "Ana Lima", service: "Reforma de cozinha", status: "Proposta enviada" }
              ].map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between rounded-lg border border-paper-soft p-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-ink">{r.name}</p>
                    <p className="mt-0.5 text-[10px] text-ink-muted">{r.service}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      r.status === "Novo"
                        ? "bg-amber-soft text-amber"
                        : "bg-mint text-leaf"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
