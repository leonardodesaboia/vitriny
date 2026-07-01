"use client";

import { motion } from "framer-motion";

const features = [
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
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    ),
    label: "Vitrine pública",
    title: "Seu link. Seu negócio.",
    text: "Uma página profissional em vitriny.com/u/seu-nome, pronta para receber clientes.",
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
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
    label: "Painel de pedidos",
    title: "Nenhum pedido perdido.",
    text: "Todos os pedidos chegam organizados por status. Do novo ao concluído.",
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
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
    ),
    label: "Propostas online",
    title: "Cliente aprova com um clique.",
    text: "Proposta por link, sem e-mail. O cliente vê os itens, o valor e aprova na hora.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 28 },
  },
};

export function LandingFeatures() {
  return (
    <section id="funcionalidades" className="bg-paper-soft px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring" as const, stiffness: 280, damping: 28 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf">
            Funcionalidades
          </p>
          <h2 className="mt-3 font-fraunces text-3xl font-bold text-ink md:text-4xl">
            Simples. Direto. <span className="text-leaf">Funcional.</span>
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="mt-12 grid gap-6 md:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div
              key={f.label}
              variants={item}
              className="rounded-2xl border border-paper-soft bg-white p-7 shadow-card"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-leaf">
                {f.icon}
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-leaf">
                {f.label}
              </p>
              <h3 className="mt-2 font-fraunces text-xl font-bold text-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{f.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
