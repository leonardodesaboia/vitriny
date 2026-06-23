"use client";

import { motion } from "framer-motion";

const steps = [
  { n: "01", text: "Publique seu perfil e seus serviços." },
  { n: "02", text: "Receba pedidos de orçamento por link público." },
  { n: "03", text: "Acompanhe pedidos no painel do prestador." },
  { n: "04", text: "Envie propostas para aprovação ou recusa online." }
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 30 } }
};

export function LandingSteps() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="mt-10 grid gap-4 md:grid-cols-4"
    >
      {steps.map((step) => (
        <motion.div
          key={step.n}
          variants={item}
          className="relative rounded-xl border border-paper-soft bg-paper p-5"
        >
          <span className="pointer-events-none absolute right-4 top-2 select-none font-fraunces text-6xl font-bold leading-none text-paper-soft">
            {step.n}
          </span>
          <span className="relative text-xs font-bold text-leaf">{step.n}</span>
          <p className="relative mt-3 text-sm leading-6 text-ink-muted">{step.text}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
