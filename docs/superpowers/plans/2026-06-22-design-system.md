# Design System "Tropical Paper" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o design system "Tropical Paper" no Vitriny — tokens, tipografia, componentes base, animações Framer Motion e redesign completo de todas as páginas.

**Architecture:** Tokens centralizados em `tailwind.config.ts` e `globals.css`. Componentes UI em `components/ui/`. Dashboard ganha layout próprio com Sidebar collapsible. Framer Motion em componentes client-only.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Framer Motion, next/font/google (Fraunces, Plus Jakarta Sans, JetBrains Mono)

---

## Task 0: Criar branch e instalar dependência

**Files:**

- Modify: `package.json`

- [ ] **Criar branch `design-system` a partir de main**

```bash
git checkout -b design-system
```

- [ ] **Instalar Framer Motion**

```bash
npm install framer-motion
```

- [ ] **Verificar instalação**

```bash
npm ls framer-motion
```

Esperado: `framer-motion@x.x.x`

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add framer-motion"
```

---

## Task 1: Tokens de cor e fonte no Tailwind

**Files:**

- Modify: `tailwind.config.ts`

- [ ] **Substituir o conteúdo de `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F5F0E8",
        "paper-soft": "#EDE8DE",
        ink: "#1C1917",
        "ink-muted": "#78716C",
        leaf: "#1B5E3B",
        "leaf-hover": "#2D7A52",
        mint: "#D4EBD9",
        amber: "#C97D3F",
        "amber-soft": "#F5E6D3",
      },
      fontFamily: {
        fraunces: ["var(--font-fraunces)", "serif"],
        jakarta: ["var(--font-jakarta)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(28,25,23,0.08), 0 4px 16px rgba(28,25,23,0.06)",
        "card-hover":
          "0 4px 20px rgba(28,25,23,0.14), 0 8px 32px rgba(28,25,23,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Rodar lint para confirmar sem erros de tipo**

```bash
npm run lint
```

Esperado: sem erros

- [ ] **Commit**

```bash
git add tailwind.config.ts
git commit -m "feat: add Tropical Paper design tokens to Tailwind"
```

---

## Task 2: Fontes e globals.css

**Files:**

- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Substituir `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: #f5f0e8;
  font-family: var(--font-jakarta), system-ui, sans-serif;
  color: #1c1917;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: inherit;
  text-decoration: none;
}

/* Grain texture — aplicar com classe .grain no elemento pai position:relative */
.grain::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  background-repeat: repeat;
}
```

- [ ] **Substituir `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vitriny",
  description:
    "MicroSaaS para prestadores receberem pedidos de orçamento e enviarem propostas por link.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${jakarta.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Rodar build para verificar que as fontes carregam sem erro**

```bash
npm run build
```

Esperado: build sem erros

- [ ] **Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: load Fraunces, Plus Jakarta Sans and JetBrains Mono fonts"
```

---

## Task 3: Componente Button

**Files:**

- Create: `components/ui/Button.tsx`

- [ ] **Criar `components/ui/Button.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-leaf text-white hover:bg-leaf-hover focus-visible:ring-amber",
  secondary:
    "border border-leaf text-leaf bg-transparent hover:bg-mint focus-visible:ring-leaf",
  ghost:
    "text-ink-muted hover:text-leaf hover:bg-paper focus-visible:ring-leaf",
  danger:
    "border border-red-300 text-red-700 bg-transparent hover:bg-red-50 focus-visible:ring-red-400",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      loading = false,
      children,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        disabled={disabled || loading}
        className={[
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5",
          "text-sm font-semibold transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          className,
        ].join(" ")}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : null}
        {children}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
```

- [ ] **Rodar lint**

```bash
npm run lint
```

Esperado: sem erros

- [ ] **Commit**

```bash
git add components/ui/Button.tsx
git commit -m "feat: add Button component with Framer Motion spring tap"
```

---

## Task 4: Componente Card

**Files:**

- Create: `components/ui/Card.tsx`

- [ ] **Criar `components/ui/Card.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import { type HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({
  hoverable = false,
  children,
  className = "",
  ...props
}: CardProps) {
  const base = "rounded-xl border border-paper-soft bg-white shadow-card";

  if (hoverable) {
    return (
      <motion.div
        whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(28,25,23,0.12)" }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`${base} ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${base} ${className}`} {...props}>
      {children}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add components/ui/Card.tsx
git commit -m "feat: add Card component with optional hover animation"
```

---

## Task 5: Componente Badge de status

**Files:**

- Create: `components/ui/Badge.tsx`

- [ ] **Criar `components/ui/Badge.tsx`**

```tsx
import { type ReactNode } from "react";

export type BadgeStatus =
  | "new"
  | "reviewing"
  | "proposal_sent"
  | "closed"
  | "approved"
  | "rejected"
  | "expired"
  | "draft"
  | "sent";

const variantClasses: Record<BadgeStatus, string> = {
  new: "bg-amber-soft text-amber",
  reviewing: "bg-blue-50 text-blue-700",
  proposal_sent: "bg-mint text-leaf",
  closed: "bg-paper-soft text-ink-muted",
  approved: "bg-leaf text-white",
  rejected: "bg-red-50 text-red-700",
  expired: "bg-paper-soft text-ink-muted",
  draft: "bg-paper-soft text-ink-muted",
  sent: "bg-mint text-leaf",
};

const defaultLabels: Record<BadgeStatus, string> = {
  new: "Novo",
  reviewing: "Em análise",
  proposal_sent: "Proposta enviada",
  closed: "Fechado",
  approved: "Aprovada",
  rejected: "Recusada",
  expired: "Expirada",
  draft: "Rascunho",
  sent: "Enviada",
};

export function Badge({
  status,
  children,
}: {
  status: BadgeStatus;
  children?: ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        "text-xs font-semibold",
        variantClasses[status],
      ].join(" ")}
    >
      {status === "new" && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
        </span>
      )}
      {children ?? defaultLabels[status]}
    </span>
  );
}

/** Mapeia QuoteRequestStatus do Prisma para BadgeStatus */
export function quoteStatusToBadge(
  status: "NEW" | "REVIEWING" | "PROPOSAL_SENT" | "CLOSED",
): BadgeStatus {
  const map: Record<string, BadgeStatus> = {
    NEW: "new",
    REVIEWING: "reviewing",
    PROPOSAL_SENT: "proposal_sent",
    CLOSED: "closed",
  };
  return map[status] ?? "closed";
}

/** Mapeia ProposalStatus do Prisma para BadgeStatus */
export function proposalStatusToBadge(
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED",
): BadgeStatus {
  const map: Record<string, BadgeStatus> = {
    DRAFT: "draft",
    SENT: "sent",
    APPROVED: "approved",
    REJECTED: "rejected",
    EXPIRED: "expired",
  };
  return map[status] ?? "draft";
}
```

- [ ] **Commit**

```bash
git add components/ui/Badge.tsx
git commit -m "feat: add Badge component with status color map"
```

---

## Task 6: AnimatedCounter

**Files:**

- Create: `components/ui/AnimatedCounter.tsx`

- [ ] **Criar `components/ui/AnimatedCounter.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useInView, animate } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(v) {
        if (ref.current) ref.current.textContent = Math.round(v).toString();
      },
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}
```

- [ ] **Commit**

```bash
git add components/ui/AnimatedCounter.tsx
git commit -m "feat: add AnimatedCounter with useInView trigger"
```

---

## Task 7: SiteHeader e SiteFooter

**Files:**

- Modify: `components/layout/SiteHeader.tsx`
- Modify: `components/layout/SiteFooter.tsx`

- [ ] **Substituir `components/layout/SiteHeader.tsx`**

```tsx
import Link from "next/link";
import { AuthButton } from "@/components/auth/AuthButton";

export function SiteHeader() {
  return (
    <header className="border-b border-paper-soft bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          className="font-fraunces text-xl font-semibold tracking-tight text-ink hover:text-leaf transition-colors"
          href="/"
        >
          Vitriny
        </Link>
        <nav
          aria-label="Principal"
          className="hidden items-center gap-6 text-sm md:flex"
        >
          <a
            className="font-medium text-ink-muted transition-colors hover:text-leaf"
            href="#como-funciona"
          >
            Como funciona
          </a>
          <a
            className="font-medium text-ink-muted transition-colors hover:text-leaf"
            href="#proximos-passos"
          >
            Próximos passos
          </a>
        </nav>
        <AuthButton />
      </div>
    </header>
  );
}
```

- [ ] **Substituir `components/layout/SiteFooter.tsx`**

```tsx
export function SiteFooter() {
  return (
    <footer className="border-t border-paper-soft bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-6 text-sm">
        <p className="font-fraunces font-semibold text-ink">Vitriny</p>
        <p className="text-ink-muted">Feito para prestadores de serviço</p>
      </div>
    </footer>
  );
}
```

- [ ] **Commit**

```bash
git add components/layout/SiteHeader.tsx components/layout/SiteFooter.tsx
git commit -m "feat: update SiteHeader and SiteFooter with Tropical Paper design"
```

---

## Task 8: Sidebar e layout do dashboard

**Files:**

- Create: `components/layout/Sidebar.tsx`
- Create: `app/(dashboard)/layout.tsx`

- [ ] **Criar `components/layout/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/pedidos",
    label: "Pedidos",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/servicos",
    label: "Serviços",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/perfil",
    label: "Perfil",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-expanded");
    if (stored !== null) setExpanded(stored === "true");
  }, []);

  const toggle = () => {
    setExpanded((v) => {
      localStorage.setItem("sidebar-expanded", String(!v));
      return !v;
    });
  };

  return (
    <motion.aside
      animate={{ width: expanded ? 220 : 64 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative flex h-screen flex-col border-r border-paper-soft bg-white sticky top-0 shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex min-h-16 items-center justify-between px-4">
        <AnimatePresence>
          {expanded && (
            <motion.span
              key="logo"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="font-fraunces text-base font-semibold text-ink"
            >
              Vitriny
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={toggle}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-paper hover:text-leaf transition-colors"
          aria-label={expanded ? "Recolher menu" : "Expandir menu"}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {expanded ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-2 py-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "relative flex min-h-10 items-center gap-3 rounded-md px-2",
                "text-sm font-medium transition-colors",
                active
                  ? "bg-mint text-leaf"
                  : "text-ink-muted hover:bg-paper hover:text-ink",
              ].join(" ")}
            >
              <span className="w-5 shrink-0 flex items-center justify-center">
                {item.icon}
              </span>
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    key={item.label}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.12 }}
                    className="truncate whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
```

- [ ] **Criar `app/(dashboard)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">{children}</div>
    </div>
  );
}
```

- [ ] **Rodar build**

```bash
npm run build
```

Esperado: build sem erros

- [ ] **Commit**

```bash
git add components/layout/Sidebar.tsx app/(dashboard)/layout.tsx
git commit -m "feat: add collapsible Sidebar and dashboard layout"
```

---

## Task 9: Landing page redesign

**Nota arquitetural:** `app/page.tsx` permanece Server Component. As partes com Framer Motion são extraídas para componentes client separados — padrão correto do Next.js App Router (Server Components não podem importar hooks/framer-motion diretamente).

**Files:**

- Create: `components/landing/LandingHero.tsx`
- Create: `components/landing/LandingSteps.tsx`
- Modify: `app/page.tsx`

- [ ] **Criar `components/landing/LandingHero.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
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
        <motion.p
          variants={item}
          className="mt-6 max-w-xl text-base leading-7 text-ink-muted"
        >
          O Vitriny reúne perfil público, serviços, pedidos recebidos e
          propostas em um fluxo simples para prestadores de serviço.
        </motion.p>
        <motion.div
          variants={item}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
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

      {/* Mockup card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, rotate: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 28 }}
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
            <dd className="mt-1 text-base font-medium text-ink">
              Mariana Costa
            </dd>
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
```

- [ ] **Criar `components/landing/LandingSteps.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";

const steps = [
  { n: "01", text: "Publique seu perfil e seus serviços." },
  { n: "02", text: "Receba pedidos de orçamento por link público." },
  { n: "03", text: "Acompanhe pedidos no painel do prestador." },
  { n: "04", text: "Envie propostas para aprovação ou recusa online." },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
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
          <p className="relative mt-3 text-sm leading-6 text-ink-muted">
            {step.text}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
```

- [ ] **Substituir `app/page.tsx`**

```tsx
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingSteps } from "@/components/landing/LandingSteps";

export default function Home() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <SiteHeader />

      <LandingHero />

      {/* Como funciona */}
      <section
        id="como-funciona"
        className="border-y border-paper-soft bg-white"
      >
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Fluxo
          </p>
          <h2 className="mt-3 font-fraunces text-3xl font-bold text-ink">
            Como o MVP funciona
          </h2>
          <LandingSteps />
        </div>
      </section>

      {/* Próximos passos */}
      <section id="proximos-passos" className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
          Status
        </p>
        <h2 className="mt-3 font-fraunces text-3xl font-bold text-ink">
          Próxima etapa
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
          O MVP já cobre o fluxo principal. A próxima etapa é validar o caminho
          completo em ambiente real e preparar o deploy.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
```

- [ ] **Rodar build**

```bash
npm run build
```

Esperado: build sem erros

- [ ] **Commit**

```bash
git add components/landing/LandingHero.tsx components/landing/LandingSteps.tsx app/page.tsx
git commit -m "feat: redesign landing page with Tropical Paper design system"
```

---

## Task 10: Login page redesign

**Files:**

- Modify: `app/(auth)/login/page.tsx`

- [ ] **Substituir `app/(auth)/login/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginButton } from "@/components/auth/LoginButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen text-ink">
      {/* Lado esquerdo — padrão decorativo */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-leaf p-12 grain lg:flex">
        <p className="font-fraunces text-2xl font-semibold text-white">
          Vitriny
        </p>

        {/* Círculos decorativos */}
        <div
          className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #D4EBD9, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #F5E6D3, transparent 70%)",
          }}
        />

        <blockquote>
          <p className="font-fraunces text-2xl font-medium leading-snug text-white/90">
            "Transforme pedidos soltos em propostas profissionais."
          </p>
          <p className="mt-4 text-sm font-medium text-white/60">
            Feito para prestadores de serviço
          </p>
        </blockquote>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="font-fraunces text-3xl font-bold text-ink">Entrar</p>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Use sua conta do GitHub para acessar o painel do prestador.
          </p>
          <LoginButton className="mt-8 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/80" />
          <p className="mt-6 text-center text-xs text-ink-muted">
            Ao entrar, você concorda com os termos de uso.
          </p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat: redesign login page with split layout"
```

---

## Task 11: Dashboard home redesign

**Files:**

- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Substituir `app/(dashboard)/dashboard/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      quoteRequests: { select: { id: true, status: true } },
      proposals: { select: { id: true, status: true } },
    },
  });

  const totalPedidos = profile?.quoteRequests.length ?? 0;
  const novosPedidos =
    profile?.quoteRequests.filter((r) => r.status === "NEW").length ?? 0;
  const propostasEnviadas =
    profile?.proposals.filter((p) => p.status === "SENT").length ?? 0;
  const propostasAprovadas =
    profile?.proposals.filter((p) => p.status === "APPROVED").length ?? 0;

  const metrics = [
    { label: "Pedidos totais", value: totalPedidos },
    { label: "Pedidos novos", value: novosPedidos },
    { label: "Propostas enviadas", value: propostasEnviadas },
    { label: "Propostas aprovadas", value: propostasAprovadas },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Dashboard
          </p>
          <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
            Olá, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Gerencie seu perfil, serviços e pedidos em um único painel.
          </p>
        </div>
        <LogoutButton className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf" />
      </div>

      {/* Métricas */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              {m.label}
            </p>
            <p className="mt-2 font-fraunces text-4xl font-bold text-ink">
              <AnimatedCounter value={m.value} />
            </p>
          </Card>
        ))}
      </div>

      {/* Navegação rápida */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card hoverable className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Perfil
          </p>
          <h2 className="mt-2 font-fraunces text-xl font-bold text-ink">
            {profile ? profile.businessName : "Criar perfil"}
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            {profile
              ? profile.isPublished
                ? `Publicado em /u/${profile.slug}`
                : "Perfil criado, mas não publicado"
              : "Você ainda não criou seu perfil público."}
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/perfil"
          >
            {profile ? "Editar perfil" : "Criar perfil"}
          </Link>
        </Card>

        <Card hoverable className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Serviços
          </p>
          <h2 className="mt-2 font-fraunces text-xl font-bold text-ink">
            Seus serviços
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Cadastre os serviços que você oferece para exibir no perfil público.
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
            href="/dashboard/servicos"
          >
            Gerenciar serviços
          </Link>
        </Card>

        <Card hoverable className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Pedidos
          </p>
          <h2 className="mt-2 font-fraunces text-xl font-bold text-ink">
            Pedidos recebidos
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Veja os pedidos enviados pelo formulário público e crie propostas.
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
            href="/dashboard/pedidos"
          >
            Ver pedidos
          </Link>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: redesign dashboard home with animated metric counters"
```

---

## Task 12: Pedidos page redesign

**Files:**

- Modify: `app/(dashboard)/dashboard/pedidos/page.tsx`
- Modify: `components/quote-request/QuoteRequestList.tsx`

- [ ] **Ler o conteúdo atual de `components/quote-request/QuoteRequestList.tsx`** antes de modificar

Run: `cat components/quote-request/QuoteRequestList.tsx`

- [ ] **Substituir `app/(dashboard)/dashboard/pedidos/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QuoteRequestList } from "@/components/quote-request/QuoteRequestList";
import { prisma } from "@/lib/prisma";

type RequestsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do pedido.",
  profile: "Crie o perfil do prestador antes de receber pedidos.",
  "not-found": "Pedido não encontrado.",
};

export default async function RequestsPage({
  searchParams,
}: RequestsPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      quoteRequests: {
        orderBy: { createdAt: "desc" },
        include: { proposal: { select: { publicToken: true } } },
      },
      services: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        Pedidos
      </p>
      <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
        Pedidos recebidos
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Acompanhe os pedidos enviados pelo formulário público de orçamento.
      </p>

      {params.error ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessages[params.error] ??
            "Não foi possível atualizar o pedido."}
        </p>
      ) : null}

      {!profile ? (
        <div className="mt-8 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
          <h2 className="font-fraunces text-xl font-bold text-ink">
            Crie seu perfil primeiro
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Pedidos ficam vinculados ao perfil do prestador.
          </p>
          <Link
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            href="/dashboard/perfil"
          >
            Criar perfil
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <QuoteRequestList
            quoteRequests={profile.quoteRequests}
            services={profile.services}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/pedidos/page.tsx"
git commit -m "feat: redesign pedidos page with Tropical Paper design"
```

---

## Task 13: Perfil público redesign

**Files:**

- Modify: `app/u/[slug]/page.tsx`

- [ ] **Substituir `app/u/[slug]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

function formatMoney(value: { toString: () => string }) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value.toString()));
}

export default async function PublicProviderProfilePage({ params }: Props) {
  const { slug } = await params;

  const profile = await prisma.providerProfile.findUnique({
    where: { slug },
    select: {
      businessName: true,
      description: true,
      phone: true,
      email: true,
      city: true,
      state: true,
      isPublished: true,
      services: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, description: true, basePrice: true },
      },
    },
  });

  if (!profile || !profile.isPublished) {
    notFound();
  }

  const location = [profile.city, profile.state].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Hero */}
      <section className="relative grain overflow-hidden border-b border-paper-soft bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Prestador de serviço
          </p>
          <h1 className="mt-3 font-fraunces text-5xl font-bold leading-tight text-ink md:text-6xl">
            {profile.businessName}
          </h1>
          {location ? (
            <p className="mt-3 text-sm font-medium text-ink-muted">
              {location}
            </p>
          ) : null}
          {profile.description ? (
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink-muted">
              {profile.description}
            </p>
          ) : null}

          {/* Contatos */}
          {profile.phone || profile.email ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {profile.phone && (
                <span className="inline-flex items-center gap-2 rounded-full border border-paper-soft bg-paper px-4 py-2 text-sm font-medium text-ink">
                  {profile.phone}
                </span>
              )}
              {profile.email && (
                <span className="inline-flex items-center gap-2 rounded-full border border-paper-soft bg-paper px-4 py-2 text-sm font-medium text-ink">
                  {profile.email}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* Serviços */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="font-fraunces text-3xl font-bold text-ink">Serviços</h2>

        {profile.services.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {profile.services.map((service) => (
              <article
                key={service.id}
                className="rounded-xl border border-paper-soft bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
              >
                <h3 className="font-fraunces text-xl font-bold text-ink">
                  {service.name}
                </h3>
                {service.description ? (
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    {service.description}
                  </p>
                ) : null}
                {service.basePrice ? (
                  <p className="mt-3 text-sm font-semibold text-leaf">
                    A partir de {formatMoney(service.basePrice)}
                  </p>
                ) : null}
                <Link
                  className="mt-4 inline-flex min-h-9 items-center justify-center rounded-md border border-leaf px-4 text-xs font-semibold text-leaf transition hover:bg-mint"
                  href={`/u/${slug}/orcamento?serviceId=${service.id}`}
                >
                  Pedir orçamento
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
            <p className="text-sm text-ink-muted">
              Este prestador ainda não possui serviços ativos publicados.
            </p>
          </div>
        )}
      </section>

      {/* CTA fixo mobile */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-paper-soft bg-white/90 px-6 py-4 backdrop-blur-sm md:hidden">
        <Link
          className="flex min-h-11 items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-leaf-hover"
          href={`/u/${slug}/orcamento`}
        >
          Pedir orçamento
        </Link>
      </div>

      {/* CTA desktop */}
      <div className="mx-auto hidden max-w-4xl px-6 pb-16 md:block">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover"
          href={`/u/${slug}/orcamento`}
        >
          Pedir orçamento
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Commit**

```bash
git add "app/u/[slug]/page.tsx"
git commit -m "feat: redesign public provider profile page"
```

---

## Task 14: Formulário público de orçamento redesign

**Files:**

- Modify: `app/u/[slug]/orcamento/page.tsx`

- [ ] **Substituir `app/u/[slug]/orcamento/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteRequestForm } from "@/components/quote-request/QuoteRequestForm";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    error?: string;
    serviceId?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Revise os dados do pedido.",
  service: "O serviço selecionado não está disponível.",
  unavailable: "Este perfil não está disponível para pedidos.",
};

