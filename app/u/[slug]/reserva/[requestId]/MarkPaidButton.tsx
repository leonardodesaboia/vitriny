"use client";

import { useFormStatus } from "react-dom";

export function MarkPaidButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-9 items-center justify-center rounded-md border border-leaf bg-white px-4 text-xs font-semibold text-leaf transition hover:bg-mint disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Enviando..." : "Já fiz o pagamento"}
    </button>
  );
}
