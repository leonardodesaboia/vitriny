"use client";

import { useState } from "react";

interface WhatsAppButtonProps {
  label: string;
  message: string;
  waUrl?: string;
}

export function WhatsAppButton({ label, message, waUrl }: WhatsAppButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex min-h-8 items-center justify-center rounded-md border border-paper-soft px-3 text-xs font-semibold text-ink-muted transition hover:border-leaf hover:text-leaf"
          >
            {copied ? "Copiado!" : "Copiar texto"}
          </button>
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-8 items-center justify-center rounded-md bg-leaf px-3 text-xs font-semibold text-white transition hover:bg-leaf-hover"
            >
              Abrir no WhatsApp ↗
            </a>
          ) : null}
        </div>
      </div>
      <p className="mt-2 whitespace-pre-line rounded-md border border-paper-soft bg-paper px-3 py-2 text-xs leading-relaxed text-ink-muted">
        {message}
      </p>
    </div>
  );
}
