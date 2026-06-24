"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";

import { formatPhoneBR } from "@/lib/utils/phone";

export function usePhoneInput(defaultValue = "") {
  const [digits, setDigits] = useState(() =>
    defaultValue.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11)
  );

  function updateFromText(value: string) {
    setDigits(value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11));
  }

  const displayValue = formatPhoneBR(digits);

  return {
    submitValue: displayValue,
    inputProps: {
      value: displayValue,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        updateFromText(event.target.value);
      },
      inputMode: "tel" as const,
      autoComplete: "tel",
      placeholder: "(11) 99999-9999"
    }
  };
}
