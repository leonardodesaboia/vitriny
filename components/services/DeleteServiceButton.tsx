"use client";

import { useState, useTransition } from "react";

import { deleteService } from "@/lib/actions/services";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export function DeleteServiceButton({ serviceId, serviceName }: { serviceId: string; serviceName: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? "Excluindo..." : "Excluir"}
      </button>

      <ConfirmModal
        open={open}
        title={`Excluir "${serviceName}"`}
        description="O serviço será removido permanentemente. Pedidos já recebidos não serão afetados."
        eyebrow="Serviços"
        confirmLabel="Excluir serviço"
        variant="danger"
        pending={isPending}
        pendingLabel="Excluindo..."
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          const formData = new FormData();
          formData.set("serviceId", serviceId);
          startTransition(() => deleteService(formData));
        }}
      />
    </>
  );
}
