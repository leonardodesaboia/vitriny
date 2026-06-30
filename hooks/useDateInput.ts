"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";

import { brDateDigitsToISO } from "@/lib/utils/date";

function formatDisplay(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
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
    submitValue: brDateDigitsToISO(digits),
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
