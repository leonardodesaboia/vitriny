"use client";

import { motion } from "framer-motion";

const pains = [
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
    problem: "Pedido perdido no WhatsApp",
    desc: "O cliente mandou mensagem, você respondeu, a conversa cresceu — e o orçamento ficou pra trás.",
    solution:
      "Cada pedido chega no painel com nome, serviço e contato. Organizado, rastreado, nunca perdido.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    problem: "Proposta em PDF que ninguém abre",
    desc: "Você fez um trabalho cuidadoso, mandou por e-mail — e o cliente jurou que não recebeu.",
    solution:
      "Proposta por link: o cliente abre no celular, vê os itens e aprova com um clique. Sem e-mail, sem PDF.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
    problem: "Sem saber o que está pendente",
    desc: "Quem pediu orçamento essa semana? Quem está esperando resposta? Você não lembra de cabeça.",
    solution:
      "Painel com status em tempo real: Novo → Proposta enviada → Aprovado. Você vê tudo de relance.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 28 },
  },
};

export function LandingPainStrip() {
  return (
    <section className="relative overflow-hidden bg-ink px-6 py-24">
      {/* Subtle texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Ccircle cx='30' cy='30' r='1' fill='white'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
        }}
      />

      {/* Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, #1B5E3B, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring" as const, stiffness: 280, damping: 28 }}
          className="max-w-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            Reconhece essa situação?
          </p>
          <h2 className="mt-3 font-fraunces text-3xl font-bold leading-tight text-white md:text-4xl">
            Muito talento perdido por{" "}
            <span className="text-white/50">falta de organização.</span>
          </h2>
          <p className="mt-4 text-base leading-7 text-white/60">
            Não é você. É o processo. O Vitriny substitui o caos por um fluxo
            simples que funciona.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="mt-14 grid gap-5 md:grid-cols-3"
        >
          {pains.map((p) => (
            <motion.div
              key={p.problem}
              variants={item}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm"
            >
              {/* Icon */}
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/70">
                {p.icon}
              </div>

              {/* Problem */}
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  O problema
                </p>
                <h3 className="mt-1.5 font-fraunces text-lg font-bold text-white">
                  {p.problem}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{p.desc}</p>
              </div>

              {/* Divider with arrow */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-leaf/20">
                  <svg
                    className="h-3 w-3 text-leaf"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Solution */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-leaf">
                  Com o Vitriny
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-white/80">
                  {p.solution}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
