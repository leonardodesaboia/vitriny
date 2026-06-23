"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 28, delay: i * 0.08 }
  })
};

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, #1B5E3B, transparent 70%)" }}
      />

      <div className="mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-20 md:grid-cols-[1fr_1.2fr] md:items-center md:pb-32 md:pt-28">
        {/* Left */}
        <div>
          <motion.span
            custom={0} variants={fadeUp} initial="hidden" animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-mint bg-white px-3 py-1 text-xs font-semibold text-leaf"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
            Para prestadores de serviço
          </motion.span>

          <motion.h1
            custom={1} variants={fadeUp} initial="hidden" animate="show"
            className="mt-5 font-fraunces text-5xl font-bold leading-[1.1] tracking-tight text-ink md:text-6xl"
          >
            Orçamentos
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-leaf">profissionais.</span>
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.45, ease: "easeOut" }}
                className="absolute inset-x-0 bottom-1 -z-0 h-3 origin-left rounded-sm bg-mint"
              />
            </span>
            <br />
            Aprovados online.
          </motion.h1>

          <motion.p
            custom={2} variants={fadeUp} initial="hidden" animate="show"
            className="mt-6 text-base leading-7 text-ink-muted"
          >
            Do pedido à aprovação do cliente — em um painel.
            <br />
            Sem WhatsApp, sem PDF, sem confusão.
          </motion.p>

          <motion.div
            custom={3} variants={fadeUp} initial="hidden" animate="show"
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              href="/cadastro"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover"
            >
              Começar grátis
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-paper-soft bg-white px-6 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
            >
              Como funciona
            </a>
          </motion.div>

          <motion.p
            custom={4} variants={fadeUp} initial="hidden" animate="show"
            className="mt-4 text-xs text-ink-muted"
          >
            Grátis para sempre · Sem cartão de crédito
          </motion.p>
        </div>

        {/* Right — browser mockup */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring" as const, stiffness: 220, damping: 26 }}
          className="relative"
        >
          {/* Floating approval badge */}
          <motion.div
            initial={{ opacity: 0, x: 20, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.7, type: "spring" as const, stiffness: 260, damping: 24 }}
            className="absolute -right-4 -top-4 z-20 flex items-center gap-2.5 rounded-xl border border-mint bg-white px-4 py-2.5 shadow-card"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mint">
              <svg className="h-3.5 w-3.5 text-leaf" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-ink">Proposta aprovada</p>
              <p className="text-[10px] text-ink-muted">João F. · R$ 2.400,00</p>
            </div>
          </motion.div>

          {/* Floating new request badge */}
          <motion.div
            initial={{ opacity: 0, x: -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.9, type: "spring" as const, stiffness: 260, damping: 24 }}
            className="absolute -bottom-4 -left-4 z-20 flex items-center gap-2.5 rounded-xl border border-paper-soft bg-white px-4 py-2.5 shadow-card"
          >
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
            </div>
            <p className="text-xs font-semibold text-ink">Novo pedido recebido</p>
          </motion.div>

          {/* Browser chrome */}
          <div className="overflow-hidden rounded-2xl border border-paper-soft bg-white shadow-card-hover">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 border-b border-paper-soft bg-paper px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="ml-2 flex h-6 flex-1 items-center rounded-md bg-white px-3 text-[11px] text-ink-muted border border-paper-soft">
                orcafacil.com/dashboard
              </div>
            </div>

            {/* App layout */}
            <div className="flex">
              {/* Sidebar */}
              <div className="hidden w-44 shrink-0 border-r border-paper-soft bg-paper p-4 sm:block">
                <div className="flex items-center gap-2 pb-4">
                  <div className="h-6 w-6 rounded-md bg-leaf" />
                  <span className="font-fraunces text-sm font-semibold text-ink">OrçaFácil</span>
                </div>
                {[
                  { label: "Painel", active: false },
                  { label: "Pedidos", active: true },
                  { label: "Propostas", active: false },
                  { label: "Perfil", active: false }
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`mt-0.5 rounded-md px-3 py-2 text-xs font-medium ${
                      item.active
                        ? "bg-leaf text-white"
                        : "text-ink-muted hover:bg-paper-soft"
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-5">
                {/* Stats */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[
                    { label: "Pedidos", value: "12" },
                    { label: "Propostas", value: "8" },
                    { label: "Aprovadas", value: "5" }
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-paper-soft bg-paper p-3 text-center">
                      <p className="font-fraunces text-xl font-bold text-ink">{s.value}</p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Table header */}
                <div className="mb-2 grid grid-cols-[1fr_auto] px-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Cliente</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Status</p>
                </div>

                {/* Rows */}
                {[
                  { name: "João Ferreira", service: "Pintura residencial", status: "Novo", color: "bg-amber-soft text-amber" },
                  { name: "Ana Lima", service: "Reforma de cozinha", status: "Proposta enviada", color: "bg-mint text-leaf" },
                  { name: "Carlos Mendes", service: "Instalação elétrica", status: "Aprovado", color: "bg-mint text-leaf" }
                ].map((row) => (
                  <div
                    key={row.name}
                    className="mb-1.5 flex items-center justify-between rounded-lg border border-paper-soft p-3"
                  >
                    <div>
                      <p className="text-xs font-semibold text-ink">{row.name}</p>
                      <p className="text-[10px] text-ink-muted">{row.service}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.color}`}>
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
