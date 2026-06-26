"use client";

import { useTransition } from "react";

import { deleteService } from "@/lib/actions/services";

export function DeleteServiceButton({ serviceId }: { serviceId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Tem certeza que deseja excluir este serviço? Pedidos vinculados não serão afetados.")) return;
    const formData = new FormData();
    formData.set("serviceId", serviceId);
    startTransition(() => deleteService(formData));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "Excluindo..." : "Excluir"}
    </button>
  );
}
