"use client";

import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 28 } }
};

function StepProfileCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-paper-soft bg-paper">
      <div className="border-b border-paper-soft bg-white px-4 py-2">
        <p className="text-[10px] text-ink-muted">orcafacil.com/u/<span className="font-semibold text-leaf">joao-eletrica</span></p>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-leaf/20" />
          <div>
            <p className="text-xs font-bold text-ink">João Ferreira</p>
            <p className="text-[10px] text-ink-muted">Eletricista · São Paulo</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Instalação", "Manutenção", "Reforma"].map((s) => (
            <span key={s} className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold text-leaf">{s}</span>
          ))}
        </div>
        <div className="mt-3 rounded-md bg-leaf px-3 py-1.5 text-center text-[11px] font-semibold text-white">
          Pedir orçamento
        </div>
      </div>
    </div>
  );
}

function StepRequestCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-paper-soft bg-white">
      <div className="border-b border-paper-soft px-4 py-2.5">
        <p className="text-xs font-semibold text-ink">Pedido de orçamento</p>
      </div>
      <div className="space-y-2.5 p-4">
        {[
          { label: "Serviço", value: "Instalação elétrica" },
          { label: "Nome", value: "Ana Lima" },
          { label: "Contato", value: "ana@email.com" }
        ].map((f) => (
          <div key={f.label}>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">{f.label}</p>
            <div className="mt-0.5 rounded-md border border-paper-soft bg-paper px-2.5 py-1.5 text-[11px] text-ink">
              {f.value}
            </div>
          </div>
        ))}
        <div className="mt-1 rounded-md bg-leaf px-3 py-1.5 text-center text-[11px] font-semibold text-white">
          Enviar pedido
        </div>
      </div>
    </div>
  );
}

function StepPanelCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-paper-soft bg-white">
      <div className="border-b border-paper-soft px-4 py-2.5">
        <p className="text-xs font-semibold text-ink">Pedidos recebidos</p>
      </div>
      <div className="divide-y divide-paper-soft">
        {[
          { name: "Ana Lima", status: "Novo", color: "bg-amber-soft text-amber" },
          { name: "Carlos M.", status: "Proposta enviada", color: "bg-mint text-leaf" },
          { name: "Maria S.", status: "Aprovado", color: "bg-mint text-leaf" }
        ].map((r) => (
          <div key={r.name} className="flex items-center justify-between px-4 py-2.5">
            <p className="text-xs font-semibold text-ink">{r.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${r.color}`}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepProposalCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-paper-soft bg-white">
      <div className="border-b border-paper-soft px-4 py-2.5">
        <p className="text-xs font-semibold text-ink">Proposta #12</p>
      </div>
      <div className="p-4">
        <div className="space-y-1.5">
          {[
            { item: "Mão de obra", val: "R$ 1.200" },
            { item: "Materiais", val: "R$ 800" }
          ].map((l) => (
            <div key={l.item} className="flex justify-between text-[11px]">
              <span className="text-ink-muted">{l.item}</span>
              <span className="font-semibold text-ink">{l.val}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-paper-soft pt-3">
          <div className="flex justify-between">
            <span className="text-xs font-bold text-ink">Total</span>
            <span className="font-fraunces text-sm font-bold text-leaf">R$ 2.000</span>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <div className="flex-1 rounded-md border border-paper-soft py-1.5 text-center text-[11px] font-semibold text-ink-muted">Recusar</div>
          <div className="flex-1 rounded-md bg-leaf py-1.5 text-center text-[11px] font-semibold text-white">Aprovar</div>
        </div>
      </div>
    </div>
  );
}

const steps = [
  {
    n: "01",
    title: "Publique seu perfil",
    text: "Seu link em minutos.",
    visual: <StepProfileCard />
  },
  {
    n: "02",
    title: "Receba pedidos",
    text: "Clientes enviam pelo link.",
    visual: <StepRequestCard />
  },
  {
    n: "03",
    title: "Gerencie no painel",
    text: "Tudo organizado por status.",
    visual: <StepPanelCard />
  },
  {
    n: "04",
    title: "Envie propostas",
    text: "Cliente aprova online.",
    visual: <StepProposalCard />
  }
];

export function LandingSteps() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      className="mt-12 grid gap-6 md:grid-cols-4"
    >
      {steps.map((step, i) => (
        <motion.div key={step.n} variants={item} className="relative flex flex-col gap-4">
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className="absolute left-[calc(100%_-_8px)] top-4 hidden h-px w-full bg-paper-soft md:block"
            />
          )}
          <div>
            <span className="font-fraunces text-4xl font-bold leading-none text-paper-soft select-none">
              {step.n}
            </span>
            <h3 className="mt-2 text-sm font-bold text-ink">{step.title}</h3>
            <p className="mt-1 text-xs text-ink-muted">{step.text}</p>
          </div>
          <div className="mt-1">{step.visual}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
