"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro de página não tratado.", {
      message: error.message,
      digest: error.digest
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 font-jakarta text-ink">
      <div className="w-full max-w-md rounded-2xl border border-paper-soft bg-white p-8 text-center shadow-card">
        <p className="font-fraunces text-lg font-semibold text-leaf">Vitriny</p>
        <h1 className="mt-6 font-fraunces text-2xl font-bold text-ink">
          Algo deu errado
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Tivemos um problema ao carregar esta página. Tente novamente em
          instantes — se continuar, volte para o início.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
          >
            Tentar novamente
          </button>
          <Link
            className="text-sm font-semibold text-leaf hover:text-leaf-hover"
            href="/"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
