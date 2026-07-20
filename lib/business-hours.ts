// Horário de funcionamento do negócio. Array fixo de 7 posições,
// índice 0 = domingo (compatível com Date.getDay()); null = fechado.
// close < open significa fechamento após a meia-noite (ex.: 18:00–02:00).

export type DayHours = { open: string; close: string } | null;

export type BusinessHours = DayHours[];

export const DAY_LABELS = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function parseBusinessHours(value: unknown): BusinessHours | null {
  if (!Array.isArray(value) || value.length !== 7) return null;

  const days: BusinessHours = [];
  for (const entry of value) {
    if (entry === null) {
      days.push(null);
      continue;
    }
    if (typeof entry !== "object") return null;
    const { open, close } = entry as { open?: unknown; close?: unknown };
    if (typeof open !== "string" || typeof close !== "string") return null;
    if (!TIME_REGEX.test(open) || !TIME_REGEX.test(close)) return null;
    if (open === close) return null;
    days.push({ open, close });
  }

  return days.some((day) => day !== null) ? days : null;
}

export function isOpenAt(hours: BusinessHours, date: Date): boolean {
  const day = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();

  const today = hours[day];
  if (today) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (close > open) {
      if (minutes >= open && minutes < close) return true;
    } else if (minutes >= open) {
      return true;
    }
  }

  const yesterday = hours[(day + 6) % 7];
  if (yesterday) {
    const open = toMinutes(yesterday.open);
    const close = toMinutes(yesterday.close);
    if (close < open && minutes < close) return true;
  }

  return false;
}

export function getTodayLabel(hours: BusinessHours, date: Date): string {
  const day = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();
  const today = hours[day];

  if (isOpenAt(hours, date)) {
    if (today && minutes >= toMinutes(today.open)) {
      return `fecha às ${today.close}`;
    }
    const yesterday = hours[(day + 6) % 7];
    if (yesterday) return `fecha às ${yesterday.close}`;
    return "";
  }

  if (today && minutes < toMinutes(today.open)) {
    return `abre às ${today.open}`;
  }

  return "fechado hoje";
}

export function formatWeek(
  hours: BusinessHours
): { day: string; label: string }[] {
  return WEEK_DISPLAY_ORDER.map((index) => {
    const entry = hours[index];
    return {
      day: DAY_LABELS[index],
      label: entry ? `${entry.open}–${entry.close}` : "Fechado",
    };
  });
}
