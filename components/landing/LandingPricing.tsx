"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const free = [
  "Vitrine pública com link próprio",
  "Até 3 itens ativos",
  "10 pedidos/mês",
  "5 propostas/mês",
  "1 template de proposta",
  "Aprovação online pelo cliente"
];

const pro = [
  "Tudo do plano Grátis",
  "Itens da vitrine ilimitados",
  "Pedidos ilimitados",
  "Propostas ilimitadas",
  "Templates ilimitados",
  "Notas internas por pedido",
  "Histórico completo de status"
];

function CheckIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      className={`mt-0.5 h-4 w-4 shrink-0 ${muted ? "text-ink-muted/50" : "text-leaf"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function LandingPricing() {
  return (
    <section id="precos" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring" as const, stiffness: 280, damping: 28 }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            Planos
          </p>
          <h2 className="mt-3 font-fraunces text-3xl font-bold text-ink md:text-4xl">
            Simples assim.{" "}
            <span className="text-ink-muted">Grátis ou PRO.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-muted">
            Comece sem pagar nada. Quando crescer, o PRO acompanha — sem
            surpresas na fatura.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 md:items-start md:gap-8 lg:mx-auto lg:max-w-4xl">
          {/* FREE */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring" as const, stiffness: 260, damping: 28, delay: 0.05 }}
            className="flex flex-col rounded-2xl border border-paper-soft bg-paper p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Grátis
            </p>
            <div className="mt-4 flex items-end gap-1">
              <span className="font-fraunces text-5xl font-bold text-ink">R$ 0</span>
              <span className="mb-1.5 text-sm text-ink-muted">/mês</span>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Para quem está começando.
            </p>

            <hr className="my-7 border-paper-soft" />

            <ul className="flex flex-col gap-3.5">
              {free.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                  <CheckIcon muted />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link
                href="/cadastro"
                className="inline-flex w-full min-h-11 items-center justify-center rounded-md border border-paper-soft bg-white text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
              >
                Criar conta grátis
              </Link>
            </div>
          </motion.div>

          {/* PRO */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring" as const, stiffness: 260, damping: 28, delay: 0.15 }}
            className="relative flex flex-col rounded-2xl border-2 border-leaf bg-white p-8 shadow-card-hover"
          >
            {/* Badge */}
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-leaf px-4 py-1 text-xs font-semibold text-white">
              Mais popular
            </span>

            <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
              PRO
            </p>
            <div className="mt-4 flex items-end gap-1">
              <span className="font-fraunces text-5xl font-bold text-ink">R$ 19</span>
              <span className="mb-2 font-fraunces text-2xl font-bold text-ink">,90</span>
              <span className="mb-1.5 text-sm text-ink-muted">/mês</span>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Para quem quer crescer sem limite.
            </p>

            <hr className="my-7 border-paper-soft" />

            <ul className="flex flex-col gap-3.5">
              {pro.map((f, i) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                  <CheckIcon muted={false} />
                  <span className={i === 0 ? "font-semibold" : ""}>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link
                href="/cadastro"
                className="inline-flex w-full min-h-11 items-center justify-center rounded-md bg-leaf text-sm font-semibold text-white transition hover:bg-leaf-hover"
              >
                Começar com PRO
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Guarantee note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center text-xs text-ink-muted"
        >
          Sem contrato. Cancele quando quiser. Cobrança via cartão ou Pix.
        </motion.p>
      </div>
    </section>
  );
}
