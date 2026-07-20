"use client";

import { useSyncExternalStore } from "react";

import {
  getTodayLabel,
  isOpenAt,
  parseBusinessHours,
} from "@/lib/business-hours";

const emptySubscribe = () => () => {};

// Gate de hidratação: false no servidor, true no cliente. Snapshots booleanos
// são estáveis para Object.is, ao contrário de retornar `new Date()` aqui.
function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function OpenNowBadge({ businessHours }: { businessHours: unknown }) {
  const isClient = useIsClient();

  const hours = parseBusinessHours(businessHours);
  if (!isClient || !hours) return null;

  const now = new Date();
  const open = isOpenAt(hours, now);
  const label = getTodayLabel(hours, now);

  return (
    <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
      <span
        className={`h-2 w-2 rounded-full ${open ? "bg-emerald-400" : "bg-red-400"}`}
      />
      {open ? "Aberto agora" : "Fechado"}
      {label ? <span className="font-normal text-white/70">· {label}</span> : null}
    </span>
  );
}
