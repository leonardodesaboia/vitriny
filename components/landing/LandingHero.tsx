"use client";

import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 30 } }
};

export function LandingHero() {
  return (
    <section className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-28">
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.p
          variants={item}
          className="text-xs font-semibold uppercase tracking-widest text-leaf"
        >
          Orçamentos organizados
        </motion.p>
        <motion.h1
          variants={item}
          className="mt-4 font-fraunces text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl"
        >
          Receba pedidos, envie propostas e feche serviços por link.
        </motion.h1>
        <motion.p variants={item} className="mt-6 max-w-xl text-base leading-7 text-ink-muted">
          O OrçaFácil reúne perfil público, serviços, pedidos recebidos e
          propostas em um fluxo simples para prestadores de serviço.
        </motion.p>
        <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover"
            href="#proximos-passos"
          >
            Ver próximos passos
          </a>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-paper-soft bg-white px-6 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf"
            href="#como-funciona"
          >
            Como funciona
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, rotate: 1 }}
        transition={{ delay: 0.3, type: "spring" as const, stiffness: 200, damping: 28 }}
        className="relative rounded-2xl border border-paper-soft bg-white p-6 shadow-card-hover"
      >
        <div className="border-b border-paper-soft pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Pedido recebido
          </p>
          <h2 className="mt-2 font-fraunces text-2xl font-bold text-ink">
            Reforma de banheiro
          </h2>
        </div>
        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Cliente
            </dt>
            <dd className="mt-1 text-base font-medium text-ink">Mariana Costa</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Serviço
            </dt>
            <dd className="mt-1 text-base text-ink">
              Troca de revestimento e instalação hidráulica
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Status
            </dt>
            <dd className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1 text-xs font-semibold text-amber">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
              </span>
              Aguardando proposta
            </dd>
          </div>
        </dl>
      </motion.div>
    </section>
  );
}
