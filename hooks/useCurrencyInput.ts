"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";

const MAX_CENTS_DIGITS = 12;

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

  // Input controlado via onChange: os dígitos do valor exibido SÃO os
  // centavos, então basta extraí-los a cada mudança. Diferente do esquema
  // anterior (readOnly + onKeyDown), funciona com teclados virtuais no
  // celular, autofill e colagem.
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value
      .replace(/\D/g, "")
      .replace(/^0+/, "")
      .slice(0, MAX_CENTS_DIGITS);
    setCents(digits);
  }

  return {
    submitValue: centsToDecimal(cents),
    inputProps: {
      value: centsToDisplay(cents),
      onChange: handleChange,
      inputMode: "numeric" as const,
      autoComplete: "off",
      placeholder: "0,00"
    }
  };
}