export default async function PublicQuoteRequestPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const profile = await prisma.providerProfile.findUnique({
    where: { slug },
    select: {
      businessName: true,
      isPublished: true,
      services: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!profile || !profile.isPublished) {
    notFound();
  }

  const selectedServiceId = profile.services.some(
    (s) => s.id === query.serviceId,
  )
    ? query.serviceId
    : null;

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <div className="mx-auto max-w-lg">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-leaf"
          href={`/u/${slug}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Voltar ao perfil
        </Link>

        <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-leaf">
          Pedido de orçamento
        </p>
        <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
          {profile.businessName}
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Envie as informações iniciais para que o prestador avalie seu pedido.
        </p>

        {query.success ? (
          <div className="mt-8 rounded-xl border border-mint bg-mint/30 p-6">
            <h2 className="font-fraunces text-xl font-bold text-leaf">
              Solicitação enviada!
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Sua solicitação foi registrada. O prestador irá avaliar as informações
              e retornar pelo contato informado.
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
            {query.error ? (
              <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessages[query.error] ??
                  "Não foi possível enviar o pedido."}
              </p>
            ) : null}
            <QuoteRequestForm
              selectedServiceId={selectedServiceId}
              services={profile.services}
              slug={slug}
            />
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Commit**

```bash
git add "app/u/[slug]/orcamento/page.tsx"
git commit -m "feat: redesign public quote request page"
```

---

## Task 15: Proposta pública redesign

**Files:**

- Modify: `app/proposta/[publicToken]/page.tsx`

- [ ] **Substituir `app/proposta/[publicToken]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { respondToProposal } from "@/lib/actions/proposal-response";
import { Badge, proposalStatusToBadge } from "@/components/ui/Badge";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ publicToken: string }>;
  searchParams: Promise<{ error?: string; response?: string }>;
};

function formatMoney(value: { toString: () => string }) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value.toString()));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

