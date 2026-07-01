"use client";

import { useState } from "react";

import { markPublicLinkUsed } from "@/components/onboarding/onboarding-storage";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";

type PublicLinkCardProps = {
  message: string;
  storageScope: string;
  url: string;
};

export function PublicLinkCard({
  message,
  storageScope,
  url
}: PublicLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const href = url.startsWith("http") ? new URL(url).pathname : url;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    markPublicLinkUsed(storageScope);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpen() {
    markPublicLinkUsed(storageScope);
  }

  return (
    <section className="mt-8 rounded-xl border border-paper-soft bg-white p-6 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
            Seu link público
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Compartilhe com clientes para receber pedidos.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            onClick={handleCopy}
            type="button"
          >
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <a
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-white px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
            href={href}
            onClick={handleOpen}
            rel="noopener noreferrer"
            target="_blank"
          >
            Abrir
          </a>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-paper-soft bg-paper px-4 py-3">
        <p className="truncate text-sm font-medium text-ink">{url}</p>
      </div>

      <div className="mt-4 border-t border-paper-soft pt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
          Mensagens prontas para WhatsApp
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Copie o texto abaixo e cole no WhatsApp para divulgar seu link de
          pedido.
        </p>
        <div className="mt-2">
          <WhatsAppButton label="Compartilhar link da vitrine" message={message} />
        </div>
      </div>
    </section>
  );
}
