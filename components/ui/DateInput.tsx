"use client";

import { useDateInput } from "@/hooks/useDateInput";

type DateInputProps = {
  name: string;
  id?: string;
  defaultValue?: string | null;
  className?: string;
  required?: boolean;
};

export function DateInput({ name, id, defaultValue, className, required }: DateInputProps) {
  const { inputProps, submitValue } = useDateInput(defaultValue ?? "");

  return (
    <>
      <input name={name} required={required} type="hidden" value={submitValue} />
      <input {...inputProps} className={className} id={id} type="text" />
    </>
  );
}