const responseMessages: Record<string, string> = {
  approved: "Proposta aprovada com sucesso.",
  rejected: "Proposta recusada.",
};

const errorMessages: Record<string, string> = {
  answered: "Esta proposta já foi respondida.",
  expired: "Esta proposta está expirada e não pode mais ser respondida.",
  "not-found": "Proposta não encontrada.",
};

export default async function PublicProposalPage({
  params,
  searchParams,
}: Props) {
  const { publicToken } = await params;
  const query = await searchParams;

  const proposal = await prisma.proposal.findUnique({
    where: { publicToken },
    include: {
      provider: true,
      quoteRequest: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!proposal) {
    notFound();
  }

  const isExpired = proposal.validUntil
    ? proposal.validUntil < new Date()
    : false;
  const isAnswered =
    proposal.status === "APPROVED" || proposal.status === "REJECTED";
  const canRespond = !isAnswered && !isExpired;

  const providerLocation = [proposal.provider.city, proposal.provider.state]
    .filter(Boolean)
    .join(", ");

  const badgeStatus = isExpired
    ? "expired"
    : proposalStatusToBadge(proposal.status);

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <div className="mx-auto max-w-3xl">
        {/* Cabeçalho do documento */}
        <div className="rounded-xl border border-paper-soft bg-white p-8 shadow-card">
          <div className="flex flex-col gap-4 border-b border-paper-soft pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
                Proposta comercial
              </p>
              <h1 className="mt-2 font-fraunces text-4xl font-bold text-ink">
                {proposal.title}
              </h1>
              {proposal.description ? (
                <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
                  {proposal.description}
                </p>
              ) : null}
            </div>
            <Badge status={badgeStatus} />
          </div>

          {/* Alertas */}
          {isExpired && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Esta proposta passou da data de validade.
            </div>
          )}
          {query.response && (
            <div className="mt-5 rounded-lg border border-mint bg-mint/40 px-4 py-3 text-sm font-semibold text-leaf">
              {responseMessages[query.response] ?? "Resposta registrada."}
            </div>
          )}
          {query.error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessages[query.error] ?? "Não foi possível responder."}
            </div>
          )}

          {/* Partes */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Prestador
              </p>
              <p className="mt-2 font-fraunces text-lg font-bold text-ink">
                {proposal.provider.businessName}
              </p>
              {proposal.provider.email && (
                <p className="mt-1 text-sm text-ink-muted">
                  {proposal.provider.email}
                </p>
              )}
              {proposal.provider.phone && (
                <p className="mt-1 text-sm text-ink-muted">
                  {proposal.provider.phone}
                </p>
              )}
              {providerLocation && (
                <p className="mt-1 text-sm text-ink-muted">
                  {providerLocation}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Cliente
              </p>
              <p className="mt-2 font-fraunces text-lg font-bold text-ink">
                {proposal.quoteRequest.customerName}
              </p>
              {proposal.quoteRequest.customerEmail && (
                <p className="mt-1 text-sm text-ink-muted">
                  {proposal.quoteRequest.customerEmail}
                </p>
              )}
              {proposal.quoteRequest.customerPhone && (
                <p className="mt-1 text-sm text-ink-muted">
                  {proposal.quoteRequest.customerPhone}
                </p>
              )}
            </div>
          </div>

          {/* Itens */}
          <div className="mt-8">
            <h2 className="font-fraunces text-xl font-bold text-ink">Itens</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-paper-soft">
              <table className="w-full text-sm">
                <thead className="bg-paper-soft">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Qtd.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Unitário
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item, i) => (
                    <tr
                      key={item.id}
                      className={i % 2 === 0 ? "bg-white" : "bg-paper"}
                    >
                      <td className="px-4 py-3 text-ink">{item.description}</td>
                      <td className="px-4 py-3 text-right text-ink-muted">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-ink-muted">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink">
                        {formatMoney(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totais */}
          <div className="mt-6 flex flex-col items-end gap-2">
            <div className="flex items-center gap-6">
              <p className="text-sm text-ink-muted">
                Validade:{" "}
                <span className="font-medium text-ink">
                  {proposal.validUntil
                    ? formatDate(proposal.validUntil)
                    : "Sem data"}
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-leaf px-6 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                Total
              </p>
              <p className="font-fraunces text-3xl font-bold text-white">
                {formatMoney(proposal.totalAmount)}
              </p>
            </div>
          </div>

          {/* Resposta */}
          {isAnswered ? (
            <div className="mt-8 rounded-lg border border-paper-soft bg-paper p-5">
              <p className="text-sm font-semibold text-ink">
                Esta proposta já foi respondida.
              </p>
              {proposal.respondedAt && (
                <p className="mt-1 text-sm text-ink-muted">
                  Respondida em {formatDate(proposal.respondedAt)}.
                </p>
              )}
            </div>
          ) : !canRespond ? (
            <div className="mt-8 rounded-lg border border-paper-soft bg-paper p-5">
              <p className="text-sm font-semibold text-ink">
                Esta proposta não pode mais ser respondida porque está expirada.
              </p>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-3 border-t border-paper-soft pt-6 sm:flex-row">
              <form
                action={async () => {
                  "use server";
                  await respondToProposal(publicToken, "APPROVED");
                }}
              >
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover sm:w-auto"
                >
                  Aprovar proposta
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await respondToProposal(publicToken, "REJECTED");
                }}
              >
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-paper-soft bg-white px-6 text-sm font-semibold text-ink transition hover:border-leaf hover:text-leaf sm:w-auto"
                >
                  Recusar proposta
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Commit**

```bash
git add "app/proposta/[publicToken]/page.tsx"
git commit -m "feat: redesign public proposal page with document layout"
```

---

## Task 16: Build final e verificação

- [ ] **Rodar lint completo**

```bash
npm run lint
```

Esperado: sem erros

- [ ] **Rodar build de produção**

```bash
npm run build
```

Esperado: build sem erros, todas as páginas compiladas

- [ ] **Verificar schema Prisma (não alteramos, mas confirmamos)**

```bash
npx prisma validate
```

Esperado: `The schema at prisma/schema.prisma is valid`

- [ ] **Commit final**

```bash
git add -A
git commit -m "feat: complete Tropical Paper design system implementation"
```

---

## Resumo dos arquivos

| Arquivo                                      | Ação                                   |
| -------------------------------------------- | -------------------------------------- |
| `tailwind.config.ts`                         | Modificar — tokens de cor e fonte      |
| `app/globals.css`                            | Modificar — variáveis CSS, grain, base |
| `app/layout.tsx`                             | Modificar — fontes next/font           |
| `components/ui/Button.tsx`                   | Criar                                  |
| `components/ui/Card.tsx`                     | Criar                                  |
| `components/ui/Badge.tsx`                    | Criar                                  |
| `components/ui/AnimatedCounter.tsx`          | Criar                                  |
| `components/layout/Sidebar.tsx`              | Criar                                  |
| `components/layout/SiteHeader.tsx`           | Modificar                              |
| `components/layout/SiteFooter.tsx`           | Modificar                              |
| `app/(dashboard)/layout.tsx`                 | Criar                                  |
| `components/landing/LandingHero.tsx`         | Criar                                  |
| `components/landing/LandingSteps.tsx`        | Criar                                  |
| `app/page.tsx`                               | Modificar                              |
| `app/(auth)/login/page.tsx`                  | Modificar                              |
| `app/(dashboard)/dashboard/page.tsx`         | Modificar                              |
| `app/(dashboard)/dashboard/pedidos/page.tsx` | Modificar                              |
| `app/u/[slug]/page.tsx`                      | Modificar                              |
| `app/u/[slug]/orcamento/page.tsx`            | Modificar                              |
| `app/proposta/[publicToken]/page.tsx`        | Modificar                              |
