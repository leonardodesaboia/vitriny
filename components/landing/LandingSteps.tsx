"use client";

import { motion } from "framer-motion";

const steps = [
  {
    n: "01",
    title: "Crie seu perfil",
    text: "Configure seu negócio, descreva seus serviços e publique seu link em minutos."
  },
  {
    n: "02",
    title: "Receba pedidos",
    text: "Clientes acessam sua página pública e enviam pedidos de orçamento direto para você."
  },
  {
    n: "03",
    title: "Acompanhe o painel",
    text: "Veja todos os pedidos organizados por status. Nunca perca um orçamento."
  },
  {
    n: "04",
    title: "Envie propostas",
    text: "Monte propostas profissionais e envie por link para aprovação ou recusa online."
  }
];

const icons = [
  /* user/person */
  <svg key="user" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>,
  /* inbox */
  <svg key="inbox" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m12-4l-4 4-4-4" />
  </svg>,
  /* chart */
  <svg key="chart" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>,
  /* document-check */
  <svg key="doc" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } }
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 28 } }
};

export function LandingSteps() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className="mt-12 grid gap-6 md:grid-cols-4"
    >
      {steps.map((step, i) => (
        <motion.div key={step.n} variants={item} className="relative">
          {/* Connecting line (not last) */}
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className="absolute left-[calc(100%_-_8px)] top-5 hidden h-px w-full bg-paper-soft md:block"
            />
          )}

          <div className="flex flex-col">
            {/* Icon circle */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf text-white">
              {icons[i]}
            </div>

            {/* Step number */}
            <span className="mt-4 font-fraunces text-4xl font-bold leading-none text-paper-soft select-none">
              {step.n}
            </span>

            <h3 className="mt-2 text-sm font-bold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{step.text}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
