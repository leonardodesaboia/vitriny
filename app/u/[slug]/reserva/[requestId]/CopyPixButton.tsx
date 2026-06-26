"use client";

import { useState } from "react";

export function CopyPixButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md border border-paper-soft bg-paper px-4 text-xs font-semibold text-ink transition hover:border-leaf hover:text-leaf"
      type="button"
      onClick={handleCopy}
    >
      {copied ? "Copiado!" : "Copiar código"}
    </button>
  );
}
