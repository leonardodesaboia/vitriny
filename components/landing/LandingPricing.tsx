"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { PLAN_PRICES } from "@/lib/plan-limits";

// A landing exibe centavos em corpo menor; o preço vem da fonte única.
const [proPriceMain, proPriceCents] = PLAN_PRICES.PRO.split(",");

const free = [
  "Vitrine pública com link próprio",
  "Até 3 itens ativos",
  "Foto em cada item",
  "50 pedidos/mês",
  "5 propostas/mês",
  "1 template de proposta",
  "Aprovação online pelo cliente"
];

const pro = [
  "Tudo do plano Grátis",
  "Itens ilimitados na vitrine",
  "Pedidos ilimitados por mês",
  "Propostas ilimitadas por mês",
  "Templates de proposta ilimitados",
  "Temas visuais para sua página",
  "Ranking dos itens mais vistos"
];

function CheckIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`mt-0.5 h-3 w-3 shrink-0 sm:h-4 sm:w-4 ${muted ? "text-ink-muted/50" : "text-leaf"}`}
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
    <section id="precos" className="scroll-mt-20 bg-white px-4 py-12 sm:px-6 md:py-24">
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

        <div className="mt-8 grid grid-cols-2 gap-3 md:mt-14 md:gap-8 lg:mx-auto lg:max-w-4xl">
          {/* FREE */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring" as const, stiffness: 260, damping: 28, delay: 0.05 }}
            className="flex h-full flex-col rounded-2xl border border-paper-soft bg-paper p-3 sm:p-6 md:p-8"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted sm:text-xs">
              Grátis
            </p>
            <div className="mt-3 flex items-end gap-0.5 sm:gap-1 md:mt-4">
              <span className="font-fraunces text-2xl font-bold text-ink sm:text-4xl md:text-5xl">
                {PLAN_PRICES.FREE}
              </span>
              <span className="mb-0.5 text-xs text-ink-muted sm:text-sm">/mês</span>
            </div>
            <p className="mt-1 hidden text-sm text-ink-muted sm:block">
              Para quem está começando.
            </p>

            <hr className="my-4 border-paper-soft md:my-7" />

            <ul className="flex flex-col gap-2 sm:gap-3.5">
              {free.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-[11px] text-ink sm:gap-2.5 sm:text-sm">
                  <CheckIcon muted />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6 md:pt-10">
              <Link
                href="/cadastro"
                className="inline-flex w-full min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 sm:min-h-11 sm:text-sm"
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
            className="relative flex h-full flex-col rounded-2xl border-2 border-leaf bg-white p-3 shadow-card-hover sm:p-6 md:p-8"
          >
            {/* Badge */}
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-leaf px-2 py-0.5 text-[10px] font-semibold text-white sm:px-4 sm:py-1 sm:text-xs">
              Recomendado
            </span>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-leaf sm:text-xs">
              PRO
            </p>
            <div className="mt-3 flex items-end gap-0.5 sm:gap-1 md:mt-4">
              <span className="font-fraunces text-2xl font-bold text-ink sm:text-4xl md:text-5xl">
                {proPriceMain}
              </span>
              <span className="mb-1 font-fraunces text-sm font-bold text-ink sm:text-xl md:text-2xl">
                ,{proPriceCents}
              </span>
              <span className="mb-0.5 text-xs text-ink-muted sm:text-sm">/mês</span>
            </div>
            <p className="mt-1 hidden text-xs text-ink-muted sm:block sm:text-sm">
              Uma proposta a mais por mês já paga o plano.
            </p>

            <hr className="my-4 border-paper-soft md:my-7" />

            <ul className="flex flex-col gap-2 sm:gap-3.5">
              {pro.map((f, i) => (
                <li key={f} className="flex items-start gap-1.5 text-[11px] text-ink sm:gap-2.5 sm:text-sm">
                  <CheckIcon muted={false} />
                  <span className={i === 0 ? "font-semibold" : ""}>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6 md:pt-10">
              <Link
                href="/cadastro"
                className="inline-flex w-full min-h-9 items-center justify-center rounded-md bg-leaf text-xs font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 sm:min-h-11 sm:text-sm"
              >
                Começar com PRO
              </Link>
              <p className="mt-2 hidden text-center text-xs text-ink-muted sm:block">
                Sem contrato · Cancele quando quiser
              </p>
            </div>
          </motion.div>
        </div>

        {/* Guarantee note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-xs text-ink-muted md:mt-8"
        >
          Sem contrato · Cancele quando quiser · Cobrança mensal via cartão.
        </motion.p>
      </div>
    </section>
  );
}
