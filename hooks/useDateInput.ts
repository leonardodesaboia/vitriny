"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";

function formatDisplay(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function toISODate(digits: string): string {
  if (digits.length !== 8) return "";
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return "";
  return `${yyyy}-${mm}-${dd}`;
}

export function useDateInput(defaultValue = "") {
  const [digits, setDigits] = useState(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(defaultValue)) {
      const [yyyy, mm, dd] = defaultValue.split("-");
      return `${dd}${mm}${yyyy}`;
    }
    return defaultValue.replace(/\D/g, "").slice(0, 8);
  });

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setDigits(event.target.value.replace(/\D/g, "").slice(0, 8));
  }

  return {
    submitValue: toISODate(digits),
    inputProps: {
      value: formatDisplay(digits),
      onChange: handleChange,
      inputMode: "numeric" as const,
      autoComplete: "off",
      placeholder: "DD/MM/AAAA",
      maxLength: 10
    }
  };
}
