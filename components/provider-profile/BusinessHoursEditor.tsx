"use client";

import { useState } from "react";

import {
  DAY_LABELS,
  parseBusinessHours,
  WEEK_DISPLAY_ORDER,
  type DayHours,
} from "@/lib/business-hours";
const EMPTY_WEEK: DayHours[] = [null, null, null, null, null, null, null];
const DEFAULT_DAY: NonNullable<DayHours> = { open: "08:00", close: "18:00" };

type BusinessHoursEditorProps = {
  // Aceita o Json vindo do banco (profile.businessHours) ou a string JSON
  // reenviada após erro de validação (values.businessHours).
  defaultValue: unknown;
};

function lenientDay(entry: unknown): DayHours {
  if (entry === null || typeof entry !== "object") return null;
  const { open, close } = entry as { open?: unknown; close?: unknown };
  if (typeof open !== "string" || typeof close !== "string") return null;
  // Mantém o que o usuário digitou, mesmo inválido — a validação é do servidor.
  return { open, close };
}

function parseDefault(value: unknown): DayHours[] {
  if (typeof value === "string") {
    if (!value) return [...EMPTY_WEEK];
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length === 7) {
        return parsed.map(lenientDay);
      }
      return [...EMPTY_WEEK];
    } catch {
      return [...EMPTY_WEEK];
    }
  }
  return parseBusinessHours(value) ?? [...EMPTY_WEEK];
}

export function BusinessHoursEditor({ defaultValue }: BusinessHoursEditorProps) {
  const [days, setDays] = useState<DayHours[]>(() => parseDefault(defaultValue));

  const hasAnyDay = days.some((day) => day !== null);

  const setDay = (index: number, value: DayHours) => {
    setDays((prev) => prev.map((day, i) => (i === index ? value : day)));
  };

  const copyMondayToWeekdays = () => {
    setDays((prev) => {
      const monday = prev[1];
      return prev.map((day, i) =>
        i >= 2 && i <= 5 ? (monday ? { ...monday } : null) : day
      );
    });
  };

  return (
    <div className="grid gap-3 rounded-xl border border-paper-soft bg-paper p-5">
      <input name="businessHours" type="hidden" value={hasAnyDay ? JSON.stringify(days) : ""} />

      {WEEK_DISPLAY_ORDER.map((index) => {
        const day = days[index];
        return (
          <div className="flex flex-wrap items-center gap-3" key={index}>
            <span className="w-10 text-sm font-semibold text-ink">
              {DAY_LABELS[index]}
            </span>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
              <input
                aria-label={`${DAY_LABELS[index]} aberto`}
                checked={day !== null}
                onChange={(e) =>
                  setDay(index, e.target.checked ? { ...DEFAULT_DAY } : null)
                }
                type="checkbox"
              />
              Aberto
            </label>
            {day ? (
              <>
                <input
                  aria-label={`Abertura de ${DAY_LABELS[index]}`}
                  className="min-h-9 rounded-lg border border-paper-soft bg-white px-2 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                  onChange={(e) => setDay(index, { ...day, open: e.target.value })}
                  type="time"
                  value={day.open}
                />
                <span className="text-xs text-ink-muted">até</span>
                <input
                  aria-label={`Fechamento de ${DAY_LABELS[index]}`}
                  className="min-h-9 rounded-lg border border-paper-soft bg-white px-2 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                  onChange={(e) => setDay(index, { ...day, close: e.target.value })}
                  type="time"
                  value={day.close}
                />
              </>
            ) : (
              <span className="text-xs text-ink-muted">Fechado</span>
            )}
          </div>
        );
      })}

      <button
        className="mt-1 w-fit text-xs font-semibold text-leaf transition hover:underline"
        onClick={copyMondayToWeekdays}
        type="button"
      >
        Copiar segunda para ter–sex
      </button>

      <p className="text-xs text-ink-muted">
        Para fechar depois da meia-noite (ex.: 18:00 até 02:00), informe o
        horário de fechar menor que o de abrir.
      </p>
    </div>
  );
}
