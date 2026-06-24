"use client";

import { useCurrencyInput } from "@/hooks/useCurrencyInput";

type CurrencyInputProps = {
  name: string;
  id?: string;
  defaultValue?: string;
  className?: string;
  required?: boolean;
};

export function CurrencyInput({ name, id, defaultValue, className, required }: CurrencyInputProps) {
  const { inputProps, submitValue } = useCurrencyInput(defaultValue);

  return (
    <>
      <input name={name} required={required} type="hidden" value={submitValue} />
      <input {...inputProps} className={className} id={id} type="text" />
    </>
  );
}
