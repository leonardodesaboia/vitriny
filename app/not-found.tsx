import Link from "next/link";

import { privateMetadata } from "@/lib/seo/metadata";

export const metadata = privateMetadata("Página não encontrada");

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 font-jakarta text-ink">
      <div className="w-full max-w-md rounded-2xl border border-paper-soft bg-white p-8 text-center shadow-card">
        <p className="font-fraunces text-lg font-semibold text-leaf">Vitriny</p>
        <p className="mt-6 font-fraunces text-5xl font-bold text-ink">404</p>
        <h1 className="mt-3 font-fraunces text-2xl font-bold text-ink">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          O link pode estar quebrado ou a página foi movida. Verifique o endereço
          ou volte para o início.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
          href="/"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
