"use client";

import { useEffect } from "react";

import { useCurrencyInput } from "@/hooks/useCurrencyInput";

type CurrencyInputProps = {
  name: string;
  id?: string;
  defaultValue?: string;
  className?: string;
  required?: boolean;
  onValueChange?: (decimalValue: string) => void;
};

export function CurrencyInput({ name, id, defaultValue, className, required, onValueChange }: CurrencyInputProps) {
  const { inputProps, submitValue } = useCurrencyInput(defaultValue);

  useEffect(() => {
    onValueChange?.(submitValue);
  }, [submitValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <input name={name} required={required} type="hidden" value={submitValue} />
      <input {...inputProps} className={className} id={id} type="text" />
    </>
  );
}
