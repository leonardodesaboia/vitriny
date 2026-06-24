"use client";

import { useState } from "react";

const formatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function centsToDisplay(cents: string): string {
  if (!cents) return "";
  return formatter.format(parseInt(cents, 10) / 100);
}

function centsToDecimal(cents: string): string {
  if (!cents) return "";
  return (parseInt(cents, 10) / 100).toFixed(2);
}

function defaultValueToCents(value: string): string {
  if (!value) return "";
  const num = parseFloat(value.replace(",", "."));
  if (!isFinite(num) || num === 0) return "";
  return String(Math.round(num * 100));
}

export function useCurrencyInput(defaultValue = "") {
  const [cents, setCents] = useState(() => defaultValueToCents(defaultValue));

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      setCents((prev) => (prev + e.key).replace(/^0+/, "") || "0");
    } else if (e.key === "Backspace") {
      e.preventDefault();
      setCents((prev) => prev.slice(0, -1));
    } else if (e.key === "Delete") {
      e.preventDefault();
      setCents("");
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").replace(/^0+/, "");
    if (digits) setCents(digits);
  }

  return {
    submitValue: centsToDecimal(cents),
    inputProps: {
      value: centsToDisplay(cents),
      readOnly: true,
      onKeyDown: handleKeyDown,
      onPaste: handlePaste,
      inputMode: "numeric" as const,
      placeholder: "0,00"
    }
  };
}
