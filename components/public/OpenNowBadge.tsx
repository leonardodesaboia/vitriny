"use client";

import { useSyncExternalStore } from "react";

import {
  getTodayLabel,
  isOpenAt,
  parseBusinessHours,
} from "@/lib/business-hours";

function useClientNow(): Date | null {
  return useSyncExternalStore(
    () => () => {},
    () => new Date(),
    () => null,
  );
}

export function OpenNowBadge({ businessHours }: { businessHours: unknown }) {
  const now = useClientNow();

  const hours = parseBusinessHours(businessHours);
  if (!now || !hours) return null;

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
