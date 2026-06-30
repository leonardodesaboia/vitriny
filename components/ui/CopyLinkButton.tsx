"use client";

import { useState } from "react";

interface CopyLinkButtonProps {
  url: string;
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md bg-leaf px-4 text-xs font-semibold text-white transition hover:bg-leaf-hover"
    >
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}
