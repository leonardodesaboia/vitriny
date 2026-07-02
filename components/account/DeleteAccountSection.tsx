"use client";

import { useState, useTransition } from "react";

import { deleteAccount } from "@/lib/actions/account";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result && "error" in result) {
        setError(result.error);
        setOpen(false);
      }
    });
  }

  return (
    <section className="mt-10 rounded-xl border border-red-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
        Zona de perigo
      </p>
      <h2 className="mt-2 font-fraunces text-xl font-bold text-ink">
        Excluir conta
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
        Sua vitrine sai do ar, a assinatura é cancelada e seus dados pessoais
        são removidos. O e-mail e o endereço da vitrine ficam livres para novos
        cadastros. Esta ação não pode ser desfeita.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <button
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        disabled={isPending}
        onClick={() => setOpen(true)}
        type="button"
      >
        {isPending ? "Excluindo conta..." : "Excluir minha conta"}
      </button>

      <ConfirmModal
        open={open}
        eyebrow="Excluir conta"
        title="Excluir sua conta definitivamente?"
        description={
          <div className="grid gap-2">
            <p>Ao confirmar:</p>
            <ul className="list-disc pl-5">
              <li>Sua vitrine pública sai do ar imediatamente.</li>
              <li>A assinatura PRO (se houver) é cancelada.</li>
              <li>
                Seus dados pessoais (e-mail, senha, telefone e chave Pix) são
                removidos.
              </li>
              <li>Você é desconectado e não poderá mais entrar nesta conta.</li>
            </ul>
            <p>Esta ação não pode ser desfeita.</p>
          </div>
        }
        confirmLabel="Excluir conta"
        cancelLabel="Manter conta"
        pending={isPending}
        pendingLabel="Excluindo..."
        variant="danger"
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </section>
  );
}
