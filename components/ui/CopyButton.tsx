"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = "Copiar", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={
        className ??
        "inline-flex min-h-8 items-center justify-center rounded-md border border-paper-soft bg-white px-3 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
      }
    >
      {copied ? "Copiado!" : label}
    </button>
  );
}
